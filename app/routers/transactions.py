from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.categorizer import categorize
from app.database import get_db
from app.models import Transaction, User
from app.schemas.transactions import CategoryUpdate, TransactionCreate

router = APIRouter(prefix="/transactions", tags=["transactions"])

# Common column-name spellings seen in real bank statement exports, so the
# importer isn't limited to the exact header names this project happens to
# use internally.
_DATE_COLUMNS = ["date", "transaction date", "value date", "txn date"]
_DESCRIPTION_COLUMNS = ["description", "narration", "details", "particulars", "remarks"]
_AMOUNT_COLUMNS = ["amount"]
_DEBIT_COLUMNS = ["debit", "withdrawal amt.", "withdrawal amt", "debit amount"]
_CREDIT_COLUMNS = ["credit", "deposit amt.", "deposit amt", "credit amount"]


def _find_column(columns, candidates):
    lookup = {str(c).strip().lower(): c for c in columns}
    for candidate in candidates:
        if candidate in lookup:
            return lookup[candidate]
    return None


@router.get("")
def get_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )


@router.post("")
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_transaction = Transaction(**transaction.dict(), user_id=current_user.id)
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction


@router.patch("/{transaction_id}")
def update_category(
    transaction_id: int,
    update: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction.category = update.category
    db.commit()
    db.refresh(transaction)
    return transaction


@router.post("/import")
async def import_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import transactions from a bank-statement-style CSV. Supports either
    a single signed "amount" column, or separate "debit"/"credit" columns
    (the format most Indian bank exports use). Rows that exactly match an
    existing transaction (same date, description and amount) for this user
    are skipped so re-importing the same file is safe."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The uploaded file is empty")

    try:
        df = pd.read_csv(BytesIO(raw))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this file as CSV")

    if df.empty:
        raise HTTPException(status_code=400, detail="The CSV file has no rows")

    date_col = _find_column(df.columns, _DATE_COLUMNS)
    desc_col = _find_column(df.columns, _DESCRIPTION_COLUMNS)
    amount_col = _find_column(df.columns, _AMOUNT_COLUMNS)
    debit_col = _find_column(df.columns, _DEBIT_COLUMNS)
    credit_col = _find_column(df.columns, _CREDIT_COLUMNS)

    if not date_col or not desc_col:
        raise HTTPException(
            status_code=400,
            detail="CSV must include a date column and a description column",
        )
    if not amount_col and not (debit_col or credit_col):
        raise HTTPException(
            status_code=400,
            detail="CSV must include an amount column, or separate debit/credit columns",
        )

    existing_keys = {
        (t.date, t.description, round(t.amount, 2))
        for t in db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    }

    imported = 0
    skipped_duplicates = 0
    skipped_invalid = 0
    new_rows = []

    for _, row in df.iterrows():
        try:
            # dayfirst=True: Indian bank statements write dates as DD/MM/YYYY,
            # which pandas would otherwise silently misread as MM/DD/YYYY for
            # any day-of-month <= 12 (e.g. "02/01/2026" -> Jan 2, not Feb 1).
            # This has no effect on unambiguous formats like ISO "YYYY-MM-DD".
            date_val = pd.to_datetime(row[date_col], dayfirst=True).strftime("%Y-%m-%d")
        except Exception:
            skipped_invalid += 1
            continue

        description = str(row[desc_col]).strip()
        if not description or description.lower() == "nan":
            skipped_invalid += 1
            continue

        if amount_col:
            try:
                amount = float(row[amount_col])
            except (TypeError, ValueError):
                skipped_invalid += 1
                continue
        else:
            debit = pd.to_numeric(row.get(debit_col), errors="coerce") if debit_col else None
            credit = pd.to_numeric(row.get(credit_col), errors="coerce") if credit_col else None
            debit = 0.0 if debit is None or pd.isna(debit) else float(debit)
            credit = 0.0 if credit is None or pd.isna(credit) else float(credit)
            if debit == 0 and credit == 0:
                skipped_invalid += 1
                continue
            amount = credit - debit

        key = (date_val, description, round(amount, 2))
        if key in existing_keys:
            skipped_duplicates += 1
            continue

        existing_keys.add(key)
        new_rows.append(
            Transaction(
                date=date_val,
                description=description,
                amount=amount,
                category=categorize(description),
                user_id=current_user.id,
            )
        )
        imported += 1

    if new_rows:
        db.add_all(new_rows)
        db.commit()

    return {
        "total_rows": int(len(df)),
        "imported": imported,
        "skipped_duplicates": skipped_duplicates,
        "skipped_invalid": skipped_invalid,
    }

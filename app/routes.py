from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Transaction
from app.schemas import CategoryUpdate, TransactionCreate

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def read_root():
    return {"message": "Expense Tracker API is running"}

@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).all()
    return transactions

@router.patch("/transactions/{transaction_id}")
def update_category(transaction_id: int, update: CategoryUpdate, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    transaction.category = update.category
    db.commit()
    db.refresh(transaction)
    return transaction

@router.post("/transactions")
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    new_transaction = Transaction(
        date=transaction.date,
        description=transaction.description,
        amount=transaction.amount,
        category=transaction.category
    )
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@router.get("/summary/category")
def get_category_summary(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.category != "Income").all()
    summary = {}
    for t in transactions:
        summary[t.category] = summary.get(t.category, 0) + abs(t.amount)
    return summary

@router.get("/summary/overview")
def get_overview(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).all()
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
    balance = total_income - total_expenses
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(balance, 2)
    }
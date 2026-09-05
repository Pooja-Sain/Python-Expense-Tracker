from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.analytics import compute_analytics
from app.auth import get_current_user
from app.database import get_db
from app.models import Transaction, User

router = APIRouter(prefix="/summary", tags=["summary"])


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transactions = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(total_income - total_expenses, 2)
    }


@router.get("/category")
def get_category_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id, Transaction.category != "Income")
        .all()
    )
    summary = {}
    for t in transactions:
        summary[t.category] = summary.get(t.category, 0) + abs(t.amount)
    return summary


@router.get("/analytics")
def get_analytics(current_user: User = Depends(get_current_user)):
    return compute_analytics(current_user.id)

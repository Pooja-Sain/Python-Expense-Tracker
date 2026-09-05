from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Transaction
from app.analytics import compute_analytics

router = APIRouter(prefix="/summary", tags=["summary"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).all()
    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "balance": round(total_income - total_expenses, 2)
    }

@router.get("/category")
def get_category_summary(db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.category != "Income").all()
    summary = {}
    for t in transactions:
        summary[t.category] = summary.get(t.category, 0) + abs(t.amount)
    return summary

@router.get("/analytics")
def get_analytics():
    return compute_analytics()
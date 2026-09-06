from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.analytics import compute_budget_status
from app.auth import get_current_user
from app.database import get_db
from app.models import Budget, User
from app.schemas.budgets import BudgetUpdate

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("")
def get_budgets(current_user: User = Depends(get_current_user)):
    return compute_budget_status(current_user.id)


@router.put("/{category}")
def set_budget(
    category: str,
    update: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Creates or updates the monthly limit for one category (upsert), so the
    Dashboard's budget form can always PUT regardless of whether a limit was
    already set for that category."""
    if update.monthly_limit <= 0:
        raise HTTPException(status_code=400, detail="Budget limit must be greater than zero")

    budget = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.category == category)
        .first()
    )
    if budget:
        budget.monthly_limit = update.monthly_limit
    else:
        budget = Budget(user_id=current_user.id, category=category, monthly_limit=update.monthly_limit)
        db.add(budget)

    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{category}")
def delete_budget(
    category: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = (
        db.query(Budget)
        .filter(Budget.user_id == current_user.id, Budget.category == category)
        .first()
    )
    if not budget:
        raise HTTPException(status_code=404, detail="No budget set for this category")

    db.delete(budget)
    db.commit()
    return {"deleted": category}

from pydantic import BaseModel


class BudgetUpdate(BaseModel):
    monthly_limit: float

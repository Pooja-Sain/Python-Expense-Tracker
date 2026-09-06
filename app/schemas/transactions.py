from typing import Optional

from pydantic import BaseModel

class CategoryUpdate(BaseModel):
    category: str

class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    category: str

class TransactionUpdate(BaseModel):
    """All fields optional so PATCH can be used both for a quick category
    change (just {"category": ...}, as the Transactions table dropdown
    already sends) and for correcting a full entry (date/description/amount
    together). Only the fields actually present in the request body are
    applied -- see exclude_unset=True in the route handler."""
    date: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
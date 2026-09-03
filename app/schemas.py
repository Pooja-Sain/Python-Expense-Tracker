from pydantic import BaseModel

class CategoryUpdate(BaseModel):
    category: str

class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    category: str
from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="owner")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String)
    description = Column(String)
    amount = Column(Float)
    category = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    owner = relationship("User", back_populates="transactions")


class Budget(Base):
    """A monthly spending limit for one category, per user. Not defined for
    "Income" -- a budget caps spending, it doesn't make sense to cap what
    comes in."""
    __tablename__ = "budgets"
    __table_args__ = (UniqueConstraint("user_id", "category", name="uq_budget_user_category"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    monthly_limit = Column(Float, nullable=False)

    owner = relationship("User")

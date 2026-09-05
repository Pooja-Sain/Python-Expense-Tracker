import pandas as pd
from app.database import engine

EMPTY_ANALYTICS = {
    "monthly_trend": {},
    "top_category": None,
    "top_category_amount": 0,
    "biggest_expense": None,
}


def compute_analytics(user_id: int):
    df = pd.read_sql(
        "SELECT * FROM transactions WHERE user_id = :user_id",
        engine,
        params={"user_id": user_id},
    )
    if df.empty:
        return EMPTY_ANALYTICS

    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.strftime("%Y-%m")
    expenses_df = df[df["amount"] < 0].copy()
    expenses_df["amount"] = expenses_df["amount"].abs()

    if expenses_df.empty:
        return EMPTY_ANALYTICS

    monthly_trend = expenses_df.groupby("month")["amount"].sum().round(2).to_dict()
    top_category = expenses_df.groupby("category")["amount"].sum().idxmax()
    top_category_amount = round(expenses_df.groupby("category")["amount"].sum().max(), 2)
    biggest_row = expenses_df.loc[expenses_df["amount"].idxmax()]

    return {
        "monthly_trend": monthly_trend,
        "top_category": top_category,
        "top_category_amount": top_category_amount,
        "biggest_expense": {
            "description": biggest_row["description"],
            "amount": round(biggest_row["amount"], 2),
            "date": biggest_row["date"].strftime("%Y-%m-%d")
        }
    }

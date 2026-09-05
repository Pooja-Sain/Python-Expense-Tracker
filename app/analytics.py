from datetime import datetime, timezone

import pandas as pd
from app.database import engine

EMPTY_ANALYTICS = {
    "monthly_trend": {},
    "monthly_income": {},
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
    income_df = df[df["amount"] > 0]

    # monthly_income is reported even when there's no expense history yet
    # (e.g. a new user who's only logged their salary so far), so this no
    # longer bails out to EMPTY_ANALYTICS just because expenses_df is empty.
    monthly_income = income_df.groupby("month")["amount"].sum().round(2).to_dict()

    if expenses_df.empty:
        return {**EMPTY_ANALYTICS, "monthly_income": monthly_income}

    monthly_trend = expenses_df.groupby("month")["amount"].sum().round(2).to_dict()
    top_category = expenses_df.groupby("category")["amount"].sum().idxmax()
    top_category_amount = round(expenses_df.groupby("category")["amount"].sum().max(), 2)
    biggest_row = expenses_df.loc[expenses_df["amount"].idxmax()]

    return {
        "monthly_trend": monthly_trend,
        "monthly_income": monthly_income,
        "top_category": top_category,
        "top_category_amount": top_category_amount,
        "biggest_expense": {
            "description": biggest_row["description"],
            "amount": round(biggest_row["amount"], 2),
            "date": biggest_row["date"].strftime("%Y-%m-%d")
        }
    }


def _compute_monthly_summary_from_df(df: pd.DataFrame, month: str) -> dict:
    """Pure logic split out for testing: given all of a user's transactions
    and a "YYYY-MM" string, returns that month's income, expenses and
    balance. Used to show "this month" figures on the Dashboard alongside
    the all-time totals, so monthly expenses can be checked against what
    was actually earned that month rather than lifetime income."""
    if not df.empty:
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        month_df = df[df["date"].dt.strftime("%Y-%m") == month]
    else:
        month_df = df

    income = float(month_df.loc[month_df["amount"] > 0, "amount"].sum()) if not month_df.empty else 0.0
    expenses = float(month_df.loc[month_df["amount"] < 0, "amount"].abs().sum()) if not month_df.empty else 0.0

    return {
        "month": month,
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "balance": round(income - expenses, 2),
    }


def compute_monthly_summary(user_id: int) -> dict:
    """This calendar month's income/expenses/balance for a user (UTC 'today'
    decides which month), independent of the all-time totals in
    /summary/overview."""
    df = pd.read_sql(
        "SELECT * FROM transactions WHERE user_id = :user_id",
        engine,
        params={"user_id": user_id},
    )
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    return _compute_monthly_summary_from_df(df, current_month)


# A gap of ~28-31 days is a calendar month; real statements rarely land on
# the exact same day-of-month every time (weekends, billing cycles shifting
# a day or two), so treat anything in this range as "monthly-ish".
_MIN_RECURRING_GAP_DAYS = 20
_MAX_RECURRING_GAP_DAYS = 40
_MIN_OCCURRENCES = 2


def _detect_recurring_from_df(df: pd.DataFrame) -> list:
    """Pure logic over an already-loaded dataframe of expense rows (amount <
    0), split out from detect_recurring_payments so it can be unit tested
    without a real database. Groups by normalized description + amount
    (rounded to the nearest rupee, so a paisa-level rounding difference
    between charges doesn't stop them being recognized as the same
    subscription), then flags a group as recurring if it has at least two
    charges spaced roughly a month apart."""
    if df.empty:
        return []

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["description_norm"] = df["description"].astype(str).str.strip().str.upper()
    df["amount_abs"] = df["amount"].abs()
    df["amount_key"] = df["amount_abs"].round(0)

    results = []
    for (_, _), group in df.groupby(["description_norm", "amount_key"]):
        if len(group) < _MIN_OCCURRENCES:
            continue

        group = group.sort_values("date")
        dates = group["date"].tolist()
        gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        avg_gap = sum(gaps) / len(gaps)

        if not (_MIN_RECURRING_GAP_DAYS <= avg_gap <= _MAX_RECURRING_GAP_DAYS):
            continue

        last_row = group.iloc[-1]
        next_expected = last_row["date"] + pd.Timedelta(days=round(avg_gap))

        results.append({
            "description": last_row["description"],
            "amount": round(float(last_row["amount_abs"]), 2),
            "occurrences": len(group),
            "average_interval_days": round(avg_gap),
            "last_date": last_row["date"].strftime("%Y-%m-%d"),
            "next_expected_date": next_expected.strftime("%Y-%m-%d"),
        })

    results.sort(key=lambda r: r["amount"], reverse=True)
    return results


def detect_recurring_payments(user_id: int) -> list:
    """Finds recurring charges for a user by looking at *all* of their
    expenses (not just ones already tagged "Subscriptions"), so a gym
    membership filed under Health & Fitness or a rent payment under Bills &
    Utilities still gets picked up. Also predicts the next expected charge
    date for each one."""
    df = pd.read_sql(
        "SELECT * FROM transactions WHERE user_id = :user_id AND amount < 0",
        engine,
        params={"user_id": user_id},
    )
    return _detect_recurring_from_df(df)

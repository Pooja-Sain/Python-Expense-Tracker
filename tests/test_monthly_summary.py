import pandas as pd

from app.analytics import EMPTY_ANALYTICS, _compute_monthly_summary_from_df, compute_analytics


def _rows(*entries):
    """entries: list of (date, description, amount, category)"""
    return pd.DataFrame(
        [
            {"date": d, "description": desc, "amount": amt, "category": cat}
            for d, desc, amt, cat in entries
        ]
    )


def test_monthly_summary_only_counts_the_given_month():
    df = _rows(
        ("2026-09-01", "SALARY", 60000.0, "Income"),
        ("2026-09-05", "RENT", -20000.0, "Bills & Utilities"),
        ("2026-08-01", "SALARY", 60000.0, "Income"),  # different month
        ("2026-09-10", "GROCERY", -3000.0, "Food & Groceries"),
    )
    summary = _compute_monthly_summary_from_df(df, "2026-09")
    assert summary == {"month": "2026-09", "income": 60000.0, "expenses": 23000.0, "balance": 37000.0}


def test_monthly_summary_for_month_with_no_data():
    df = _rows(("2026-09-01", "SALARY", 60000.0, "Income"))
    summary = _compute_monthly_summary_from_df(df, "2026-12")
    assert summary == {"month": "2026-12", "income": 0.0, "expenses": 0.0, "balance": 0.0}


def test_monthly_summary_with_empty_dataframe():
    summary = _compute_monthly_summary_from_df(pd.DataFrame(), "2026-09")
    assert summary == {"month": "2026-09", "income": 0.0, "expenses": 0.0, "balance": 0.0}


def test_compute_analytics_reports_monthly_income_alongside_expenses(monkeypatch):
    df = _rows(
        ("2026-05-10", "SALARY", 55000.0, "Income"),
        ("2026-05-05", "NETFLIX", -499.0, "Subscriptions"),
        ("2026-06-10", "SALARY", 55000.0, "Income"),
        ("2026-06-05", "NETFLIX", -499.0, "Subscriptions"),
    )
    monkeypatch.setattr("app.analytics.pd.read_sql", lambda *a, **k: df.copy())

    result = compute_analytics(user_id=1)
    assert result["monthly_income"] == {"2026-05": 55000.0, "2026-06": 55000.0}
    assert result["monthly_trend"] == {"2026-05": 499.0, "2026-06": 499.0}


def test_compute_analytics_reports_income_even_with_no_expenses(monkeypatch):
    # A new user who's only logged a salary so far shouldn't see their
    # income silently disappear just because they have no expenses yet.
    df = _rows(("2026-05-10", "SALARY", 55000.0, "Income"))
    monkeypatch.setattr("app.analytics.pd.read_sql", lambda *a, **k: df.copy())

    result = compute_analytics(user_id=1)
    assert result["monthly_income"] == {"2026-05": 55000.0}
    assert result["monthly_trend"] == {}
    assert result["top_category"] is None


def test_compute_analytics_with_no_transactions_at_all(monkeypatch):
    monkeypatch.setattr("app.analytics.pd.read_sql", lambda *a, **k: pd.DataFrame())
    assert compute_analytics(user_id=1) == EMPTY_ANALYTICS

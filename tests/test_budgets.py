import pandas as pd

from app.analytics import _build_budget_status, _compute_category_spend_from_df


def test_under_budget():
    result = _build_budget_status(
        budgets={"Food & Groceries": 5000.0},
        spend_by_category={"Food & Groceries": 3200.0},
    )
    assert result == [
        {
            "category": "Food & Groceries",
            "monthly_limit": 5000.0,
            "spent": 3200.0,
            "remaining": 1800.0,
            "percentage": 64.0,
        }
    ]


def test_over_budget():
    result = _build_budget_status(
        budgets={"Subscriptions": 1000.0},
        spend_by_category={"Subscriptions": 1499.0},
    )
    assert result[0]["percentage"] == 149.9
    assert result[0]["remaining"] == -499.0


def test_category_with_no_spending_yet_shows_zero_not_missing():
    # A budget set for a category with nothing logged this month should
    # still show up (at 0%), not be silently dropped.
    result = _build_budget_status(budgets={"Transport": 2000.0}, spend_by_category={})
    assert result == [
        {
            "category": "Transport",
            "monthly_limit": 2000.0,
            "spent": 0.0,
            "remaining": 2000.0,
            "percentage": 0.0,
        }
    ]


def test_only_categories_with_a_budget_are_returned():
    # Spending exists for a category with no budget set -- it must not
    # appear, since there's no limit to compare it against.
    result = _build_budget_status(
        budgets={"Food & Groceries": 5000.0},
        spend_by_category={"Food & Groceries": 1000.0, "Transport": 800.0},
    )
    assert len(result) == 1
    assert result[0]["category"] == "Food & Groceries"


def test_sorted_by_percentage_used_descending():
    result = _build_budget_status(
        budgets={"A": 1000.0, "B": 1000.0, "C": 1000.0},
        spend_by_category={"A": 200.0, "B": 950.0, "C": 500.0},
    )
    assert [r["category"] for r in result] == ["B", "C", "A"]


def test_compute_category_spend_only_counts_this_month_expenses():
    df = pd.DataFrame([
        {"date": "2026-09-05", "description": "RENT", "amount": -18000.0, "category": "Bills & Utilities"},
        {"date": "2026-09-06", "description": "GROCERY", "amount": -1200.0, "category": "Food & Groceries"},
        {"date": "2026-08-20", "description": "GROCERY", "amount": -900.0, "category": "Food & Groceries"},  # last month
        {"date": "2026-09-01", "description": "SALARY", "amount": 60000.0, "category": "Income"},  # income, not spend
    ])
    result = _compute_category_spend_from_df(df, "2026-09")
    assert result == {"Bills & Utilities": 18000.0, "Food & Groceries": 1200.0}


def test_compute_category_spend_empty_dataframe():
    assert _compute_category_spend_from_df(pd.DataFrame(), "2026-09") == {}

import pandas as pd

from app.analytics import _detect_recurring_from_df


def _rows(*entries):
    """entries: list of (date, description, amount)"""
    return pd.DataFrame(
        [{"date": d, "description": desc, "amount": amt} for d, desc, amt in entries]
    )


def test_monthly_charge_is_detected_as_recurring():
    df = _rows(
        ("2026-01-05", "NETFLIX SUBSCRIPTION", -499.0),
        ("2026-02-04", "NETFLIX SUBSCRIPTION", -499.0),
        ("2026-03-06", "NETFLIX SUBSCRIPTION", -499.0),
    )
    result = _detect_recurring_from_df(df)
    assert len(result) == 1
    assert result[0]["description"] == "NETFLIX SUBSCRIPTION"
    assert result[0]["occurrences"] == 3
    assert result[0]["amount"] == 499.0
    assert result[0]["last_date"] == "2026-03-06"
    assert result[0]["next_expected_date"] == "2026-04-05"


def test_recurring_detection_is_not_limited_to_subscriptions_category():
    # Real-world recurring payments (rent, gym, EMIs) often live under other
    # categories -- detection should key off repetition, not the category.
    df = _rows(
        ("2026-01-10", "FITLIFE GYM", -1200.0),
        ("2026-02-09", "FITLIFE GYM", -1200.0),
    )
    result = _detect_recurring_from_df(df)
    assert len(result) == 1
    assert result[0]["description"] == "FITLIFE GYM"


def test_single_charge_is_not_recurring():
    df = _rows(("2026-01-05", "AMAZON ELECTRONICS", -15000.0))
    assert _detect_recurring_from_df(df) == []


def test_short_gap_repeats_are_not_flagged_monthly():
    # Two coffee purchases five days apart shouldn't be mistaken for a
    # monthly subscription.
    df = _rows(
        ("2026-02-01", "COFFEE SHOP", -150.0),
        ("2026-02-06", "COFFEE SHOP", -150.0),
    )
    assert _detect_recurring_from_df(df) == []


def test_empty_dataframe_returns_empty_list():
    assert _detect_recurring_from_df(pd.DataFrame()) == []


def test_different_amounts_are_not_grouped_together():
    df = _rows(
        ("2026-01-05", "NETFLIX SUBSCRIPTION", -499.0),
        ("2026-02-04", "NETFLIX SUBSCRIPTION", -999.0),  # price change / different plan
    )
    # Neither group has 2+ occurrences at the same amount, so nothing recurs.
    assert _detect_recurring_from_df(df) == []

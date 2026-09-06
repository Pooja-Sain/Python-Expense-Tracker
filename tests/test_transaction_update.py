from app.schemas.transactions import TransactionUpdate


def test_partial_update_excludes_untouched_fields():
    # The category dropdown on the Transactions table only ever sends
    # {"category": ...} -- date/description/amount must NOT show up in
    # exclude_unset=True output, or the PATCH endpoint would overwrite them
    # with null instead of leaving them alone.
    update = TransactionUpdate(category="Food & Groceries")
    assert update.dict(exclude_unset=True) == {"category": "Food & Groceries"}


def test_full_correction_includes_every_field():
    # The Edit modal sends all four fields together when fixing a
    # wrongly-entered transaction.
    update = TransactionUpdate(
        date="2026-09-01",
        description="Corrected description",
        amount=-450.0,
        category="Transport",
    )
    assert update.dict(exclude_unset=True) == {
        "date": "2026-09-01",
        "description": "Corrected description",
        "amount": -450.0,
        "category": "Transport",
    }


def test_empty_body_updates_nothing():
    update = TransactionUpdate()
    assert update.dict(exclude_unset=True) == {}


def test_amount_must_be_numeric():
    from pydantic import ValidationError

    try:
        TransactionUpdate(amount="not-a-number")
        assert False, "expected a ValidationError for a non-numeric amount"
    except ValidationError:
        pass

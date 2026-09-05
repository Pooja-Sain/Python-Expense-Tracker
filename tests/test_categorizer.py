from app.categorizer import categorize


def test_subscriptions():
    assert categorize("NETFLIX SUBSCRIPTION") == "Subscriptions"
    assert categorize("Spotify Premium") == "Subscriptions"


def test_food_and_groceries():
    assert categorize("WALMART SUPERCENTER") == "Food & Groceries"
    assert categorize("local grocery store") == "Food & Groceries"
    assert categorize("Blue Bottle Coffee") == "Food & Groceries"


def test_transport():
    assert categorize("UBER TRIP") == "Transport"
    assert categorize("Shell Gas Station") == "Transport"


def test_health_and_fitness():
    assert categorize("FITLIFE GYM") == "Health & Fitness"
    assert categorize("City Gym Membership") == "Health & Fitness"


def test_income():
    assert categorize("PAYCHECK - EMPLOYER") == "Income"


def test_bills_and_utilities():
    assert categorize("ELECTRIC COMPANY") == "Bills & Utilities"
    assert categorize("PGE Bill") == "Bills & Utilities"


def test_unrecognized_description_falls_back_to_other():
    assert categorize("Some Random Store") == "Other"


def test_categorize_is_case_insensitive():
    assert categorize("netflix") == categorize("NETFLIX") == categorize("NetFlix")

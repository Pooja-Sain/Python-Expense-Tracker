import pandas as pd

df = pd.read_csv("transactions.csv")

def categorize(description):
    description = description.upper()
    if "NETFLIX" in description or "SPOTIFY" in description:
        return "Subscriptions"
    elif "COFFEE" in description or "WALMART" in description or "GROCERY" in description:
        return "Food & Groceries"
    elif "UBER" in description or "SHELL" in description:
        return "Transport"
    elif "GYM" in description or "FITLIFE" in description:
        return "Health and Fitness"
    elif "PAYCHECK" in description:
        return "Income"
    elif "ELECTRIC" in description or "PGE" in description:
        return "Bills & Utilities"
    else:
        return "Other"


df["category"] = df["description"].apply(categorize)

print(df)


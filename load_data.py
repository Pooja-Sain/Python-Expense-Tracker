import pandas as pd
from app.database import SessionLocal, engine, Base
from app.models import Transaction
from app.categorizer import categorize

Base.metadata.create_all(bind=engine)

df = pd.read_csv("transactions.csv")
df["category"] = df["description"].apply(categorize)

db = SessionLocal()

for _, row in df.iterrows():
    transaction = Transaction(
        date=row["date"],
        description=row["description"],
        amount=row["amount"],
        category=row["category"]
    )
    db.add(transaction)

db.commit()
db.close()

print("Data loaded into database successfully!")
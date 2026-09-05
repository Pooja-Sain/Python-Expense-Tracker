from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text
from starlette.middleware.sessions import SessionMiddleware

from app.database import Base, engine
from app.routers import auth, summary, transactions

# Make sure every table (including the new "users" table) exists. This
# project doesn't use a migration tool like Alembic, so it's handled here
# with plain SQLAlchemy + a small manual migration below for the one column
# added to an already-existing table.
Base.metadata.create_all(bind=engine)

inspector = inspect(engine)
if "transactions" in inspector.get_table_names():
    existing_columns = [col["name"] for col in inspector.get_columns("transactions")]
    if "user_id" not in existing_columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN user_id INTEGER"))
            conn.commit()

app = FastAPI()

# NOTE: this secret key is fine for local development only. If this app is
# ever deployed for real, move it to an environment variable and use a long
# random value instead.
app.add_middleware(SessionMiddleware, secret_key="dev-secret-change-me")

app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(summary.router)


@app.get("/")
def serve_landing():
    return FileResponse("static/landing.html")


@app.get("/dashboard")
def serve_dashboard():
    return FileResponse("static/index.html")


@app.get("/login")
def serve_login():
    return FileResponse("static/login.html")


@app.get("/signup")
def serve_signup():
    return FileResponse("static/signup.html")

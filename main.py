import os

from fastapi import FastAPI, Request
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

# Falls back to a fixed dev value so local `uvicorn main:app --reload` still
# works with zero setup. In production (see DEPLOYMENT.md), set the
# SESSION_SECRET_KEY environment variable to a long random value instead --
# anyone who knows this key can forge session cookies.
app.add_middleware(
    SessionMiddleware,
    secret_key=os.environ.get("SESSION_SECRET_KEY", "dev-secret-change-me"),
)

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.middleware("http")
async def no_cache_for_static(request: Request, call_next):
    """Without this, browsers apply their own heuristic caching to
    /static/*.js and .css files (FastAPI's StaticFiles sends no
    Cache-Control header by default) and can silently keep serving an old
    cached copy of a script for a long time after it changes on disk --
    e.g. a page still using a stale api.js after a new export was added to
    it, throwing "module does not provide an export" and breaking every
    script on that page. "no-cache" forces the browser to always revalidate
    with the server first (a fast round-trip using the file's ETag), so a
    real change is picked up on the very next load instead of being
    invisible until a manual hard-refresh."""
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache"
    return response


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

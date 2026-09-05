from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.routers import transactions, summary

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(transactions.router)
app.include_router(summary.router)


@app.get("/")
def serve_dashboard():
    return FileResponse("static/index.html")
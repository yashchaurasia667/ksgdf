from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services import http_client
from routers import forecasts, actuals, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    await http_client.startup()
    yield
    await http_client.shutdown()

origins = ["http://localhost:3000/"]
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET"]
)

app.include_router(forecasts.router)
app.include_router(actuals.router)
app.include_router(analytics.router)


@app.get("/ping")
async def ping():
    return {"message": "pong"}

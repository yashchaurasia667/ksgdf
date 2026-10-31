from fastapi import APIRouter
from datetime import datetime

from services import elexon

router = APIRouter(prefix="/actuals", tags=["datasets"])


@router.get("/")
async def get_actuals(date_from: datetime, date_to: datetime, fuel_type: str):
    data = await elexon.get_actuals(date_from, date_to, fuel_type)
    return {"data": data}

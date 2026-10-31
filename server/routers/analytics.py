from fastapi import APIRouter
from datetime import datetime, time
from services import analytics, elexon

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/")
async def get_errors(date_from: datetime, date_to: datetime, cutoff: time = elexon.CUTOFF_TIME):
    data = await analytics.get_error_metrics(date_from, date_to, cutoff)
    return {"data": data} 

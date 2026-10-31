from fastapi import APIRouter
from datetime import datetime, time, timedelta

from services import elexon

router = APIRouter(prefix="/forecasts", tags=["datasets"])


@router.get("/range")
async def get_range_forecasts(date_from: datetime, date_to: datetime):
    data = await elexon.get_forecasts(date_from, date_to)
    return {"data": data}


@router.get("/latest")
async def get_latest_forecasts(cutoff_time: time = elexon.CUTOFF_TIME):
    now = datetime.now()
    cutoff_dt = datetime.combine(now.date(), cutoff_time)

    data = await elexon.get_forecasts(date_from=now-timedelta(days=1), date_to=now+timedelta(days=2))

    filtered = [
        item for item in data
        if datetime.fromisoformat(item["publishTime"].replace("Z", "")) <= cutoff_dt
    ]

    return {"data": filtered}

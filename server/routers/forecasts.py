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
    i = 0
    for i in range(len(data)):
        if not datetime.fromisoformat(data[i]["publishTime"].replace("Z", "")) <= cutoff_dt:
            break

    return {"data": data[:i+1]}

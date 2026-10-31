from datetime import datetime, time
from services import http_client, cache

API_BASE: str = "https://data.elexon.co.uk/bmrs/api/v1"
CUTOFF_TIME = time(11, 0)


async def get_forecasts(date_from: datetime, date_to: datetime):
    print(f"from: {date_from}, to: {date_to}")
    key = f"forecasts:{date_from}:{date_to}"

    cached = cache.get(key)
    if cached is not None:
        print("found in cache")
        return cached

    url = f"{API_BASE}/datasets/WINDFOR/stream"
    res = await http_client.client.get(url, params={
        "publishDateTimeFrom": date_from.isoformat(),
        "publishDateTimeTo": date_to.isoformat()}
    )
    res.raise_for_status()
    data = res.json()

    cache.set(key, data)
    return data


async def get_actuals(date_from: datetime, date_to: datetime, fuel_type: str = "WIND"):
    print(f"from: {date_from}, to: {date_to}, type: {fuel_type}")
    key = f"actuals:{date_from}:{date_to}:{fuel_type}"

    cached = cache.get(key)
    if cached is not None:
        return cached

    url = f"{API_BASE}/datasets/FUELHH/stream"
    res = await http_client.client.get(url, params={
        "publishDateTimeFrom": date_from.isoformat(),
        "publishDateTimeTo": date_to.isoformat(),
        "fuelType": fuel_type}
    )
    res.raise_for_status()
    data = res.json()

    cache.set(key, data)
    return data

from datetime import datetime, time
from services import elexon


async def get_error_metrics(
    date_from: datetime,
    date_to: datetime,
    cutoff_time: time
):
    actuals = await elexon.get_actuals(date_from, date_to)
    forecasts = await elexon.get_forecasts(date_from, date_to)

    errors = []

    for actual in actuals:
        cutoff_dt = datetime(
            int(actual["startTime"][:4]),
            int(actual["startTime"][5:7]),
            int(actual["startTime"][8:10]),
            cutoff_time.hour,
            cutoff_time.minute
        )

        matching = [
            f for f in forecasts
            if f["startTime"] == actual["startTime"]
            and datetime.fromisoformat(f["publishTime"].replace("Z", "")) < cutoff_dt
        ]

        if not matching:
            continue

        # pick latest forecast before cutoff
        latest = max(matching, key=lambda f: f["publishTime"])

        error = latest["generation"] - actual["generation"]
        errors.append(error)

    if not errors:
        return {"mae": None, "rmse": None, "bias": None}

    mae = sum(abs(e) for e in errors) / len(errors)
    rmse = (sum(e ** 2 for e in errors) / len(errors)) ** 0.5
    bias = sum(errors) / len(errors)

    return {"mae": mae, "rmse": rmse, "bias": bias}

from datetime import datetime, time, timedelta
from collections import defaultdict
from services import elexon


async def get_error_metrics(
    date_from: datetime,
    date_to: datetime,
    cutoff_time: time
):
    actuals_from = date_from + timedelta(days=1)
    actuals_to = date_to + timedelta(days=1)

    actuals = await elexon.get_actuals(actuals_from, actuals_to)
    forecasts = await elexon.get_forecasts(date_from, actuals_to)

    forecasts_by_start: dict[str, list] = defaultdict(list)
    for f in forecasts:
        forecasts_by_start[f["startTime"]].append(f)

    errors = []

    for actual in actuals:
        start_time_str = actual["startTime"]

        start_dt = datetime.fromisoformat(start_time_str.replace("Z", ""))
        decision_day = start_dt.date() - timedelta(days=1)
        cutoff_dt = datetime(
            decision_day.year,
            decision_day.month,
            decision_day.day,
            cutoff_time.hour,
            cutoff_time.minute,
        )

        matching = [
            f for f in forecasts_by_start.get(start_time_str, [])
            if datetime.fromisoformat(f["publishTime"].replace("Z", "")) < cutoff_dt
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

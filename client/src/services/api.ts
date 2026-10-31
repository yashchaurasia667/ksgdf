import type {
  ForecastItem,
  ActualItem,
  ErrorMetrics,
  DeliverySlot,
  ProcurementSummaryStats,
} from '../types';

// In local dev with Vite proxy or in Vercel production rewrites, '/api' is preferred.
// If VITE_API_URL is explicitly set to http://localhost:8000, we attempt direct calls
// but gracefully fall back to '/api' if the browser blocks direct CORS requests.
const ENV_API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
export const API_BASE = ENV_API_URL ? `${ENV_API_URL}/api` : '/api';

/**
 * Executes a fetch with timeout, automatic fallback between direct URL and proxy,
 * and descriptive error handling.
 */
async function fetchWithFallback<T>(endpointPath: string, options?: RequestInit): Promise<T> {
  const primaryUrl = `${API_BASE}${endpointPath}`;
  const proxyUrl = `/api${endpointPath}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(primaryUrl, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    return (json.data !== undefined ? json.data : json) as T;
  } catch (err) {
    // If primary direct call failed (e.g. CORS or network error) and we have a proxy path available
    if (primaryUrl !== proxyUrl) {
      try {
        const proxyRes = await fetch(proxyUrl, options);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          return (json.data !== undefined ? json.data : json) as T;
        }
      } catch {
        // Fall through to rethrow original error
      }
    }
    throw err;
  }
}

/**
 * Fetches raw wind forecasts from /api/forecasts/range
 * Note: The backend route is /api/forecasts/range (not /api/forecasts/)
 */
export async function getForecastsRange(
  dateFrom: string,
  dateTo: string
): Promise<ForecastItem[]> {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
  });
  return fetchWithFallback<ForecastItem[]>(`/forecasts/range?${params.toString()}`);
}

/**
 * Fetches outturn actuals from /api/actuals/
 * Note: The backend requires `fuel_type` as a required parameter (without default in router)
 */
export async function getActuals(
  dateFrom: string,
  dateTo: string,
  fuelType: string = 'WIND'
): Promise<ActualItem[]> {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    fuel_type: fuelType,
  });
  return fetchWithFallback<ActualItem[]>(`/actuals/?${params.toString()}`);
}

/**
 * Fetches error metrics (MAE, RMSE, Bias) from /api/analytics/
 * Note: Query parameter name is `cutoff` (e.g. 11:00:00)
 */
export async function getAnalytics(
  dateFrom: string,
  dateTo: string,
  cutoff: string = '11:00:00'
): Promise<ErrorMetrics> {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    cutoff: cutoff.length === 5 ? `${cutoff}:00` : cutoff,
  });
  return fetchWithFallback<ErrorMetrics>(`/analytics/?${params.toString()}`);
}

/**
 * Pings backend server at /ping to check health and CORS readiness
 */
export async function checkBackendPing(): Promise<{
  online: boolean;
  pingMs: number | null;
  corsBlocked: boolean;
  message: string;
}> {
  const pingUrl = ENV_API_URL ? `${ENV_API_URL}/ping` : '/ping';
  const start = performance.now();

  try {
    const res = await fetch(pingUrl, { method: 'GET' });
    const elapsed = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        pingMs: elapsed,
        corsBlocked: false,
        message: data.message || 'pong',
      };
    }
    return {
      online: false,
      pingMs: null,
      corsBlocked: false,
      message: `HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isCors = errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('network');
    return {
      online: false,
      pingMs: null,
      corsBlocked: isCors,
      message: isCors ? 'CORS or Connection Refused' : errMsg,
    };
  }
}

/**
 * Combines WINDFOR forecasts and FUELHH actuals into 48 discrete half-hourly settlement periods
 * Enforcing the Honesty Rule: Only forecasts published strictly before cutoff datetime are used.
 */
export function processDeliveryDaySlots(
  deliveryDateStr: string,
  decisionDateStr: string,
  cutoffTimeStr: string,
  forecasts: ForecastItem[],
  actuals: ActualItem[],
  mae: number | null
): DeliverySlot[] {
  const slots: DeliverySlot[] = [];
  const cutoffTimeNormalized = cutoffTimeStr.length === 5 ? `${cutoffTimeStr}:00` : cutoffTimeStr;
  const cutoffLimitMs = new Date(`${decisionDateStr}T${cutoffTimeNormalized}Z`).getTime();

  // Index actuals by startTime for O(1) lookup
  const actualsMap = new Map<string, number>();
  actuals.forEach((a) => {
    actualsMap.set(a.startTime, a.generation);
  });

  // Group forecasts by startTime
  const forecastsMap = new Map<string, ForecastItem[]>();
  forecasts.forEach((f) => {
    const list = forecastsMap.get(f.startTime) || [];
    list.push(f);
    forecastsMap.set(f.startTime, list);
  });

  for (let period = 1; period <= 48; period++) {
    const totalMinutes = (period - 1) * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    const startTime = `${deliveryDateStr}T${hourStr}:${minStr}:00Z`;
    const timeLabel = `${hourStr}:${minStr}`;

    const matchingForecasts = forecastsMap.get(startTime) || [];

    // Core Honesty Rule: Filter only forecasts published before or at the cutoff time on the decision day
    const validPreCutoff = matchingForecasts.filter((f) => {
      const pubMs = new Date(f.publishTime).getTime();
      return !isNaN(pubMs) && pubMs <= cutoffLimitMs;
    });

    let chosenForecast: ForecastItem | null = null;
    if (validPreCutoff.length > 0) {
      // Pick the latest available forecast published before cutoff
      chosenForecast = validPreCutoff.reduce((latest, item) =>
        new Date(item.publishTime).getTime() > new Date(latest.publishTime).getTime() ? item : latest
      );
    }

    const forecastMw = chosenForecast ? chosenForecast.generation : null;
    const forecastPublishTime = chosenForecast ? chosenForecast.publishTime : null;
    const actualMw = actualsMap.has(startTime) ? (actualsMap.get(startTime) ?? null) : null;

    const errorMw =
      forecastMw !== null && actualMw !== null ? forecastMw - actualMw : null;

    const effectiveMae = mae !== null && mae > 0 ? mae : 200;
    const maeBoundLower = forecastMw !== null ? Math.max(0, forecastMw - effectiveMae) : null;
    const maeBoundUpper = forecastMw !== null ? forecastMw + effectiveMae : null;

    slots.push({
      periodNumber: period,
      startTime,
      timeLabel,
      forecastMw,
      forecastPublishTime,
      actualMw,
      errorMw,
      maeBoundLower,
      maeBoundUpper,
    });
  }

  return slots;
}

/**
 * Computes high-level day-ahead procurement stats across the 48 delivery slots
 */
export function calculateProcurementStats(
  slots: DeliverySlot[],
  mae: number | null
): ProcurementSummaryStats {
  const validForecasts = slots.filter((s) => s.forecastMw !== null);
  const validActuals = slots.filter((s) => s.actualMw !== null);

  // Generation values are average MW over 30 minutes (0.5 hours) => MWh = MW * 0.5
  const totalForecastMwh = validForecasts.reduce((sum, s) => sum + (s.forecastMw || 0) * 0.5, 0);
  const totalActualMwh = validActuals.length
    ? validActuals.reduce((sum, s) => sum + (s.actualMw || 0) * 0.5, 0)
    : null;

  let peakForecastMw = 0;
  let peakPeriodLabel = '--:--';
  let minForecastMw = Infinity;
  let minPeriodLabel = '--:--';

  validForecasts.forEach((s) => {
    const mw = s.forecastMw || 0;
    if (mw > peakForecastMw) {
      peakForecastMw = mw;
      peakPeriodLabel = s.timeLabel;
    }
    if (mw < minForecastMw) {
      minForecastMw = mw;
      minPeriodLabel = s.timeLabel;
    }
  });

  if (minForecastMw === Infinity) minForecastMw = 0;

  const avgForecastMw = validForecasts.length
    ? Math.round(validForecasts.reduce((sum, s) => sum + (s.forecastMw || 0), 0) / validForecasts.length)
    : 0;

  // Recommended spinning/standby reserve margin to procure from non-renewables:
  // Safety margin proportional to forecast uncertainty (MAE)
  const recommendedReserveMw = Math.round((mae || 250) * 1.5);

  return {
    totalForecastGwh: Math.round((totalForecastMwh / 1000) * 10) / 10,
    totalActualGwh: totalActualMwh !== null ? Math.round((totalActualMwh / 1000) * 10) / 10 : null,
    peakForecastMw: Math.round(peakForecastMw),
    peakPeriodLabel,
    minForecastMw: Math.round(minForecastMw),
    minPeriodLabel,
    avgForecastMw,
    recommendedReserveMw,
  };
}

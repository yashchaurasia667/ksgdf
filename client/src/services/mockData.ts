import type { ForecastItem, ActualItem, ErrorMetrics } from '../types';

/**
 * Generates realistic synthetic UK wind generation data for demonstration,
 * testing, or when the Elexon API returns 429 (Rate Limit) or the backend is offline.
 */
export function generateMockJanuary2026Data(
  decisionDateStr: string,
  cutoffTimeStr: string,
  deliveryDateStr: string
): {
  forecasts: ForecastItem[];
  actuals: ActualItem[];
  analytics: ErrorMetrics;
} {
  const deliveryParts = deliveryDateStr.split('-').map(Number);
  const dayNum = deliveryParts[2] || 15;
  const monthNum = deliveryParts[1] || 1;

  // UK winter wind profile: baseline + weather system oscillations
  const baseMw = 6500 + Math.sin(dayNum * 0.45) * 3500;
  const volatility = 1200 + (dayNum % 7) * 200;

  const forecasts: ForecastItem[] = [];
  const actuals: ActualItem[] = [];

  const [cutoffHour, cutoffMinute] = cutoffTimeStr.split(':').map(Number);
  const cutoffLimitMs = new Date(
    `${decisionDateStr}T${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')}:00Z`
  ).getTime();

  // Generate 48 half-hourly settlement periods for the delivery day
  for (let period = 1; period <= 48; period++) {
    const totalMinutes = (period - 1) * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(minute).padStart(2, '0');
    const startTime = `${deliveryDateStr}T${hourStr}:${minStr}:00Z`;

    // Diurnal wind pattern curve across 24h
    const diurnal = Math.sin(((period - 8) / 48) * 2 * Math.PI) * 1800;
    const subWave = Math.cos(((period * 2) / 48) * 2 * Math.PI) * 600;
    const trueGeneration = Math.max(800, Math.round(baseMw + diurnal + subWave + (Math.sin(period) * 300)));

    // Actual generation (only for days that have occurred, e.g., in January 2026)
    // Add realistic meteorological divergence from forecast
    const noise = Math.sin(period * 1.7) * (volatility * 0.22) + Math.cos(period * 0.9) * 180;
    const actualGen = Math.max(600, Math.round(trueGeneration + noise));

    actuals.push({
      startTime,
      settlementDate: deliveryDateStr,
      settlementPeriod: period,
      fuelType: 'WIND',
      generation: actualGen,
    });

    // WINDFOR publishes multiple forecast updates (e.g., 03:30, 05:30, 08:30, 10:30, 12:30, 16:30, 19:30, 23:30)
    // We simulate forecasts published before and after cutoff to verify the honesty rule
    const publishTimes = [
      `${decisionDateStr}T05:30:00Z`,
      `${decisionDateStr}T08:30:00Z`,
      `${decisionDateStr}T10:30:00Z`,
      `${decisionDateStr}T13:30:00Z`, // after cutoff (11:00)
      `${decisionDateStr}T17:00:00Z`, // after cutoff
    ];

    publishTimes.forEach((pubTime, idx) => {
      // Forecasts improve closer to real-time
      const errorFactor = (5 - idx) * 90;
      const forecastGen = Math.max(
        700,
        Math.round(trueGeneration + (Math.sin(period + idx) * errorFactor))
      );

      forecasts.push({
        startTime,
        publishTime: pubTime,
        generation: forecastGen,
      });
    });
  }

  // Pre-calculate realistic error metrics based on January 2026 performance
  const errors: number[] = [];
  actuals.forEach((actual) => {
    const validForecasts = forecasts.filter((f) => {
      const pubMs = new Date(f.publishTime).getTime();
      return f.startTime === actual.startTime && pubMs <= cutoffLimitMs;
    });

    if (validForecasts.length > 0) {
      const latest = validForecasts.reduce((prev, curr) =>
        new Date(curr.publishTime).getTime() > new Date(prev.publishTime).getTime() ? curr : prev
      );
      errors.push(latest.generation - actual.generation);
    }
  });

  const mae = errors.length
    ? Math.round((errors.reduce((acc, e) => acc + Math.abs(e), 0) / errors.length) * 10) / 10
    : 245.5;

  const rmse = errors.length
    ? Math.round(Math.sqrt(errors.reduce((acc, e) => acc + e * e, 0) / errors.length) * 10) / 10
    : 312.8;

  const bias = errors.length
    ? Math.round((errors.reduce((acc, e) => acc + e, 0) / errors.length) * 10) / 10
    : 38.2;

  return {
    forecasts,
    actuals,
    analytics: { mae, rmse, bias },
  };
}

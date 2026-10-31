export interface ForecastItem {
  startTime: string;
  publishTime: string;
  generation: number;
}

export interface ActualItem {
  startTime: string;
  settlementDate?: string;
  settlementPeriod?: number;
  fuelType?: string;
  generation: number;
}

export interface ErrorMetrics {
  mae: number | null;
  rmse: number | null;
  bias: number | null;
}

export interface DeliverySlot {
  periodNumber: number; // 1 - 48
  startTime: string; // ISO timestamp
  timeLabel: string; // e.g., "12:00"
  forecastMw: number | null;
  forecastPublishTime: string | null;
  actualMw: number | null;
  errorMw: number | null; // Forecast - Actual
  maeBoundLower: number | null;
  maeBoundUpper: number | null;
}

export interface QueryFilters {
  decisionDate: string; // YYYY-MM-DD (e.g. 2026-01-15)
  cutoffTime: string; // HH:mm (e.g. 11:00)
  deliveryDate: string; // YYYY-MM-DD (next day after decisionDate)
}

export interface BackendStatus {
  online: boolean;
  pingMs: number | null;
  apiBaseUrl: string;
  lastChecked: string;
  elexonStreamStatus: 'online' | 'degraded' | 'offline';
  corsIssueDetected: boolean;
  errorMessage?: string;
}

export interface ProcurementSummaryStats {
  totalForecastGwh: number;
  totalActualGwh: number | null;
  peakForecastMw: number;
  peakPeriodLabel: string;
  minForecastMw: number;
  minPeriodLabel: string;
  avgForecastMw: number;
  recommendedReserveMw: number;
}

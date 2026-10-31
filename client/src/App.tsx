import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  QueryFilters,
  BackendStatus,
  ForecastItem,
  ActualItem,
  ErrorMetrics,
} from "./types";
import {
  API_BASE,
  getForecastsRange,
  getActuals,
  getAnalytics,
  checkBackendPing,
  processDeliveryDaySlots,
  calculateProcurementStats,
} from "./services/api";
import { Navbar } from "./components/Navbar";
import { ControlsBar } from "./components/ControlsBar";
import { ProcurementSummary } from "./components/ProcurementSummary";
import { ForecastChart } from "./components/ForecastChart";
import { MetricsPanel } from "./components/MetricsPanel";
import { DiagnosticsModal } from "./components/DiagnosticsModal";
import "./App.css";

export function App() {
  // Query filters state
  const [filters, setFilters] = useState<QueryFilters>(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    return {
      decisionDate: todayStr,
      cutoffTime: "11:00",
      deliveryDate: tomorrowStr,
    };
  });

  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);

  // Backend telemetry status
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    online: false,
    pingMs: null,
    apiBaseUrl: API_BASE,
    lastChecked: "--:--",
    elexonStreamStatus: "online",
    corsIssueDetected: false,
  });

  // Raw data states
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [actuals, setActuals] = useState<ActualItem[]>([]);
  const [metrics, setMetrics] = useState<ErrorMetrics>({
    mae: null,
    rmse: null,
    bias: null,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Probe backend health
  const probeBackend = useCallback(async () => {
    const res = await checkBackendPing();
    const nowStr = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setBackendStatus({
      online: res.online,
      pingMs: res.pingMs,
      apiBaseUrl: API_BASE,
      lastChecked: nowStr,
      elexonStreamStatus: res.online ? "online" : "offline",
      corsIssueDetected: res.corsBlocked,
      errorMessage: res.message,
    });
  }, []);

  useEffect(() => {
    probeBackend();
    const timer = setInterval(probeBackend, 30000); // 30s heartbeat keep-alive
    return () => clearInterval(timer);
  }, [probeBackend]);

  // Main data fetching orchestrator
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const dFrom = `${filters.decisionDate}T00:00:00Z`;
      const dTo = `${filters.deliveryDate}T23:59:59Z`;
      const actualFrom = `${filters.deliveryDate}T00:00:00Z`;
      const actualTo = `${filters.deliveryDate}T23:59:59Z`;
      // Use a rolling 30-day window for analytics to avoid fetching months of data
      const analyticsToDate = new Date(`${filters.decisionDate}T00:00:00Z`);
      const analyticsFromDate = new Date(analyticsToDate);
      analyticsFromDate.setUTCDate(analyticsFromDate.getUTCDate() - 30);
      const analyticsFrom = analyticsFromDate.toISOString().replace(".000Z", "Z");
      const analyticsTo = analyticsToDate.toISOString().replace(".000Z", "Z");

      const [fData, aData, mData] = await Promise.allSettled([
        getForecastsRange(dFrom, dTo),
        getActuals(actualFrom, actualTo, "WIND"),
        getAnalytics(analyticsFrom, analyticsTo, filters.cutoffTime),
      ]);

      setForecasts(fData.status === "fulfilled" ? fData.value : []);
      setActuals(aData.status === "fulfilled" ? aData.value : []);
      setMetrics(
        mData.status === "fulfilled"
          ? mData.value
          : { mae: null, rmse: null, bias: null },
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [filters.decisionDate, filters.cutoffTime, filters.deliveryDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Transform raw streams into 48 delivery slots enforcing honesty rule
  const deliverySlots = useMemo(() => {
    return processDeliveryDaySlots(
      filters.deliveryDate,
      filters.decisionDate,
      filters.cutoffTime,
      forecasts,
      actuals,
      metrics.mae,
    );
  }, [
    filters.deliveryDate,
    filters.decisionDate,
    filters.cutoffTime,
    forecasts,
    actuals,
    metrics.mae,
  ]);

  // Compute summary stats for day-ahead buying team
  const procurementStats = useMemo(() => {
    return calculateProcurementStats(deliverySlots, metrics.mae);
  }, [deliverySlots, metrics.mae]);

  const handleUpdateFilters = (newFilters: Partial<QueryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="app-chassis">
      {/* Top Navbar */}
      <Navbar
        backendStatus={backendStatus}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
      />

      <main className="dashboard-content">
        {/* Banner if fetch error occurred */}
        {fetchError && (
          <div className="chassis-notice-banner font-mono">
            <span className="notice-icon">ℹ</span>
            <span>{fetchError}</span>
            <button
              type="button"
              className="notice-action-btn"
              onClick={() => setIsDiagnosticsOpen(true)}
            >
              DIAGNOSTICS
            </button>
          </div>
        )}

        {/* Controls Bar */}
        <ControlsBar
          filters={filters}
          onChangeFilters={handleUpdateFilters}
          onRefresh={loadData}
          isFetching={isLoading}
        />

        {/* Day-Ahead Buying Team Procurement Directive */}
        <ProcurementSummary
          stats={procurementStats}
          deliveryDate={filters.deliveryDate}
        />

        {/* Delivery Day Forecast & Actuals Chart */}
        <ForecastChart
          slots={deliverySlots}
          mae={metrics.mae}
          deliveryDate={filters.deliveryDate}
          isLoading={isLoading}
        />

        {/* Error Metrics Panel */}
        <MetricsPanel
          metrics={metrics}
          decisionDate={filters.decisionDate}
          cutoffTime={filters.cutoffTime}
          isLoading={isLoading}
        />
      </main>

      {/* Industrial Chassis Footer */}
      <footer className="chassis-footer font-mono">
        <div className="footer-left">
          <span>GRIDBRICKS v1.0.0 // DAY-AHEAD WIND FORECAST DESK</span>
        </div>
        <div className="footer-center">
          <span>
            DATA PROVENANCE: ELEXON BMRS WINDFOR (FORECAST) + FUELHH (ACTUALS)
          </span>
        </div>
        <div className="footer-right">
          <button
            type="button"
            className="footer-link-btn"
            onClick={() => setIsDiagnosticsOpen(true)}
          >
            [SYSTEM DIAGNOSTICS]
          </button>
        </div>
      </footer>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        status={backendStatus}
        onRetest={probeBackend}
      />
    </div>
  );
}

export default App;

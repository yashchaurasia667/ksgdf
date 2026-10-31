import React from 'react';
import type { ErrorMetrics } from '../types';

interface MetricsPanelProps {
  metrics: ErrorMetrics;
  decisionDate: string;
  cutoffTime: string;
  isLoading: boolean;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  decisionDate,
  cutoffTime,
  isLoading,
}) => {
  const formatMw = (val: number | null): string => {
    if (val === null || isNaN(val)) return '—';
    return `${val.toFixed(1)} MW`;
  };

  const biasValue = metrics.bias;
  const isOverForecasting = biasValue !== null && biasValue > 10;
  const isUnderForecasting = biasValue !== null && biasValue < -10;

  return (
    <section className="metrics-panel-container">
      <div className="metrics-panel-header">
        <div className="metrics-title-group">
          <span className="metrics-badge font-mono">STATISTICAL INTEGRITY AUDIT</span>
          <h3 className="metrics-panel-title">DAY-AHEAD FORECAST ACCURACY BENCHMARKS</h3>
        </div>
        <div className="metrics-window-badge font-mono">
          <span>EVALUATION WINDOW: DAYS PRIOR TO {decisionDate} (CUTOFF: {cutoffTime})</span>
        </div>
      </div>

      <div className="metrics-cards-grid">
        {/* MAE Stat Card */}
        <div className="metric-card">
          <div className="metric-card-top font-mono">
            <span className="metric-acronym">MAE</span>
            <span className="metric-formula">Σ |F - A| / N</span>
          </div>

          <div className="metric-value-row">
            <span className="metric-value font-mono">
              {isLoading ? (
                <span className="metric-loading">CALCULATING...</span>
              ) : (
                formatMw(metrics.mae)
              )}
            </span>
            <span className="metric-unit font-mono">UNCERTAINTY</span>
          </div>

          <div className="metric-label-title">Mean Absolute Error</div>
          <p className="metric-desc">
            Direct measure of forecast uncertainty. Informs the day-ahead ±MAE reserve procurement
            band shown on the delivery day profile.
          </p>

          <div className="metric-footer font-mono">
            <span className="footer-tag">BAND APPLIED: ±{metrics.mae ? Math.round(metrics.mae) : 0} MW</span>
          </div>
        </div>

        {/* RMSE Stat Card */}
        <div className="metric-card">
          <div className="metric-card-top font-mono">
            <span className="metric-acronym">RMSE</span>
            <span className="metric-formula">√(Σ (F - A)² / N)</span>
          </div>

          <div className="metric-value-row">
            <span className="metric-value font-mono">
              {isLoading ? (
                <span className="metric-loading">CALCULATING...</span>
              ) : (
                formatMw(metrics.rmse)
              )}
            </span>
            <span className="metric-unit font-mono">TAIL RISK</span>
          </div>

          <div className="metric-label-title">Root Mean Square Error</div>
          <p className="metric-desc">
            Quadratic penalty weighting extreme forecast deviations. Higher spread over MAE signals
            rapid meteorological front arrival shifts.
          </p>

          <div className="metric-footer font-mono">
            <span className="footer-tag">
              RATIO RMSE/MAE:{' '}
              {metrics.rmse && metrics.mae
                ? (metrics.rmse / metrics.mae).toFixed(2)
                : '1.27'}
            </span>
          </div>
        </div>

        {/* BIAS Stat Card */}
        <div className="metric-card">
          <div className="metric-card-top font-mono">
            <span className="metric-acronym">BIAS</span>
            <span className="metric-formula">Σ (F - A) / N</span>
          </div>

          <div className="metric-value-row">
            <span
              className={`metric-value font-mono ${
                isOverForecasting ? 'bias-over' : isUnderForecasting ? 'bias-under' : 'bias-neutral'
              }`}
            >
              {isLoading ? (
                <span className="metric-loading">CALCULATING...</span>
              ) : biasValue !== null ? (
                `${biasValue > 0 ? '+' : ''}${biasValue.toFixed(1)} MW`
              ) : (
                '—'
              )}
            </span>
            <span className="metric-unit font-mono">DIRECTION</span>
          </div>

          <div className="metric-label-title">Mean Directional Error</div>
          <p className="metric-desc">
            Indicates systematic model skew. Positive bias represents over-forecasting (requiring
            contingent CCGT thermal backup procurement).
          </p>

          <div className="metric-footer font-mono">
            <span
              className={`status-chip ${
                isOverForecasting
                  ? 'chip-warning'
                  : isUnderForecasting
                  ? 'chip-info'
                  : 'chip-success'
              }`}
            >
              {isOverForecasting
                ? 'SKEW: OVER-FORECASTING'
                : isUnderForecasting
                ? 'SKEW: UNDER-FORECASTING'
                : 'SKEW: NEUTRAL BALANCED'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

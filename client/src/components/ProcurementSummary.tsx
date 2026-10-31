import React from 'react';
import type { ProcurementSummaryStats } from '../types';

interface ProcurementSummaryProps {
  stats: ProcurementSummaryStats;
  deliveryDate: string;
}

export const ProcurementSummary: React.FC<ProcurementSummaryProps> = ({
  stats,
  deliveryDate,
}) => {
  return (
    <section className="procurement-chassis">
      <div className="procurement-badge font-mono">
        DAY-AHEAD BUYING DESK DIRECTIVE // DELIVERY TARGET: {deliveryDate}
      </div>

      <div className="procurement-metrics-row">
        <div className="procurement-stat">
          <span className="stat-label font-mono">ESTIMATED DAY VOLUME</span>
          <span className="stat-val font-mono">{stats.totalForecastGwh} <small>GWh</small></span>
          <span className="stat-caption">Total wind energy across 48 periods</span>
        </div>

        <div className="procurement-stat">
          <span className="stat-label font-mono">PEAK GENERATION</span>
          <span className="stat-val font-mono">
            {stats.peakForecastMw.toLocaleString()} <small>MW</small>
          </span>
          <span className="stat-caption font-mono">At {stats.peakPeriodLabel} UTC</span>
        </div>

        <div className="procurement-stat">
          <span className="stat-label font-mono">MINIMUM TROUGH</span>
          <span className="stat-val font-mono">
            {stats.minForecastMw.toLocaleString()} <small>MW</small>
          </span>
          <span className="stat-caption font-mono">At {stats.minPeriodLabel} UTC</span>
        </div>

        <div className="procurement-stat stat-highlight">
          <span className="stat-label font-mono">RECOMMENDED HEDGE RESERVE</span>
          <span className="stat-val font-mono text-accent">
            +{stats.recommendedReserveMw.toLocaleString()} <small>MW</small>
          </span>
          <span className="stat-caption">Procure from CCGT/hydro based on ±MAE</span>
        </div>
      </div>
    </section>
  );
};

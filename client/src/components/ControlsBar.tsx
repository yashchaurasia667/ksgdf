import React from 'react';
import type { QueryFilters } from '../types';

interface ControlsBarProps {
  filters: QueryFilters;
  onChangeFilters: (newFilters: Partial<QueryFilters>) => void;
  onRefresh: () => void;
  isFetching: boolean;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  filters,
  onChangeFilters,
  onRefresh,
  isFetching,
}) => {
  // Compute next day (delivery day) based on decision date
  const computeNextDay = (dateStr: string): string => {
    try {
      const d = new Date(`${dateStr}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDecisionDate = e.target.value;
    const newDeliveryDate = computeNextDay(newDecisionDate);
    onChangeFilters({
      decisionDate: newDecisionDate,
      deliveryDate: newDeliveryDate,
    });
  };

  const handleCutoffChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilters({ cutoffTime: e.target.value });
  };

  const setPresetDate = (dateStr: string) => {
    onChangeFilters({
      decisionDate: dateStr,
      deliveryDate: computeNextDay(dateStr),
    });
  };

  const setPresetCutoff = (timeStr: string) => {
    onChangeFilters({ cutoffTime: timeStr });
  };

  const todayIso = new Date().toISOString().split('T')[0];

  // Compute relative preset dates
  const yesterday = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split('T')[0];
  })();
  const lastWeek = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 7);
    return d.toISOString().split('T')[0];
  })();
  const lastMonth = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  return (
    <section className="controls-chassis">
      <div className="controls-grid">
        {/* Decision Date Control */}
        <div className="control-card">
          <div className="control-header">
            <span className="control-label font-mono">DECISION DAY (CURRENT DATE)</span>
            <span className="control-badge font-mono">BUYER AT DESK</span>
          </div>
          <div className="control-input-row">
            <input
              type="date"
              value={filters.decisionDate}
              onChange={handleDateChange}
              className="chassis-input font-mono"
              aria-label="Decision Date"
            />
          </div>
          <div className="control-presets font-mono">
            <button
              type="button"
              className={`preset-btn ${filters.decisionDate === lastMonth ? 'preset-active' : ''}`}
              onClick={() => setPresetDate(lastMonth)}
            >
              -30d
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.decisionDate === lastWeek ? 'preset-active' : ''}`}
              onClick={() => setPresetDate(lastWeek)}
            >
              -7d
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.decisionDate === yesterday ? 'preset-active' : ''}`}
              onClick={() => setPresetDate(yesterday)}
            >
              Yesterday
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.decisionDate === todayIso ? 'preset-active' : ''}`}
              onClick={() => setPresetDate(todayIso)}
            >
              Today
            </button>
          </div>
        </div>

        {/* Gate Closure / Cutoff Time Control */}
        <div className="control-card">
          <div className="control-header">
            <span className="control-label font-mono">GATE CLOSURE CUTOFF</span>
            <span className="control-badge font-mono">DAY-AHEAD DEADLINE</span>
          </div>
          <div className="control-input-row">
            <input
              type="time"
              value={filters.cutoffTime}
              onChange={handleCutoffChange}
              step="300"
              className="chassis-input font-mono"
              aria-label="Cutoff Time"
            />
          </div>
          <div className="control-presets font-mono">
            <button
              type="button"
              className={`preset-btn ${filters.cutoffTime === '09:00' ? 'preset-active' : ''}`}
              onClick={() => setPresetCutoff('09:00')}
            >
              09:00
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.cutoffTime === '11:00' ? 'preset-active' : ''}`}
              onClick={() => setPresetCutoff('11:00')}
            >
              11:00 (Std)
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.cutoffTime === '13:00' ? 'preset-active' : ''}`}
              onClick={() => setPresetCutoff('13:00')}
            >
              13:00
            </button>
            <button
              type="button"
              className={`preset-btn ${filters.cutoffTime === '17:00' ? 'preset-active' : ''}`}
              onClick={() => setPresetCutoff('17:00')}
            >
              17:00
            </button>
          </div>
        </div>

        {/* Target Delivery Day Readout */}
        <div className="control-card readout-card">
          <div className="control-header">
            <span className="control-label font-mono">DELIVERY TARGET DAY</span>
            <span className="control-badge font-mono">48 SLOTS (D+1)</span>
          </div>
          <div className="readout-display font-mono">
            <span className="readout-value">{filters.deliveryDate}</span>
            <span className="readout-sub">00:00 → 23:30 UTC</span>
          </div>
          <div className="honesty-indicator font-mono">
            <span className="shield-icon">⛊</span>
            <span>Honesty Rule: All forecasts published after {filters.cutoffTime} are rejected</span>
          </div>
        </div>

        {/* Run Query Action */}
        <div className="control-card action-card">
          <button
            type="button"
            className="query-trigger-btn font-mono"
            onClick={onRefresh}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <span className="btn-spinner" />
                <span>FETCHING FEED...</span>
              </>
            ) : (
              <>
                <span className="btn-icon">⚡</span>
                <span>EXECUTE QUERY</span>
              </>
            )}
          </button>
          <div className="query-status-note font-mono">
            <span>Stream: WINDFOR + FUELHH</span>
          </div>
        </div>
      </div>
    </section>
  );
};

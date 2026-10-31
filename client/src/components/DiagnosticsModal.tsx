import React from 'react';
import type { BackendStatus } from '../types';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: BackendStatus;
  onRetest: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  status,
  onRetest,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-chassis" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge font-mono">SYS TELEMETRY</span>
            <h3 className="modal-title">BACKEND & API DIAGNOSTICS</h3>
          </div>
          <button type="button" className="modal-close-btn font-mono" onClick={onClose}>
            ✕ CLOSE
          </button>
        </div>

        <div className="modal-body font-mono">
          {/* Status summary */}
          <div className="diag-section">
            <div className="diag-row">
              <span className="diag-key">FastAPI Server:</span>
              <span className={`diag-val ${status.online ? 'val-good' : 'val-bad'}`}>
                {status.online ? `ONLINE (${status.pingMs}ms latency)` : 'OFFLINE / UNREACHABLE'}
              </span>
            </div>
            <div className="diag-row">
              <span className="diag-key">Resolved API Base:</span>
              <span className="diag-val">{status.apiBaseUrl}</span>
            </div>
            <div className="diag-row">
              <span className="diag-key">Last Heartbeat:</span>
              <span className="diag-val">{status.lastChecked}</span>
            </div>
          </div>

          {/* Explicit Backend Tweaks Guide */}
          <div className="diag-notes-box">
            <div className="diag-notes-header">⚙ BACKEND TWEAKS CHECKLIST (IF TESTING LOCALLY)</div>
            <ol className="diag-notes-list">
              <li>
                <strong>CORS Trailing Slash:</strong> In <code>server/main.py</code>, change{' '}
                <code>origins = ["http://localhost:3000/"]</code> to{' '}
                <code>origins = ["http://localhost:3000", "http://localhost:5173"]</code> (browsers
                omit the trailing slash in the <code>Origin</code> header).
              </li>
              <li>
                <strong>Actuals Fuel Type Default:</strong> In <code>server/routers/actuals.py</code>,
                change <code>fuel_type: str</code> to <code>fuel_type: str = "WIND"</code> so the query
                parameter is optional with a safe default.
              </li>
              <li>
                <strong>Forecast Range Route:</strong> The server exposes{' '}
                <code>GET /api/forecasts/range</code> (rather than <code>GET /api/forecasts/</code>).
                The client correctly targets <code>/range</code>.
              </li>
              <li>
                <strong>Analytics Cutoff Parameter:</strong> The server expects{' '}
                <code>GET /api/analytics/?date_from=...&date_to=...&cutoff=HH:mm:ss</code>.
              </li>
            </ol>
          </div>

          <div className="modal-actions">
            <button type="button" className="action-retest-btn font-mono" onClick={onRetest}>
              ⟳ RE-PING BACKEND
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

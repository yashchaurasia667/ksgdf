import React from 'react';
import type { BackendStatus } from '../types';

interface NavbarProps {
  backendStatus: BackendStatus;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  onOpenDiagnostics: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendStatus,
  demoMode,
  onToggleDemoMode,
  onOpenDiagnostics,
}) => {
  return (
    <header className="navbar-container">
      <div className="navbar-left">
        <div className="logo-brick">
          <div className="brick-segment" />
          <div className="brick-segment" />
          <div className="brick-segment" />
          <div className="brick-segment" />
        </div>
        <div className="brand-group">
          <div className="brand-title">GridBricks</div>
          <span className="brand-subtitle font-mono">
            DAY-AHEAD WIND FORECAST DESK // UK NATIONAL GRID
          </span>
        </div>
      </div>

      <div className="navbar-right">
        {/* Elexon Data Source Indicator */}
        <div className="source-indicator" title="Connected to Elexon BMRS Stream API">
          <span className="indicator-pulse" />
          <span className="source-label font-mono">
            ELEXON BMRS: <strong>WINDFOR</strong> + <strong>FUELHH</strong>
          </span>
        </div>

        {/* Backend Status Pill */}
        <button
          type="button"
          onClick={onOpenDiagnostics}
          className={`status-pill font-mono ${backendStatus.online ? 'status-online' : 'status-offline'}`}
          title="Click to view backend diagnostics and API configuration"
        >
          <span className="status-dot" />
          <span>
            {backendStatus.online
              ? `SERVER: ${backendStatus.pingMs !== null ? `${backendStatus.pingMs}ms` : 'UP'}`
              : 'SERVER: UNREACHABLE'}
          </span>
        </button>

        {/* Demo Mode Toggle */}
        <button
          type="button"
          onClick={onToggleDemoMode}
          className={`demo-toggle-btn font-mono ${demoMode ? 'demo-active' : ''}`}
          title="Toggle between Live API and January 2026 Demonstration Dataset"
        >
          <span className="toggle-switch-track">
            <span className="toggle-switch-thumb" />
          </span>
          <span className="demo-label">
            {demoMode ? 'JAN 2026 DEMO DATA' : 'LIVE FEED'}
          </span>
        </button>
      </div>
    </header>
  );
};

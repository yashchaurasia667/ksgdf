import React from "react";

export const Navbar: React.FC = () => {
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
        <div
          className="source-indicator"
          title="Connected to Elexon BMRS Stream API"
        >
          <span className="indicator-pulse" />
          <span className="source-label font-mono">
            ELEXON BMRS: <strong>WINDFOR</strong> + <strong>FUELHH</strong>
          </span>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useMemo, useRef } from 'react';
import type { DeliverySlot } from '../types';

interface ForecastChartProps {
  slots: DeliverySlot[];
  mae: number | null;
  deliveryDate: string;
  isLoading: boolean;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  slots,
  mae,
  deliveryDate,
  isLoading,
}) => {
  const [showActuals, setShowActuals] = useState(true);
  const [showErrorBand, setShowErrorBand] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // SVG Chart Dimensions
  const svgWidth = 1000;
  const svgHeight = 440;
  const margin = { top: 30, right: 35, bottom: 50, left: 65 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Calculate dynamic Y-axis domain
  const { maxMw, minMw, yTicks } = useMemo(() => {
    let max = 4000;
    let min = 0;

    slots.forEach((s) => {
      if (s.forecastMw !== null) {
        if (s.forecastMw > max) max = s.forecastMw;
        if (s.maeBoundUpper !== null && s.maeBoundUpper > max) max = s.maeBoundUpper;
      }
      if (s.actualMw !== null) {
        if (s.actualMw > max) max = s.actualMw;
      }
    });

    // Round max up to neat multiple of 1000 or 2000
    const step = max > 10000 ? 2000 : max > 5000 ? 1000 : 500;
    const roundedMax = Math.ceil((max * 1.1) / step) * step;

    const ticks: number[] = [];
    for (let val = 0; val <= roundedMax; val += step) {
      ticks.push(val);
    }

    return { maxMw: roundedMax, minMw: min, yTicks: ticks };
  }, [slots]);

  // Coordinate mapping functions
  const getX = (index: number) => {
    if (slots.length <= 1) return margin.left;
    return margin.left + (index / (slots.length - 1)) * plotWidth;
  };

  const getY = (mw: number) => {
    const clamped = Math.max(minMw, Math.min(maxMw, mw));
    return margin.top + plotHeight - ((clamped - minMw) / (maxMw - minMw)) * plotHeight;
  };

  // Build SVG path strings
  const { forecastPath, actualsPath, errorBandPath } = useMemo(() => {
    let fPath = '';
    let aPath = '';
    const upperPoints: [number, number][] = [];
    const lowerPoints: [number, number][] = [];

    slots.forEach((s, i) => {
      const x = getX(i);

      if (s.forecastMw !== null) {
        const y = getY(s.forecastMw);
        fPath += fPath === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;

        if (s.maeBoundUpper !== null && s.maeBoundLower !== null) {
          upperPoints.push([x, getY(s.maeBoundUpper)]);
          lowerPoints.push([x, getY(s.maeBoundLower)]);
        }
      }

      if (s.actualMw !== null) {
        const y = getY(s.actualMw);
        aPath += aPath === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
    });

    let bandPath = '';
    if (upperPoints.length > 0 && lowerPoints.length > 0) {
      const firstUpper = upperPoints[0];
      bandPath = `M ${firstUpper[0]} ${firstUpper[1]}`;
      for (let i = 1; i < upperPoints.length; i++) {
        bandPath += ` L ${upperPoints[i][0]} ${upperPoints[i][1]}`;
      }
      for (let i = lowerPoints.length - 1; i >= 0; i--) {
        bandPath += ` L ${lowerPoints[i][0]} ${lowerPoints[i][1]}`;
      }
      bandPath += ' Z';
    }

    return { forecastPath: fPath, actualsPath: aPath, errorBandPath: bandPath };
  }, [slots, maxMw, minMw]);

  // Handle pointer tracking for crosshair and HUD tooltip
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgRelativeX = (clientX / rect.width) * svgWidth;

    if (svgRelativeX < margin.left || svgRelativeX > margin.left + plotWidth) {
      setHoveredIndex(null);
      return;
    }

    const ratio = (svgRelativeX - margin.left) / plotWidth;
    const index = Math.round(ratio * (slots.length - 1));
    if (index >= 0 && index < slots.length) {
      setHoveredIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredSlot = hoveredIndex !== null ? slots[hoveredIndex] : null;

  // Major tick marks along X-axis
  const xTickIndices = [0, 8, 16, 24, 32, 40, 47];

  return (
    <section className="chart-panel-container">
      <div className="chart-panel-header">
        <div className="chart-title-group">
          <div className="screen-led-dot" />
          <h2 className="chart-title font-mono">
            DELIVERY DAY PROFILE // {deliveryDate} (48 SETTLEMENT PERIODS)
          </h2>
        </div>

        <div className="chart-controls-group font-mono">
          <label className="chart-toggle-item">
            <input
              type="checkbox"
              checked={showErrorBand}
              onChange={(e) => setShowErrorBand(e.target.checked)}
              className="chart-checkbox"
            />
            <span className="legend-swatch swatch-band" />
            <span>±MAE UNCERTAINTY BAND ({mae ? `±${Math.round(mae)} MW` : '±MAE'})</span>
          </label>

          <label className="chart-toggle-item">
            <span className="legend-swatch swatch-forecast" />
            <span>LATEST PRE-CUTOFF FORECAST</span>
          </label>

          <label className="chart-toggle-item">
            <input
              type="checkbox"
              checked={showActuals}
              onChange={(e) => setShowActuals(e.target.checked)}
              className="chart-checkbox"
            />
            <span className="legend-swatch swatch-actual" />
            <span>ACTUAL OUTTURN</span>
          </label>
        </div>
      </div>

      <div className="chart-screen-recess" ref={containerRef}>
        {isLoading && (
          <div className="chart-screen-overlay font-mono">
            <span className="screen-spinner" />
            <span>ACQUIRING ELEXON BMRS TELEMETRY...</span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f15b22" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#f15b22" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#f15b22" stopOpacity="0.04" />
            </linearGradient>

            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2c363d" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Background Grid Pattern */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="url(#gridPattern)"
          />

          {/* Horizontal Y-Gridlines & Labels */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={`y-${tickVal}`} className="grid-line-group">
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + plotWidth}
                  y2={y}
                  stroke="#354047"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="axis-label font-mono"
                  fill="#8c979d"
                  fontSize="11"
                >
                  {tickVal.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Y Axis Unit Label */}
          <text
            x={margin.left - 10}
            y={margin.top - 12}
            textAnchor="end"
            className="axis-unit-label font-mono"
            fill="#d8dee1"
            fontSize="10"
            fontWeight="600"
          >
            MW
          </text>

          {/* Vertical X-Gridlines & Time Labels */}
          {xTickIndices.map((idx) => {
            if (idx >= slots.length) return null;
            const x = getX(idx);
            const slot = slots[idx];
            return (
              <g key={`x-${idx}`} className="grid-line-group">
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + plotHeight}
                  stroke="#354047"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                />
                <line
                  x1={x}
                  y1={margin.top + plotHeight}
                  x2={x}
                  y2={margin.top + plotHeight + 6}
                  stroke="#57636a"
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={margin.top + plotHeight + 22}
                  textAnchor="middle"
                  className="axis-label font-mono"
                  fill="#8c979d"
                  fontSize="11"
                >
                  {slot.timeLabel}
                </text>
                <text
                  x={x}
                  y={margin.top + plotHeight + 36}
                  textAnchor="middle"
                  className="axis-period-label font-mono"
                  fill="#5c676e"
                  fontSize="9"
                >
                  SP {slot.periodNumber}
                </text>
              </g>
            );
          })}

          {/* Error Band (±MAE Area) */}
          {showErrorBand && errorBandPath && (
            <path
              d={errorBandPath}
              fill="url(#bandGradient)"
              stroke="#f15b22"
              strokeWidth="0.75"
              strokeDasharray="2 2"
              opacity="0.85"
            />
          )}

          {/* Forecast Line */}
          {forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke="#f15b22"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Actuals Line */}
          {showActuals && actualsPath && (
            <path
              d={actualsPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Crosshair Line & Highlighting on Hover */}
          {hoveredSlot !== null && hoveredIndex !== null && (
            <g className="crosshair-group">
              <line
                x1={getX(hoveredIndex)}
                y1={margin.top}
                x2={getX(hoveredIndex)}
                y2={margin.top + plotHeight}
                stroke="#d8dee1"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Point on Forecast Line */}
              {hoveredSlot.forecastMw !== null && (
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(hoveredSlot.forecastMw)}
                  r="5"
                  fill="#f15b22"
                  stroke="#20272b"
                  strokeWidth="2"
                />
              )}

              {/* Point on Actuals Line */}
              {showActuals && hoveredSlot.actualMw !== null && (
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(hoveredSlot.actualMw)}
                  r="5"
                  fill="#38bdf8"
                  stroke="#20272b"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip HUD Card */}
        {hoveredSlot !== null && hoveredIndex !== null && (
          <div
            className="chart-hud-tooltip font-mono"
            style={{
              left: `${Math.min(80, Math.max(20, (getX(hoveredIndex) / svgWidth) * 100))}%`,
            }}
          >
            <div className="tooltip-header">
              <span className="tooltip-title">SETTLEMENT PERIOD #{hoveredSlot.periodNumber}</span>
              <span className="tooltip-time">{hoveredSlot.timeLabel} UTC</span>
            </div>

            <div className="tooltip-body">
              <div className="tooltip-row">
                <span className="tooltip-key">
                  <span className="swatch-dot swatch-forecast" /> FORECAST:
                </span>
                <span className="tooltip-val highlight-forecast">
                  {hoveredSlot.forecastMw !== null
                    ? `${hoveredSlot.forecastMw.toLocaleString()} MW`
                    : 'N/A'}
                </span>
              </div>

              {hoveredSlot.forecastPublishTime && (
                <div className="tooltip-subrow">
                  <span>PUBLISHED:</span>
                  <span>{hoveredSlot.forecastPublishTime.replace('T', ' ').replace('Z', '')}</span>
                </div>
              )}

              {hoveredSlot.actualMw !== null && (
                <div className="tooltip-row">
                  <span className="tooltip-key">
                    <span className="swatch-dot swatch-actual" /> ACTUAL:
                  </span>
                  <span className="tooltip-val highlight-actual">
                    {hoveredSlot.actualMw.toLocaleString()} MW
                  </span>
                </div>
              )}

              {hoveredSlot.errorMw !== null && (
                <div className="tooltip-row">
                  <span className="tooltip-key">ERROR (F - A):</span>
                  <span
                    className={`tooltip-val ${hoveredSlot.errorMw >= 0 ? 'error-pos' : 'error-neg'}`}
                  >
                    {hoveredSlot.errorMw > 0 ? `+${hoveredSlot.errorMw}` : hoveredSlot.errorMw} MW
                  </span>
                </div>
              )}

              {hoveredSlot.maeBoundLower !== null && hoveredSlot.maeBoundUpper !== null && (
                <div className="tooltip-subrow">
                  <span>±MAE RANGE:</span>
                  <span>
                    {Math.round(hoveredSlot.maeBoundLower).toLocaleString()} –{' '}
                    {Math.round(hoveredSlot.maeBoundUpper).toLocaleString()} MW
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="chart-panel-footer font-mono">
        <div className="footer-legend-item">
          <span className="indicator-led-orange" />
          <span>X: 48 Half-Hourly Settlement Periods</span>
        </div>
        <div className="footer-legend-item">
          <span>Y: Megawatts (MW) Generation</span>
        </div>
        <div className="footer-legend-item">
          <span>Source: National Grid ESO via Elexon BMRS</span>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Bar } from 'recharts';
import { CustomTooltip, formatNumber, getIndicatorTrend } from './StockTooltips';
import { cn } from '../lib/utils';

const CustomCursor = (props: any) => {
  const { x, y, width, height, stroke, strokeWidth, strokeDasharray, points } = props;
  
  // Ensure safe number values to prevent NaN errors
  const safeX = typeof x === 'number' && !isNaN(x) ? x : 0;
  const safeY = typeof y === 'number' && !isNaN(y) ? y : 0;
  const safeWidth = typeof width === 'number' && !isNaN(width) ? width : 0;
  const safeHeight = typeof height === 'number' && !isNaN(height) ? height : 1000;

  // When using Brush, the band width calculation can become inaccurate for the cursor.
  // However, the 'points' array provided to the cursor by Recharts contains the exact 
  // coordinates of the active data points. We should always prefer the x-coordinate 
  // from the points array to ensure perfect alignment with the line dots.
  let cx = safeX;
  if (points && points.length > 0) {
    // Find a valid point from the payload (usually a Line point which is centered)
    const validPoint = points.find((p: any) => p && typeof p.x === 'number' && !isNaN(p.x));
    if (validPoint) {
      cx = validPoint.x;
    } else if (safeWidth > 0) {
      cx = safeX + safeWidth / 2;
    }
  } else if (safeWidth > 0) {
    cx = safeX + safeWidth / 2;
  }

  // The cursor should span the entire height of the chart area.
  const cy1 = safeY;
  const cy2 = safeY + safeHeight;

  return (
    <line 
      x1={cx} 
      y1={cy1} 
      x2={cx} 
      y2={cy2} 
      stroke={stroke || '#3b82f6'} 
      strokeWidth={strokeWidth || 1} 
      strokeDasharray={strokeDasharray || '3 3'} 
    />
  );
};

const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;

  if (open == null || close == null || high == null || low == null) return null;
  if (typeof x !== 'number' || isNaN(x) || typeof y !== 'number' || isNaN(y) || typeof width !== 'number' || isNaN(width) || typeof height !== 'number' || isNaN(height)) return null;

  const isUp = close > open;
  const color = isUp ? "#f87171" : "#4ade80";

  if (high === low) return <rect x={x} y={y} width={width} height={1} fill={color} />;

  const ratio = height / (high - low);
  const yOpen = y + (high - open) * ratio;
  const yClose = y + (high - close) * ratio;

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
  const wickX = x + width / 2;

  return (
    <g>
      <line x1={wickX} y1={y} x2={wickX} y2={y + height} stroke={color} strokeWidth={1.5} />
      <rect x={x} y={bodyTop} width={width} height={bodyHeight} fill={color} stroke={color} fillOpacity={0.8} />
    </g>
  );
};

export const StockChart = ({ 
  data, 
  activeMAs, 
  setActiveMAs,
  maColors, 
  displayData,
  prevData,
  handleMouseMove, 
  handleMouseLeave 
}: any) => {
  const toggleMA = (key: string) => {
    if (setActiveMAs) {
      setActiveMAs((prev: any) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const renderMA = (key: string, label: string, color: string) => {
    if (!displayData || displayData[key] == null) return null;
    const val = displayData[key];
    const prevVal = prevData ? prevData[key] : null;
    const trend = getIndicatorTrend(val, prevVal);
    
    return (
      <button 
        onClick={() => toggleMA(key)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors",
          activeMAs[key] ? "bg-zinc-800" : "opacity-50 hover:opacity-100"
        )}
      >
        <span style={{ color }}>{label}</span>
        <span className="text-zinc-100">{formatNumber(val)}</span>
        {trend.icon && <span className={trend.color}>{trend.icon}</span>}
      </button>
    );
  };

  const renderBollinger = () => {
    if (!displayData || displayData.bbUpper == null) return null;
    const trend = getIndicatorTrend(displayData.bbMiddle, prevData?.bbMiddle);
    return (
      <button 
        onClick={() => toggleMA('bollinger')}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors",
          activeMAs.bollinger ? "bg-zinc-800" : "opacity-50 hover:opacity-100"
        )}
      >
        <span style={{ color: maColors.bbUpper }}>布林</span>
        <span className="text-zinc-100">
          {formatNumber(displayData.bbUpper)} / {formatNumber(displayData.bbMiddle)} / {formatNumber(displayData.bbLower)}
        </span>
        {trend.icon && <span className={trend.color}>{trend.icon}</span>}
      </button>
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm overflow-hidden flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {renderMA('ma5', 'MA5', maColors.ma5)}
        {renderMA('ma10', 'MA10', maColors.ma10)}
        {renderMA('ma20', 'MA20', maColors.ma20)}
        {renderMA('ma60', 'MA60', maColors.ma60)}
        {renderBollinger()}
      </div>
      <div className="overflow-x-auto custom-scrollbar -mx-2 px-2">
        <div className="h-[300px] sm:h-[450px] w-full min-w-[800px] sm:min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={data.historical} 
              syncId="stockChart" 
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={true} />
              <XAxis 
                dataKey="date" 
                stroke="#52525b" 
                fontSize={10} 
                tickMargin={8} 
                minTickGap={window.innerWidth < 640 ? 50 : 30} 
                axisLine={{ stroke: '#3f3f46' }}
                tickFormatter={(val) => {
                  if (window.innerWidth >= 640) return val;
                  const parts = val.split('-');
                  if (parts.length >= 3) return `${parts[1]}-${parts[2]}`;
                  return val;
                }}
              />
              <YAxis 
                domain={["auto", "auto"]} 
                orientation="right" 
                width={60}
                stroke="#52525b" 
                fontSize={10} 
                tickFormatter={(val) => val?.toFixed(0) ?? ""} 
                axisLine={{ stroke: '#3f3f46' }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={<CustomCursor stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" />}
              />
              
              {activeMAs.bollinger && (
                <>
                  <Line type="monotone" dataKey="bbUpper" stroke={maColors.bbUpper} strokeWidth={1.5} dot={false} strokeOpacity={0.8} isAnimationActive={false} />
                  <Line type="monotone" dataKey="bbLower" stroke={maColors.bbLower} strokeWidth={1.5} dot={false} strokeOpacity={0.8} isAnimationActive={false} />
                  <Line type="monotone" dataKey="bbMiddle" stroke={maColors.bbMiddle} strokeWidth={1} strokeDasharray="3 3" dot={false} strokeOpacity={0.6} isAnimationActive={false} />
                </>
              )}

              {activeMAs.ma5 && <Line type="monotone" dataKey="ma5" stroke={maColors.ma5} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
              {activeMAs.ma10 && <Line type="monotone" dataKey="ma10" stroke={maColors.ma10} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
              {activeMAs.ma20 && <Line type="monotone" dataKey="ma20" stroke={maColors.ma20} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
              {activeMAs.ma60 && <Line type="monotone" dataKey="ma60" stroke={maColors.ma60} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
              
              <Bar dataKey="candle" shape={<Candlestick />} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { cn } from "../lib/utils";

export const UP_COLOR = "#f87171";
export const DOWN_COLOR = "#4ade80";

export const formatNumber = (num: number | null | undefined, decimals = 2) => {
  if (num == null) return "-";
  return num.toFixed(decimals);
};

export const getPriceTrend = (val: number | null | undefined, ref: number | null | undefined) => {
  if (val == null || ref == null) return { icon: "", color: "text-zinc-100" };
  if (val > ref) return { icon: "▲", color: "text-red-400" };
  if (val < ref) return { icon: "▼", color: "text-green-400" };
  return { icon: "", color: "text-zinc-100" };
};

export const getIndicatorTrend = (current: number | null | undefined, prev: number | null | undefined) => {
  if (current == null || prev == null) return { icon: "", color: "text-zinc-400" };
  if (current > prev) return { icon: "▲", color: "text-red-400" };
  if (current < prev) return { icon: "▼", color: "text-green-400" };
  return { icon: "", color: "text-zinc-400" };
};

export const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;

  if (open == null || close == null || high == null || low == null) return null;

  const isUp = close > open;
  const color = isUp ? UP_COLOR : DOWN_COLOR;

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

export const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isUp = data.close > data.open;
    const color = isUp ? "text-red-400" : "text-green-400";
    
    return (
      <div className="bg-zinc-900/95 border border-zinc-700 p-2 rounded-lg shadow-2xl backdrop-blur-md text-[10px] sm:text-xs min-w-[120px] z-50 pointer-events-none">
        <div className="text-zinc-400 mb-1 font-mono border-b border-zinc-800 pb-1">{data.date}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="text-zinc-500">開盤</span>
          <span className="text-zinc-100 font-mono text-right">{formatNumber(data.open)}</span>
          <span className="text-zinc-500">最高</span>
          <span className="text-red-400 font-mono text-right">{formatNumber(data.high)}</span>
          <span className="text-zinc-500">最低</span>
          <span className="text-green-400 font-mono text-right">{formatNumber(data.low)}</span>
          <span className="text-zinc-500">收盤</span>
          <span className={cn("font-mono text-right", color)}>{formatNumber(data.close)}</span>
          <span className="text-zinc-500 pt-1 border-t border-zinc-800">成交量</span>
          <span className="text-zinc-100 font-mono text-right pt-1 border-t border-zinc-800">{formatNumber(data.volume / 1000, 0)}張</span>
        </div>
      </div>
    );
  }
  return null;
};

export const IndicatorTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const labelMap: Record<string, string> = {
      volume: "成交量(張)",
      macdDif: "MACD DIF",
      macdDea: "MACD DEA",
      macdHist: "MACD 柱狀",
      kdjK: "KDJ K",
      kdjD: "KDJ D",
      kdjJ: "KDJ J",
    };

    return (
      <div className="bg-zinc-900/95 border border-zinc-700 p-2 rounded-lg shadow-2xl backdrop-blur-md text-[10px] sm:text-xs min-w-[100px] z-50 pointer-events-none">
        <div className="text-zinc-400 mb-1 font-mono border-b border-zinc-800 pb-1">{label}</div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const label = labelMap[entry.name] || entry.name;
            let value = entry.value;
            if (entry.name === 'volume') {
              value = `${formatNumber(value / 1000, 0)} 張`;
            } else {
              value = formatNumber(value);
            }
            return (
              <div key={index} className="flex justify-between gap-4">
                <span style={{ color: entry.color }}>{label}</span>
                <span className="text-zinc-100 font-mono">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

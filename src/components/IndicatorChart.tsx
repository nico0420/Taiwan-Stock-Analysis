import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, LineChart, Line } from 'recharts';
import { IndicatorTooltip } from './StockTooltips';

export const IndicatorChart = ({ data, displayData, handleMouseMove, handleMouseLeave, type, kdjData, macdData }: any) => {
  if (type === 'volume') {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">成交量 (張)</div>
          <div className="text-xs font-mono text-zinc-100">
            {displayData?.volume ? `${(displayData.volume / 1000).toFixed(0)} 張` : "-"}
          </div>
        </div>
        <div className="h-[100px] sm:h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.historical} syncId="stockChart" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis hide orientation="right" />
              <Tooltip content={<IndicatorTooltip />} cursor={{ fill: '#3f3f46', fillOpacity: 0.3 }} />
              <Bar dataKey="volume" isAnimationActive={false}>
                {data.historical.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.close > entry.open ? "#f87171" : "#4ade80"} fillOpacity={0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (type === 'kdj') {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">KDJ (9,3,3)</div>
          <div className="flex gap-3 text-[10px] font-mono">
            <div className="flex items-center gap-1">
              <span className="text-blue-400">K:{displayData?.kdjK?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-400">D:{displayData?.kdjD?.toFixed(2) ?? "-"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-orange-400">J:{displayData?.kdjJ?.toFixed(2) ?? "-"}</span>
            </div>
          </div>
        </div>
        <div className="h-[100px] sm:h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.historical} syncId="stockChart" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} hide orientation="right" />
              <Tooltip content={<IndicatorTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
              <Line type="monotone" dataKey="kdjK" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="kdjD" stroke="#a855f7" strokeWidth={1} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="kdjJ" stroke="#f97316" strokeWidth={1} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return null;
};

import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { formatNumber } from './StockTooltips';
import { cn } from '../lib/utils';
import { Activity, ArrowUp, ArrowDown, Clock, Info } from 'lucide-react';

interface RealtimeQuoteProps {
  data: any;
  symbol: string;
}

const RealtimeQuote: React.FC<RealtimeQuoteProps> = ({ data, symbol }) => {
  const historical = data.historical || [];
  const [pulse, setPulse] = useState(false);

  // Trigger pulse effect when price changes
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(timer);
  }, [data.regularMarketPrice]);
  
  // Filter for today's data and pad to full trading hours (09:00 - 13:30)
  const intradayData = useMemo(() => {
    if (historical.length === 0) return [];
    
    const lastPoint = historical[historical.length - 1];
    const lastDate = lastPoint.date.split(' ')[0];
    const actualData = historical.filter((d: any) => d.date.startsWith(lastDate));
    
    // Get current Taiwan time to know where to stop the line if market is open
    const now = new Date();
    const twFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = twFormatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
    
    const twDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const twTime = `${getPart('hour')}:${getPart('minute')}`;

    const isToday = lastDate === twDate;
    const lastActualTime = actualData.length > 0 
      ? actualData[actualData.length - 1].date.split(' ')[1] 
      : "09:00";

    // If it's today, we draw up to current time (max 13:30). If it's a past day, we draw to 13:30.
    let endOfLineTime = "13:30";
    if (isToday) {
      if (twTime < "09:00") {
        endOfLineTime = "09:00";
      } else if (twTime < "13:30") {
        endOfLineTime = twTime;
      }
    }
    
    // Always ensure we at least draw up to the last data point we actually have
    if (lastActualTime > endOfLineTime) {
      endOfLineTime = lastActualTime;
    }

    // Generate full timeline 09:00 to 13:30 (Taiwan Market Hours)
    const fullTimeline = [];
    const startHour = 9;
    const endHour = 13;
    const endMinute = 30;
    
    // Create a map for faster lookup
    const dataMap = new Map();
    actualData.forEach((d: any) => {
      const timePart = d.date.split(' ')[1];
      dataMap.set(timePart, d);
    });

    let lastKnownClose = data.regularMarketPreviousClose || (actualData.length > 0 ? actualData[0].close : null);

    for (let h = startHour; h <= endHour; h++) {
      const maxM = (h === endHour) ? endMinute : 59;
      for (let m = 0; m <= maxM; m++) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const fullDateStr = `${lastDate} ${timeStr}`;
        
        if (dataMap.has(timeStr)) {
          const d = dataMap.get(timeStr);
          fullTimeline.push(d);
          lastKnownClose = d.close;
        } else {
          // Carry forward the price if this time is before or at the "end of line"
          const shouldHavePrice = timeStr <= endOfLineTime;
          
          fullTimeline.push({
            date: fullDateStr,
            close: shouldHavePrice ? lastKnownClose : null,
            volume: 0,
            isPlaceholder: true
          });
        }
      }
    }
    return fullTimeline;
  }, [historical, data.regularMarketPreviousClose]);

  const latest = historical[historical.length - 1] || {};
  const prevClose = data.regularMarketPreviousClose || (historical.length > 1 ? historical[historical.length - 2].close : latest.close);
  
  const isPositive = data.regularMarketChange >= 0;
  const colorClass = isPositive ? 'text-red-500' : 'text-green-500';
  const bgColorClass = isPositive ? 'bg-red-500' : 'bg-green-500';

  const turnover = useMemo(() => {
    const val = (data.regularMarketPrice || 0) * (data.regularMarketVolume || 0) / 100000000;
    return isNaN(val) ? "0.00" : val.toFixed(2);
  }, [data.regularMarketPrice, data.regularMarketVolume]);

  const amplitude = useMemo(() => {
    if (!prevClose || prevClose === 0) return "0.00";
    const high = data.regularMarketDayHigh || data.regularMarketPrice || 0;
    const low = data.regularMarketDayLow || data.regularMarketPrice || 0;
    const val = ((high - low) / prevClose) * 100;
    return isNaN(val) ? "0.00" : val.toFixed(2);
  }, [data.regularMarketDayHigh, data.regularMarketDayLow, data.regularMarketPrice, prevClose]);

  // Generate bid/ask display
  const bidLevels = useMemo(() => {
    if (data.bid && data.bidSize) {
      return [{ price: data.bid, size: data.bidSize }];
    }
    return [];
  }, [data.bid, data.bidSize]);

  const askLevels = useMemo(() => {
    if (data.ask && data.askSize) {
      return [{ price: data.ask, size: data.askSize }];
    }
    return [];
  }, [data.ask, data.askSize]);

  return (
    <div className="bg-zinc-900/80 p-4 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl backdrop-blur-xl">
      {/* Top Bar: Status & Time */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "absolute -inset-1 rounded-full blur opacity-20 transition-all duration-1000",
              pulse ? "bg-blue-500 scale-150" : "bg-transparent scale-100"
            )}></div>
            <div className="relative flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-full border border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Delayed Data</span>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
            {data.shortName} <span className="text-zinc-600 font-normal not-italic ml-1">{symbol}</span>
          </h2>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-zinc-700" />
            <span>最後更新: {latest.date}</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50">
            <Activity size={12} className="text-orange-500" />
            <span className="text-orange-400 font-bold">台股延遲約 20 分鐘</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Main Price Display & Chart (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          {/* Big Price Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-zinc-950/40 p-6 rounded-2xl border border-zinc-800/50">
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className={cn(
                  "text-6xl font-black tracking-tighter transition-all duration-300",
                  pulse ? "scale-105" : "scale-100",
                  colorClass
                )}>
                  {data.regularMarketPrice?.toFixed(2)}
                </span>
                <div className={cn("flex flex-col font-bold", colorClass)}>
                  <div className="flex items-center">
                    {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    <span className="text-lg">{Math.abs(data.regularMarketChange || 0).toFixed(2)}</span>
                  </div>
                  <span className="text-sm">{data.regularMarketChangePercent?.toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">Current Market Price</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4 border-l border-zinc-800/50 pl-6">
              <div className="space-y-1">
                <p className="text-zinc-600 text-[10px] font-bold uppercase">High</p>
                <p className="text-red-400 font-mono font-bold">{(data.regularMarketDayHigh || data.regularMarketPrice || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-600 text-[10px] font-bold uppercase">Low</p>
                <p className="text-green-400 font-mono font-bold">{(data.regularMarketDayLow || data.regularMarketPrice || 0).toFixed(2)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-zinc-600 text-[10px] font-bold uppercase">Open</p>
                <p className="text-zinc-300 font-mono font-bold">{(data.regularMarketOpen || data.regularMarketPrice || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Intraday Chart */}
          <div className="h-[350px] flex flex-col bg-zinc-950/20 rounded-2xl p-4 border border-zinc-800/30">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={intradayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isPositive ? "#ef4444" : "#22c55e"} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={isPositive ? "#ef4444" : "#22c55e"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                  <XAxis dataKey="date" hide={true} />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    orientation="right"
                    tick={{ fontSize: 9, fill: '#3f3f46', fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        if (d.isPlaceholder && !d.close) return null;
                        
                        return (
                          <div className="bg-zinc-950 border border-zinc-800 p-3 shadow-2xl rounded-xl text-[10px] backdrop-blur-md">
                            <p className="font-bold text-zinc-500 mb-2 border-b border-zinc-800 pb-1">{d.date}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-6">
                                <span className="text-zinc-600">Price</span>
                                <span className="font-mono text-white font-bold">{d.close ? d.close.toFixed(2) : '---'}</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-zinc-600">Volume</span>
                                <span className="font-mono text-zinc-400">{d.volume ? formatNumber(d.volume) : '0'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={prevClose} stroke="#3f3f46" strokeDasharray="3 3" />
                  <Area 
                    type="monotone" 
                    dataKey="close" 
                    stroke={isPositive ? "#ef4444" : "#22c55e"} 
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    strokeWidth={2}
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="h-16 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intradayData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" hide={true} />
                  <Bar dataKey="volume" isAnimationActive={false}>
                    {intradayData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index > 0 && entry.close && intradayData[index-1].close 
                          ? (entry.close >= intradayData[index-1].close ? '#ef4444' : '#22c55e') 
                          : '#ef4444'} 
                        fillOpacity={0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[9px] text-zinc-700 mt-2 px-2 font-mono font-bold uppercase tracking-widest">
              <span>09:00</span>
              <span>10:30</span>
              <span>12:00</span>
              <span>13:30</span>
            </div>
          </div>
        </div>

        {/* Right: Market Depth & Stats (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
          {/* Bid/Ask Table */}
          <div className="bg-zinc-950/40 rounded-2xl border border-zinc-800/50 overflow-hidden">
            <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Market Depth</span>
              <div className="flex items-center gap-1 text-[9px] text-zinc-600">
                <Info size={10} />
                <span>Top Level Only</span>
              </div>
            </div>
            <div className="p-4 space-y-1">
              <div className="grid grid-cols-4 text-[9px] font-bold text-zinc-700 uppercase tracking-tighter pb-2">
                <span>Size</span>
                <span>Bid</span>
                <span className="text-right">Ask</span>
                <span className="text-right">Size</span>
              </div>
              
              {/* Ask Levels */}
              <div className="flex flex-col">
                {askLevels.length > 0 ? askLevels.map((level, i) => (
                  <div key={`ask-${i}`} className="grid grid-cols-4 items-center py-2 text-[13px] group hover:bg-zinc-800/30 transition-colors rounded">
                    <span className="text-zinc-800 font-mono">---</span>
                    <span className="text-zinc-800 font-mono">---</span>
                    <span className="text-right font-mono text-red-400 font-bold">{level.price.toFixed(2)}</span>
                    <span className="text-right font-mono text-zinc-300">{level.size}</span>
                  </div>
                )) : (
                  <div className="py-2 text-center text-[10px] text-zinc-700 italic">No Ask Data Available</div>
                )}
              </div>

              {/* Spread Divider */}
              <div className="py-2 border-y border-zinc-800/50 my-2 flex justify-between items-center px-2">
                <span className="text-[9px] font-bold text-zinc-700 uppercase">Spread</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {askLevels.length > 0 && bidLevels.length > 0 ? (askLevels[0].price - bidLevels[0].price).toFixed(2) : '---'}
                </span>
              </div>

              {/* Bid Levels */}
              <div className="flex flex-col">
                {bidLevels.length > 0 ? bidLevels.map((level, i) => (
                  <div key={`bid-${i}`} className="grid grid-cols-4 items-center py-2 text-[13px] group hover:bg-zinc-800/30 transition-colors rounded">
                    <span className="text-zinc-300 font-mono">{level.size}</span>
                    <span className="font-mono text-green-400 font-bold">{level.price.toFixed(2)}</span>
                    <span className="text-right text-zinc-800 font-mono">---</span>
                    <span className="text-right text-zinc-800 font-mono">---</span>
                  </div>
                )) : (
                  <div className="py-2 text-center text-[10px] text-zinc-700 italic">No Bid Data Available</div>
                )}
              </div>
            </div>
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
              <p className="text-zinc-600 text-[9px] font-bold uppercase mb-1">Volume</p>
              <p className="text-zinc-200 font-mono font-bold text-sm">{formatNumber(data.regularMarketVolume)}</p>
            </div>
            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
              <p className="text-zinc-600 text-[9px] font-bold uppercase mb-1">Turnover</p>
              <p className="text-zinc-200 font-mono font-bold text-sm">{turnover}B</p>
            </div>
            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
              <p className="text-zinc-600 text-[9px] font-bold uppercase mb-1">Amplitude</p>
              <p className="text-zinc-200 font-mono font-bold text-sm">{amplitude}%</p>
            </div>
            <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/50">
              <p className="text-zinc-600 text-[9px] font-bold uppercase mb-1">Avg Vol</p>
              <p className="text-zinc-200 font-mono font-bold text-sm">{formatNumber(data.averageDailyVolume3Month)}</p>
            </div>
          </div>

          <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-800/50">
            <p className="text-zinc-600 text-[9px] font-bold uppercase mb-2">Market Cap</p>
            <p className="text-zinc-200 font-mono font-bold text-sm">{formatNumber(data.marketCap)}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-zinc-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
            <span>Yahoo Finance Delayed Data</span>
          </div>
        </div>
        <p className="text-[9px] text-zinc-700 italic max-w-md text-right">
          註：台股數據由 Yahoo Finance 提供，約有 20 分鐘延遲。內外盤與五檔深度數據僅顯示 API 提供之最頂層資訊。
        </p>
      </div>
    </div>
  );
};

export default RealtimeQuote;


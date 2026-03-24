import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  BarChart,
  LineChart,
} from "recharts";
import { Search, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

// Custom Candlestick Shape for Recharts
const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;

  if (open == null || close == null || high == null || low == null) {
    return null;
  }

  const isUp = close > open;
  // Taiwan stock colors: Red for Up, Green for Down (Neon for dark mode)
  const color = isUp ? "#f87171" : "#4ade80";

  if (high === low) {
    return <rect x={x} y={y} width={width} height={1} fill={color} />;
  }

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

export default function StockDashboard() {
  const [symbol, setSymbol] = useState("2330.TW");
  const [searchInput, setSearchInput] = useState("2330.TW");
  const [interval, setInterval] = useState("1d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const [activeMAs, setActiveMAs] = useState({
    ma5: true,
    ma10: false,
    ma20: true,
    ma60: true,
    bollinger: true,
  });

  const fetchData = async (stockSymbol: string, queryInterval: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stock/${stockSymbol}?interval=${queryInterval}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch data");
      }
      const json = await res.json();
      
      // Prepare data for Recharts
      const formattedData = json.historical.map((d: any) => ({
        ...d,
        candle: [d.low, d.high], // For the custom candlestick shape
      }));
      
      setData({ ...json, historical: formattedData });
      setHoveredIndex(formattedData.length - 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(symbol, interval);
  }, [symbol, interval]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let query = searchInput.trim().toUpperCase();
    if (query) {
      // Automatically append .TW for 4-digit Taiwan stock codes
      if (/^\d{4}$/.test(query)) {
        query += ".TW";
        setSearchInput(query);
      }
      setSymbol(query);
    }
  };

  const handleMouseMove = (e: any) => {
    if (e.activeTooltipIndex != null) {
      setHoveredIndex(e.activeTooltipIndex);
    }
  };

  const handleMouseLeave = () => {
    if (data?.historical) {
      setHoveredIndex(data.historical.length - 1);
    }
  };

  const displayIndex = hoveredIndex !== null ? hoveredIndex : (data?.historical ? data.historical.length - 1 : 0);
  const displayData = data?.historical ? data.historical[displayIndex] : null;
  const prevData = data?.historical && displayIndex > 0 ? data.historical[displayIndex - 1] : null;

  const formatNumber = (num: number | null | undefined, decimals = 2) => {
    if (num == null) return "-";
    return num.toFixed(decimals);
  };

  const getPriceTrend = (val: number | null | undefined, ref: number | null | undefined) => {
    if (val == null || ref == null) return { icon: "", color: "text-zinc-100" };
    if (val > ref) return { icon: "▲", color: "text-red-400" };
    if (val < ref) return { icon: "▼", color: "text-green-400" };
    return { icon: "", color: "text-zinc-100" };
  };

  const getIndicatorTrend = (current: number | null | undefined, prev: number | null | undefined) => {
    if (current == null || prev == null) return { icon: "", color: "text-zinc-400" };
    if (current > prev) return { icon: "▲", color: "text-red-400" };
    if (current < prev) return { icon: "▼", color: "text-green-400" };
    return { icon: "", color: "text-zinc-400" };
  };

  // Get current date formatted
  const today = new Date();
  const formattedToday = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  const maColors = {
    ma5: "#60a5fa", // blue-400
    ma10: "#a78bfa", // purple-400
    ma20: "#fb923c", // orange-400
    ma60: "#facc15", // yellow-400
    bbUpper: "#22d3ee", // cyan-400 (更明顯)
    bbLower: "#22d3ee", // cyan-400 (更明顯)
    bbMiddle: "#facc15", // yellow-400 (更明顯)
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Top Navigation / Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              {[
                { label: "60分", value: "60m" },
                { label: "日線", value: "1d" },
                { label: "週線", value: "1wk" },
                { label: "月線", value: "1mo" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInterval(opt.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    interval === opt.value
                      ? "bg-blue-600 text-white font-medium shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="hidden md:block text-xs text-zinc-500 font-mono">
              SYSTEM_TIME: {formattedToday}
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="輸入股票代號 (如: 2330)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-600"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <button type="submit" className="hidden">搜尋</button>
          </form>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[600px] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-zinc-400 animate-pulse font-mono tracking-widest">INITIALIZING_DATA_STREAM...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[600px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="font-mono">ERROR: {error}</p>
          </div>
        ) : data && displayData ? (
          <div className="space-y-4 animate-in fade-in duration-700">
            
            {/* Stock Info Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    {data.shortName}
                  </h1>
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-sm font-mono">
                    {data.symbol.replace('.TW', '')}
                  </span>
                </div>
                <p className="text-zinc-500 text-sm">Yahoo Finance Real-time Data</p>
              </div>
              
              <div className="flex items-end gap-6">
                <div className="text-right">
                  <div className={cn("text-4xl font-bold font-mono tracking-tighter", getPriceTrend(data.regularMarketPrice, data.regularMarketPrice - data.regularMarketChange).color)}>
                    {formatNumber(data.regularMarketPrice)}
                  </div>
                  <div className={cn("text-sm font-medium flex items-center justify-end gap-1", getPriceTrend(data.regularMarketChange, 0).color)}>
                    <span>{data.regularMarketChange > 0 ? "+" : ""}{formatNumber(data.regularMarketChange)}</span>
                    <span>({data.regularMarketChangePercent > 0 ? "+" : ""}{formatNumber(data.regularMarketChangePercent)}%)</span>
                  </div>
                </div>
                <div className="h-12 w-px bg-zinc-800"></div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-zinc-500">最高</span>
                  <span className="text-zinc-100 font-mono">{formatNumber(displayData?.high)}</span>
                  <span className="text-zinc-500">最低</span>
                  <span className="text-zinc-100 font-mono">{formatNumber(displayData?.low)}</span>
                </div>
              </div>
            </div>

            {/* Main Chart Section */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
              {/* Chart Header / Indicators Toggle */}
              <div className="flex flex-wrap items-center gap-4 mb-4 px-2">
                <div className="flex items-center gap-2 bg-black/40 rounded-md p-1 border border-zinc-800">
                  {Object.entries(activeMAs).map(([key, active]) => (
                    <button
                      key={key}
                      onClick={() => setActiveMAs(prev => ({ ...prev, [key]: !active }))}
                      className={cn(
                        "px-2 py-0.5 text-[10px] uppercase font-bold rounded transition-all",
                        active 
                          ? "bg-zinc-800 text-white border border-zinc-700" 
                          : "text-zinc-600 hover:text-zinc-400"
                      )}
                      style={active ? { color: (maColors as any)[key] || (key === 'bollinger' ? maColors.bbUpper : '#fff') } : {}}
                    >
                      {key === 'bollinger' ? '布林' : key.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
                  {Object.entries(activeMAs).map(([key, active]) => {
                    if (!active || key === 'bollinger') return null;
                    const val = displayData?.[key];
                    const prevVal = prevData?.[key];
                    const trend = getIndicatorTrend(val, prevVal);
                    return (
                      <div key={key} className="flex items-center gap-1.5">
                        <span style={{ color: (maColors as any)[key] }}>{key.toUpperCase()}</span>
                        <span className="text-zinc-100">{formatNumber(val)}</span>
                        <span className={trend.color}>{trend.icon}</span>
                      </div>
                    );
                  })}
                  {activeMAs.bollinger && (
                    <div className="flex items-center gap-3">
                      <span style={{ color: maColors.bbUpper }}>布林</span>
                      <span className="text-zinc-400">上:{formatNumber(displayData?.bbUpper)}</span>
                      <span className="text-zinc-400">中:{formatNumber(displayData?.bbMiddle)}</span>
                      <span className="text-zinc-400">下:{formatNumber(displayData?.bbLower)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={data.historical} 
                    syncId="stockChart" 
                    margin={{ top: 10, right: 40, left: 0, bottom: 0 }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={true} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickMargin={8} 
                      minTickGap={30} 
                      axisLine={{ stroke: '#3f3f46' }}
                    />
                    <YAxis 
                      domain={["auto", "auto"]} 
                      orientation="right" 
                      stroke="#52525b" 
                      fontSize={10} 
                      tickFormatter={(val) => val?.toFixed(0) ?? ""} 
                      axisLine={{ stroke: '#3f3f46' }}
                    />
                    <Tooltip 
                      content={() => null}
                      cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
                    />
                    
                    {/* Bollinger Bands Area */}
                    {activeMAs.bollinger && (
                      <>
                        <Line 
                          type="monotone" 
                          dataKey="bbUpper" 
                          stroke={maColors.bbUpper} 
                          strokeWidth={1.5} 
                          dot={false} 
                          strokeOpacity={0.8}
                          isAnimationActive={false} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="bbLower" 
                          stroke={maColors.bbLower} 
                          strokeWidth={1.5} 
                          dot={false} 
                          strokeOpacity={0.8}
                          isAnimationActive={false} 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="bbMiddle" 
                          stroke={maColors.bbMiddle} 
                          strokeWidth={1} 
                          strokeDasharray="3 3"
                          dot={false} 
                          strokeOpacity={0.6}
                          isAnimationActive={false} 
                        />
                      </>
                    )}

                    {/* Moving Averages */}
                    {activeMAs.ma5 && <Line type="monotone" dataKey="ma5" stroke={maColors.ma5} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
                    {activeMAs.ma10 && <Line type="monotone" dataKey="ma10" stroke={maColors.ma10} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
                    {activeMAs.ma20 && <Line type="monotone" dataKey="ma20" stroke={maColors.ma20} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
                    {activeMAs.ma60 && <Line type="monotone" dataKey="ma60" stroke={maColors.ma60} strokeWidth={1.2} dot={false} isAnimationActive={false} />}
                    
                    {/* Candlesticks */}
                    <Bar dataKey="candle" shape={<Candlestick />} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom Indicators Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Volume Chart */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">成交量 (張)</div>
                  <div className="text-xs font-mono text-zinc-100">
                    {formatNumber(displayData?.volume / 1000, 0)} 張
                  </div>
                </div>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.historical} syncId="stockChart" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide orientation="right" />
                      <Tooltip content={() => null} cursor={{ fill: '#3f3f46', fillOpacity: 0.3 }} />
                      <Bar dataKey="volume" isAnimationActive={false}>
                        {data.historical.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.close > entry.open ? "#f87171" : "#4ade80"} fillOpacity={0.6} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* MACD Chart */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">MACD (12,26,9)</div>
                  <div className="flex gap-3 text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400">DIF:{formatNumber(displayData?.macdDif)}</span>
                      <span className={getIndicatorTrend(displayData?.macdDif, prevData?.macdDif).color}>
                        {getIndicatorTrend(displayData?.macdDif, prevData?.macdDif).icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">DEA:{formatNumber(displayData?.macdDea)}</span>
                      <span className={getIndicatorTrend(displayData?.macdDea, prevData?.macdDea).color}>
                        {getIndicatorTrend(displayData?.macdDea, prevData?.macdDea).icon}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.historical} syncId="stockChart" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide orientation="right" />
                      <Tooltip content={() => null} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
                      <Bar dataKey="macdHist" isAnimationActive={false}>
                        {data.historical.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.macdHist > 0 ? "#ef4444" : "#22c55e"} />
                        ))}
                      </Bar>
                      <Line type="monotone" dataKey="macdDif" stroke="#60a5fa" strokeWidth={1} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="macdDea" stroke="#facc15" strokeWidth={1} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* KDJ Chart */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3 px-2">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">KDJ (9,3,3)</div>
                  <div className="flex gap-3 text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400">K:{formatNumber(displayData?.kdjK)}</span>
                      <span className={getIndicatorTrend(displayData?.kdjK, prevData?.kdjK).color}>
                        {getIndicatorTrend(displayData?.kdjK, prevData?.kdjK).icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-purple-400">D:{formatNumber(displayData?.kdjD)}</span>
                      <span className={getIndicatorTrend(displayData?.kdjD, prevData?.kdjD).color}>
                        {getIndicatorTrend(displayData?.kdjD, prevData?.kdjD).icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-orange-400">J:{formatNumber(displayData?.kdjJ)}</span>
                      <span className={getIndicatorTrend(displayData?.kdjJ, prevData?.kdjJ).color}>
                        {getIndicatorTrend(displayData?.kdjJ, prevData?.kdjJ).icon}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-[120px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.historical} syncId="stockChart" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} hide orientation="right" />
                      <Tooltip content={() => null} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="kdjK" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="kdjD" stroke="#a855f7" strokeWidth={1} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="kdjJ" stroke="#f97316" strokeWidth={1} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}

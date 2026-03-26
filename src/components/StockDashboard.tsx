import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import { Search, Loader2, Star, Trash2, PlusCircle, X, Bookmark, Menu, MousePointer2, Maximize2 } from "lucide-react";
import { cn } from "../lib/utils";
import { StockHeader } from "./StockHeader";
import { StockChart } from "./StockChart";
import { IndicatorChart } from "./IndicatorChart";
import { Watchlist } from "./Watchlist";
import RealtimeQuote from "./RealtimeQuote";
import { formatNumber, getIndicatorTrend, getPriceTrend, Candlestick, CustomTooltip, IndicatorTooltip } from "./StockTooltips";

export default function StockDashboard() {
  const [symbol, setSymbol] = useState("2330.TW");
  const [searchInput, setSearchInput] = useState("2330.TW");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [interval, setInterval] = useState("1d");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [watchlist, setWatchlist] = useState<{symbol: string, name: string}[]>([]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [zoomRange, setZoomRange] = useState<{start: number, end: number} | null>(null);
  const [isWheelZoomEnabled, setIsWheelZoomEnabled] = useState(false);
  const cache = useRef(new Map<string, any>());
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const zoomRangeRef = useRef<{start: number, end: number} | null>(null);
  const isPanning = useRef(false);
  const startX = useRef(0);
  const startDist = useRef(0);

  // Keep zoomRangeRef in sync with zoomRange state
  useEffect(() => {
    zoomRangeRef.current = zoomRange;
  }, [zoomRange]);

  // Handle wheel zoom and panning
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!isWheelZoomEnabled || !data || !data.historical || data.historical.length === 0) return;
      
      // Prevent default page scroll
      e.preventDefault();

      const totalLen = data.historical.length;
      
      const currentZoom = zoomRangeRef.current;
      let currentStart = currentZoom ? currentZoom.start : 0;
      let currentEnd = currentZoom ? currentZoom.end : totalLen - 1;
      const currentRange = currentEnd - currentStart;
      
      // Zoom factor: 10% of current range
      const zoomFactor = Math.max(1, Math.floor(currentRange * 0.1));
      
      if (e.deltaY > 0) {
        // Zoom out
        currentStart = Math.max(0, currentStart - zoomFactor);
        currentEnd = Math.min(totalLen - 1, currentEnd + zoomFactor);
      } else {
        // Zoom in
        if (currentRange > 10) {
          currentStart = Math.min(currentEnd - 10, currentStart + zoomFactor);
          currentEnd = Math.max(currentStart + 10, currentEnd - zoomFactor);
        }
      }
      
      const nextRange = (currentStart <= 0 && currentEnd >= totalLen - 1) 
        ? null 
        : { start: Math.floor(currentStart), end: Math.floor(currentEnd) };
      
      setZoomRange(nextRange);
      zoomRangeRef.current = nextRange;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!data || !data.historical) return;
      isPanning.current = true;
      startX.current = e.clientX;
      container.style.cursor = 'grabbing';
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!data || !data.historical) return;
      if (e.touches.length === 1) {
        isPanning.current = true;
        startX.current = e.touches[0].clientX;
      } else if (e.touches.length === 2) {
        isPanning.current = false;
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        startDist.current = dist;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current || !data || !data.historical || data.historical.length === 0) return;
      
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;

      const deltaX = e.clientX - startX.current;
      const totalLen = data.historical.length;
      const currentZoom = zoomRangeRef.current;
      const currentRange = currentZoom ? (currentZoom.end - currentZoom.start) : totalLen - 1;
      const sensitivity = currentRange / containerWidth;
      const shift = Math.round(-deltaX * sensitivity);
      
      if (shift === 0) return;
      startX.current = e.clientX;
      
      setZoomRange(prev => {
        const current = prev || { start: 0, end: totalLen - 1 };
        let newStart = current.start + shift;
        let newEnd = current.end + shift;
        const rangeSize = current.end - current.start;
        
        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeSize;
        } else if (newEnd >= totalLen) {
          newEnd = totalLen - 1;
          newStart = newEnd - rangeSize;
        }
        
        if (isNaN(newStart) || isNaN(newEnd)) return prev;
        
        return { start: Math.floor(newStart), end: Math.floor(newEnd) };
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!data || !data.historical || data.historical.length === 0) return;
      
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;

      // Prevent page scroll during chart interaction
      e.preventDefault();

      if (e.touches.length === 1 && isPanning.current) {
        const deltaX = e.touches[0].clientX - startX.current;
        const totalLen = data.historical.length;
        const currentZoom = zoomRangeRef.current;
        const currentRange = currentZoom ? (currentZoom.end - currentZoom.start) : totalLen - 1;
        const sensitivity = currentRange / containerWidth;
        const shift = Math.round(-deltaX * sensitivity);
        
      if (shift !== 0) {
        startX.current = e.touches[0].clientX;
        const currentZoom = zoomRangeRef.current;
        const current = currentZoom || { start: 0, end: totalLen - 1 };
        let newStart = current.start + shift;
        let newEnd = current.end + shift;
        const rangeSize = current.end - current.start;
        if (newStart < 0) { newStart = 0; newEnd = rangeSize; }
        else if (newEnd >= totalLen) { newEnd = totalLen - 1; newStart = newEnd - rangeSize; }
        
        if (!isNaN(newStart) && !isNaN(newEnd)) {
          const nextRange = { start: Math.floor(newStart), end: Math.floor(newEnd) };
          setZoomRange(nextRange);
          zoomRangeRef.current = nextRange;
        }
      }
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const deltaDist = dist - startDist.current;
        if (Math.abs(deltaDist) > 5) {
          const totalLen = data.historical.length;
          const currentZoom = zoomRangeRef.current;
          const current = currentZoom || { start: 0, end: totalLen - 1 };
          const range = current.end - current.start;
          const zoomAmount = Math.max(1, Math.floor(range * 0.05));
          let newStart = current.start;
          let newEnd = current.end;
          
          if (deltaDist > 0) {
            newStart = Math.min(newEnd - 10, newStart + zoomAmount);
            newEnd = Math.max(newStart + 10, newEnd - zoomAmount);
          } else {
            newStart = Math.max(0, newStart - zoomAmount);
            newEnd = Math.min(totalLen - 1, newEnd + zoomAmount);
          }
          if (!isNaN(newStart) && !isNaN(newEnd)) {
            const nextRange = { start: Math.floor(newStart), end: Math.floor(newEnd) };
            setZoomRange(nextRange);
            zoomRangeRef.current = nextRange;
          }
          startDist.current = dist;
        }
      }
    };

    const handleEnd = () => {
      isPanning.current = false;
      container.style.cursor = 'crosshair';
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleEnd);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleEnd);
    };
  }, [data, isWheelZoomEnabled]);

  const applyZoomPreset = (bars: number) => {
    if (!data || !data.historical || data.historical.length === 0) return;
    const total = data.historical.length;
    let nextRange = null;
    if (bars < total) {
      const actualBars = Math.max(10, bars);
      nextRange = { start: Math.max(0, total - actualBars), end: total - 1 };
    }
    setZoomRange(nextRange);
    zoomRangeRef.current = nextRange;
  };

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("stock_watchlist");
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse watchlist");
      }
    }
  }, []);

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem("stock_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (s: string, n: string) => {
    const exists = watchlist.find(item => item.symbol === s);
    if (exists) {
      setWatchlist(watchlist.filter(item => item.symbol !== s));
    } else {
      if (watchlist.length >= 10) {
        alert("觀察清單最多只能存放 10 檔股票喔！");
        return;
      }
      setWatchlist([...watchlist, { symbol: s, name: n }]);
    }
  };
  
  // Fetch suggestions as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmedInput = searchInput.trim();
      if (trimmedInput.length >= 1 && showSuggestions) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedInput)}`);
          if (res.ok) {
            const apiSuggestions = await res.json();
            // Ensure only Taiwan stocks are included
            const combined: any[] = [];
            apiSuggestions.forEach((apiS: any) => {
              const isTaiwan = apiS.symbol.endsWith('.TW') || apiS.symbol.endsWith('.TWO');
              if (isTaiwan && !combined.some(s => s.symbol === apiS.symbol)) {
                combined.push(apiS);
              }
            });
            setSuggestions(combined.slice(0, 10));
          } else {
            setSuggestions([]);
          }
        } catch (err) {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, showSuggestions]);

  const [activeMAs, setActiveMAs] = useState({
    ma5: true,
    ma10: false,
    ma20: true,
    ma60: true,
    bollinger: true,
  });

  const fetchData = async (stockSymbol: string, queryInterval: string) => {
    const cacheKey = `${stockSymbol}_${queryInterval}`;
    if (cache.current.has(cacheKey)) {
      setData(cache.current.get(cacheKey));
      setHoveredIndex(null);
      setZoomRange(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stock/${stockSymbol}?interval=${queryInterval}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch data");
      }
      const json = await res.json();
      
      if (!json.historical || json.historical.length === 0) {
        throw new Error("此區間暫無歷史資料");
      }
      
      // Prepare data for Recharts
      const formattedData = json.historical.map((d: any) => ({
        ...d,
        candle: [d.low, d.high], // For the custom candlestick shape
      }));
      
      const result = { ...json, historical: formattedData };
      cache.current.set(cacheKey, result);
      
      // Update symbol if backend resolved it differently
      if (json.symbol && json.symbol !== stockSymbol) {
        cache.current.set(`${json.symbol}_${queryInterval}`, result);
        setSymbol(json.symbol);
        setSearchInput(json.symbol);
      }
      
      setData(result);
      setHoveredIndex(null);
      setZoomRange(null);
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
    const query = searchInput.trim();
    if (query) {
      // 1. If suggestions are visible, pick the first one
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
        return;
      }

      // 2. Fallback to raw query with .TW if it's 4 digits
      let finalQuery = query.toUpperCase();
      if (/^\d{4}$/.test(finalQuery)) {
        finalQuery += ".TW";
      }

      setSearchInput(finalQuery);
      setSymbol(finalQuery);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setSearchInput(suggestion.symbol);
    setSymbol(suggestion.symbol);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleMouseMove = useCallback((e: any) => {
    if (!data?.historical || data.historical.length === 0) return;
    
    // Recharts provides activeTooltipIndex which is the index in the data array passed to the chart.
    // Since we pass the sliced data (processedHistorical), this index is relative.
    if (e && typeof e.activeTooltipIndex === 'number') {
      const relativeIndex = e.activeTooltipIndex;
      const currentZoom = zoomRangeRef.current;
      const absoluteIndex = currentZoom ? currentZoom.start + relativeIndex : relativeIndex;
      
      // Safety check for bounds
      const safeIndex = Math.max(0, Math.min(absoluteIndex, data.historical.length - 1));
      setHoveredIndex(safeIndex);
    } else if (e && e.activePayload && e.activePayload.length > 0) {
      // Fallback to payload matching if index is missing
      const hoveredData = e.activePayload[0].payload;
      const absoluteIndex = data.historical.findIndex((d: any) => d.date === hoveredData.date);
      if (absoluteIndex !== -1) {
        setHoveredIndex(absoluteIndex);
      }
    }
  }, [data?.historical]);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  // Safely slice historical data based on zoomRange
  const processedHistorical = useMemo(() => {
    if (!data?.historical || data.historical.length === 0) return [];
    if (!zoomRange) return data.historical;
    
    const { start, end } = zoomRange;
    const totalLen = data.historical.length;
    
    // Safety checks for invalid indices or NaN
    if (isNaN(start) || isNaN(end) || start < 0 || end >= totalLen || start > end) {
      return data.historical;
    }
    
    const sliced = data.historical.slice(start, end + 1);
    // Ensure we always have at least 2 points to render a chart
    return sliced.length > 0 ? sliced : data.historical;
  }, [data?.historical, zoomRange]);

  const displayIndex = useMemo(() => {
    if (!data?.historical || data.historical.length === 0) return 0;
    if (hoveredIndex !== null) {
      return Math.max(0, Math.min(hoveredIndex, data.historical.length - 1));
    }
    // Default to last visible index if zoomed
    if (zoomRange) {
      return Math.min(zoomRange.end, data.historical.length - 1);
    }
    return data.historical.length - 1;
  }, [data?.historical, hoveredIndex, zoomRange]);

  const displayData = data?.historical ? data.historical[displayIndex] : null;
  const prevData = data?.historical && displayIndex > 0 ? data.historical[displayIndex - 1] : null;

  // Calculate display values based on hover
  const isHovering = hoveredIndex !== null;
  const priceToDisplay = isHovering ? displayData?.close : (zoomRange ? displayData?.close : data?.regularMarketPrice);
  const changeToDisplay = isHovering || zoomRange
    ? (prevData ? (displayData?.close || 0) - (prevData.close || 0) : 0) 
    : data?.regularMarketChange;
  const percentToDisplay = isHovering || zoomRange
    ? (prevData ? (((displayData?.close || 0) - (prevData.close || 0)) / (prevData.close || 1) * 100) : 0) 
    : data?.regularMarketChangePercent;
  const trendColor = getPriceTrend(changeToDisplay, 0).color;

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
    <div className="min-h-screen bg-black text-zinc-100 p-4 font-sans selection:bg-blue-500/30 relative overflow-hidden">
      {/* Background Decoration */}
      <img 
        src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/51.png" 
        alt="" 
        className="fixed -top-20 -right-20 w-96 h-96 object-contain opacity-5 pointer-events-none rotate-12"
        referrerPolicy="no-referrer"
      />
      
      <div className="max-w-7xl mx-auto space-y-4 relative z-10">
        
        <StockHeader
          symbol={symbol}
          setSymbol={setSymbol}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          interval={interval}
          setInterval={setInterval}
          watchlist={watchlist}
          showWatchlist={showWatchlist}
          setShowWatchlist={setShowWatchlist}
          handleSearch={handleSearch}
          handleSelectSuggestion={handleSelectSuggestion}
        />
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center h-[600px] gap-4">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-blue-500/20" />
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/51.png" 
                alt="Loading Dugtrio" 
                className="w-10 h-10 object-contain absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-zinc-400 animate-pulse font-mono tracking-widest">三地鼠正在挖掘數據中...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[500px] gap-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl backdrop-blur-sm animate-in fade-in zoom-in duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
              <img 
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/50.png" 
                alt="Diglett" 
                className="w-32 h-32 object-contain relative grayscale opacity-60"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-zinc-200">
                {error === "此區間暫無歷史資料" ? "暫無歷史資料" : "哎呀！地鼠找不到這檔股票"}
              </h3>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto">
                {error === "此區間暫無歷史資料" 
                  ? `「${symbol}」在目前選擇的時間區間內沒有可用的歷史資料，請嘗試切換其他區間。`
                  : error.includes("找不到該股票資料") ? error : `搜尋的代號「${symbol}」可能不存在、已下市，或是輸入格式有誤。`
                }
              </p>
              {error !== "此區間暫無歷史資料" && !error.includes("找不到該股票資料") && (
                <p className="text-red-400/80 text-xs mt-2 font-mono">{error}</p>
              )}
            </div>
            <button 
              onClick={() => {
                if (error === "此區間暫無歷史資料") {
                  setInterval("1d");
                  setError("");
                } else {
                  setSearchInput("2330.TW");
                  setSymbol("2330.TW");
                  setError("");
                }
              }}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full text-sm font-medium transition-all border border-zinc-700"
            >
              {error === "此區間暫無歷史資料" ? "切換回日線" : "返回台積電 (2330)"}
            </button>
          </div>
        ) : data && displayData ? (
          <div className="relative">
            {/* Watchlist Overlay Menu */}
            <Watchlist
              showWatchlist={showWatchlist}
              setShowWatchlist={setShowWatchlist}
              watchlist={watchlist}
              symbol={symbol}
              setSymbol={setSymbol}
              setSearchInput={setSearchInput}
              toggleWatchlist={toggleWatchlist}
            />

            <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-700">
              {/* Main Content Area (Full Width) */}
              <div className="space-y-4">
                {/* Stock Info Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-zinc-900/50 p-4 sm:p-6 rounded-xl border border-zinc-800 backdrop-blur-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        {data.shortName || data.longName || symbol}
                      </h1>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-xs sm:text-sm font-mono">
                        {data.symbol.replace('.TW', '')}
                      </span>
                      <button 
                        onClick={() => toggleWatchlist(symbol, data.shortName || data.longName || symbol)}
                        className={cn(
                          "p-1 rounded-full transition-all",
                          watchlist.some(item => item.symbol === symbol)
                            ? "text-yellow-400"
                            : "text-zinc-600 hover:text-zinc-400"
                        )}
                      >
                        <Star className={cn("w-5 h-5", watchlist.some(item => item.symbol === symbol) && "fill-yellow-400")} />
                      </button>
                    </div>
                    <p className="text-zinc-500 text-xs sm:text-sm">Yahoo Finance Real-time Data</p>
                  </div>
                  
                  <div className="flex items-end justify-between sm:justify-end gap-6 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <div className={cn("text-3xl sm:text-4xl font-bold font-mono tracking-tighter transition-colors duration-200", trendColor)}>
                        {formatNumber(priceToDisplay)}
                      </div>
                      <div className={cn("text-xs sm:text-sm font-medium flex items-center justify-start sm:justify-end gap-1 transition-colors duration-200", trendColor)}>
                        <span>{changeToDisplay > 0 ? "+" : ""}{formatNumber(changeToDisplay)}</span>
                        <span>({percentToDisplay > 0 ? "+" : ""}{formatNumber(percentToDisplay)}%)</span>
                      </div>
                    </div>
                    <div className="h-10 sm:h-12 w-px bg-zinc-800"></div>
                    <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs">
                      <span className="text-zinc-500">成交量</span>
                      <span className="text-zinc-100 font-mono">{formatNumber(displayData?.volume / 1000, 0)}張</span>
                      <span className="text-zinc-500">日期</span>
                      <span className="text-zinc-100 font-mono">{displayData?.date}</span>
                    </div>
                  </div>
                </div>

                {/* Charts Area */}
                <div className="space-y-4 relative group" ref={chartContainerRef}>
                  {/* Zoom Controls Overlay */}
                  <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-lg p-1 flex flex-col gap-1 shadow-2xl">
                      <button 
                        onClick={() => setIsWheelZoomEnabled(!isWheelZoomEnabled)}
                        className={cn(
                          "p-2 rounded-md transition-all",
                          isWheelZoomEnabled ? "bg-blue-500 text-white" : "text-zinc-400 hover:bg-zinc-800"
                        )}
                        title={isWheelZoomEnabled ? "關閉滾輪縮放" : "開啟滾輪縮放"}
                      >
                        <MousePointer2 size={18} />
                      </button>
                      <button 
                        onClick={() => setZoomRange(null)}
                        className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-md transition-all"
                        title="重設縮放"
                      >
                        <Maximize2 size={18} />
                      </button>
                    </div>
                  </div>

                  {interval === "1m" ? (
                    <RealtimeQuote data={data} symbol={symbol} />
                  ) : (
                    <div className="space-y-4 touch-none">
                      <StockChart
                        data={{ ...data, historical: processedHistorical }}
                        activeMAs={activeMAs}
                        setActiveMAs={setActiveMAs}
                        maColors={maColors}
                        displayData={displayData}
                        prevData={prevData}
                        handleMouseMove={handleMouseMove}
                        handleMouseLeave={handleMouseLeave}
                      />
                      <IndicatorChart
                        type="volume"
                        data={{ ...data, historical: processedHistorical }}
                        displayData={displayData}
                        handleMouseMove={handleMouseMove}
                        handleMouseLeave={handleMouseLeave}
                      />
                      <IndicatorChart
                        type="kdj"
                        data={{ ...data, historical: processedHistorical }}
                        displayData={displayData}
                        handleMouseMove={handleMouseMove}
                        handleMouseLeave={handleMouseLeave}
                      />
                    </div>
                  )}

                  {/* Range Selector Bar */}
                  <div className="flex items-center justify-between gap-4 px-2">
                    <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                      {[
                        { label: '1M', bars: 20 },
                        { label: '3M', bars: 60 },
                        { label: '6M', bars: 120 },
                        { label: '1Y', bars: 240 },
                        { label: 'ALL', bars: 9999 }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => applyZoomPreset(preset.bars)}
                          className="px-3 py-1 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-all uppercase tracking-tighter"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-4 text-[10px] text-zinc-500 font-mono">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                        <span>拖曳平移</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500/50" />
                        <span>雙指縮放</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
    </div>
  );
}

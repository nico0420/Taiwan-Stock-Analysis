import React from 'react';
import { Search, Star, Menu, Bookmark } from 'lucide-react';
import { cn } from '../lib/utils';

export const StockHeader = ({ 
  symbol, 
  searchInput, 
  setSearchInput, 
  handleSearch, 
  showSuggestions, 
  suggestions, 
  handleSelectSuggestion, 
  setShowSuggestions,
  viewMode,
  setViewMode,
  interval,
  setInterval,
  watchlist,
  setShowWatchlist,
  showWatchlist
}: any) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-800">
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <img 
          src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/51.png" 
          alt="Dugtrio" 
          className="w-8 h-8 object-contain"
          referrerPolicy="no-referrer"
        />
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">股市三地鼠</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
        {/* Main View Mode Toggle */}
        <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800 w-full sm:w-auto">
          <button
            onClick={() => setViewMode("realtime")}
            className={cn(
              "flex-1 sm:flex-none px-4 py-1.5 text-sm rounded-md transition-all font-medium",
              viewMode === "realtime"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            )}
          >
            即時
          </button>
          <button
            onClick={() => setViewMode("kline")}
            className={cn(
              "flex-1 sm:flex-none px-4 py-1.5 text-sm rounded-md transition-all font-medium",
              viewMode === "kline"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            )}
          >
            K線
          </button>
        </div>

        {/* K-line Intervals - Only visible when in kline mode */}
        {viewMode === "kline" && (
          <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800/50 w-full sm:w-auto overflow-x-auto">
            {[
              { label: "5分", value: "5m" },
              { label: "60分", value: "60m" },
              { label: "日線", value: "1d" },
              { label: "週線", value: "1wk" },
              { label: "月線", value: "1mo" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setInterval(opt.value)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-all whitespace-nowrap",
                  interval === opt.value
                    ? "bg-zinc-700 text-white font-medium"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    <div className="flex items-center gap-3 w-full sm:w-auto">
      <button
        onClick={() => setShowWatchlist(!showWatchlist)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium",
          showWatchlist 
            ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
            : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700"
        )}
      >
        <Menu className="w-4 h-4" />
        <span>選單</span>
        {watchlist.length > 0 && (
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
            {watchlist.length}
          </span>
        )}
      </button>

      <div className="relative flex-1 sm:w-64">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchInput}
            onFocus={(e) => {
              setSearchInput("");
              setShowSuggestions(true);
            }}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="輸入股票代號 (如: 2330)"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-600"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <button type="submit" className="hidden">搜尋</button>
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0 text-left"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-zinc-100">{s.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{s.exchange}</span>
                </div>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{s.symbol}</span>
              </button>
            ))}
          </div>
        )}
        
        {showSuggestions && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowSuggestions(false)}
          />
        )}
      </div>
    </div>
  </div>
);

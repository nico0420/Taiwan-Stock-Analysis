import React from 'react';
import { Trash2, Bookmark, Star, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const Watchlist = ({ 
  watchlist, 
  toggleWatchlist, 
  symbol, 
  setSymbol, 
  setSearchInput, 
  setShowWatchlist,
  showWatchlist
}: any) => {
  if (!showWatchlist) return null;
  
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={() => setShowWatchlist(false)}
      />
      <div className="fixed top-0 left-0 h-full w-full sm:w-80 bg-zinc-900 border-r border-zinc-800 p-6 shadow-2xl z-50 animate-in slide-in-from-left duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Bookmark className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100">我的觀察清單</h3>
          </div>
          <button 
            onClick={() => setShowWatchlist(false)}
            className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs text-zinc-500 mb-2">
            <span>儲存上限</span>
            <span>{watchlist.length} / 10</span>
          </div>
          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-500" 
              style={{ width: `${(watchlist.length / 10) * 100}%` }}
            />
          </div>
        </div>
        
        {watchlist.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
              <Star className="w-8 h-8 text-zinc-700" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">尚未加入任何股票</p>
              <p className="text-xs text-zinc-600 mt-1">點擊股票名稱旁的星號加入</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar max-h-[calc(100vh-250px)]">
            {watchlist.map((item: any) => (
              <div 
                key={item.symbol}
                className={cn(
                  "group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                  symbol === item.symbol 
                    ? "bg-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]" 
                    : "bg-zinc-800/30 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50"
                )}
                onClick={() => {
                  setSymbol(item.symbol);
                  setSearchInput(item.symbol);
                  setShowWatchlist(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="text-base font-bold text-zinc-100">{item.symbol.split('.')[0]}</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[140px]">{item.name}</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlist(item.symbol, item.name);
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

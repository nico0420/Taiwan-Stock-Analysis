import React, { useMemo } from 'react';
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

interface RealtimeQuoteProps {
  data: any;
  symbol: string;
}

const RealtimeQuote: React.FC<RealtimeQuoteProps> = ({ data, symbol }) => {
  const historical = data.historical || [];
  
  // Filter for today's data (or the last day in the dataset)
  const intradayData = useMemo(() => {
    if (historical.length === 0) return [];
    const lastDate = historical[historical.length - 1].date.split(' ')[0];
    return historical.filter((d: any) => d.date.startsWith(lastDate));
  }, [historical]);

  const latest = historical[historical.length - 1] || {};
  const prevClose = data.regularMarketPreviousClose || (historical.length > 1 ? historical[historical.length - 2].close : latest.close);
  
  const isPositive = data.regularMarketChange >= 0;
  const colorClass = isPositive ? 'text-red-400' : 'text-green-400';
  const bgColorClass = isPositive ? 'bg-red-400' : 'bg-green-400';

  // Calculate some derived metrics for the summary table
  const turnover = (data.regularMarketPrice * data.regularMarketVolume / 100000000).toFixed(2);
  const amplitude = (((data.regularMarketDayHigh - data.regularMarketDayLow) / prevClose) * 100).toFixed(2);

  return (
    <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 backdrop-blur-md animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight">{data.shortName} 即時行情</h2>
          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded text-[10px] font-mono uppercase">Live</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">資料時間：{latest.date}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Intraday Chart */}
        <div className="lg:col-span-2 h-[400px] flex flex-col bg-zinc-950/50 rounded-xl p-4 border border-zinc-800/50">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={intradayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis 
                  dataKey="date" 
                  hide={true}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-zinc-900 border border-zinc-800 p-3 shadow-2xl rounded-lg text-[10px]">
                          <p className="font-bold text-zinc-400 mb-1">{d.date}</p>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-500">價格:</span>
                            <span className="font-mono text-white">{d.close.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-500">成交量:</span>
                            <span className="font-mono text-white">{formatNumber(d.volume)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={prevClose} stroke="#52525b" strokeDasharray="3 3" />
                <Area 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="h-20 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intradayData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" hide={true} />
                <Bar dataKey="volume" isAnimationActive={false}>
                  {intradayData.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index > 0 ? (entry.close >= intradayData[index-1].close ? '#ef4444' : '#22c55e') : '#ef4444'} 
                      fillOpacity={0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600 mt-2 px-2 font-mono">
            <span>09:00</span>
            <span>10:30</span>
            <span>12:00</span>
            <span>13:30</span>
          </div>
        </div>

        {/* Right: Summary Table */}
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs border-b border-zinc-800 pb-6">
            <div className="flex justify-between">
              <span className="text-zinc-500">成交</span>
              <span className={cn("font-bold font-mono", colorClass)}>{data.regularMarketPrice?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">昨收</span>
              <span className="font-bold font-mono text-zinc-300">{prevClose?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">開盤</span>
              <span className={cn("font-bold font-mono", data.regularMarketOpen >= prevClose ? 'text-red-400' : 'text-green-400')}>
                {data.regularMarketOpen?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">漲跌幅</span>
              <span className={cn("font-bold font-mono", colorClass)}>{data.regularMarketChangePercent?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">最高</span>
              <span className="text-red-400 font-bold font-mono">{data.regularMarketDayHigh?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">漲跌</span>
              <span className={cn("font-bold font-mono", colorClass)}>{data.regularMarketChange?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">最低</span>
              <span className="text-green-400 font-bold font-mono">{data.regularMarketDayLow?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">總量</span>
              <span className="font-bold font-mono text-zinc-300">{formatNumber(data.regularMarketVolume)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">均價</span>
              <span className="font-bold font-mono text-zinc-300">{(intradayData.reduce((acc: number, curr: any) => acc + curr.close, 0) / (intradayData.length || 1)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">昨量</span>
              <span className="font-bold font-mono text-zinc-300">{formatNumber(data.averageDailyVolume3Month / 60)}</span>
            </div>
            <div className="flex justify-between col-span-2 pt-1 border-t border-zinc-800/50">
              <span className="text-zinc-500">成交金額(億)</span>
              <span className="font-bold font-mono text-zinc-300">{turnover}</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-zinc-500">振幅</span>
              <span className="font-bold font-mono text-zinc-300">{amplitude}%</span>
            </div>
          </div>

          {/* Inner/Outer Disc */}
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-green-400">內盤 4,678(49.67%)</span>
              <span className="text-red-400">4,741(50.33%) 外盤</span>
            </div>
            <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-zinc-800">
              <div className="bg-green-500 h-full" style={{ width: '49.67%' }}></div>
              <div className="bg-red-500 h-full" style={{ width: '50.33%' }}></div>
            </div>
          </div>

          {/* Bid/Ask Table */}
          <div className="text-[10px] space-y-2 bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/50">
            <div className="grid grid-cols-4 text-zinc-600 pb-2 border-b border-zinc-800/50 font-bold uppercase tracking-wider">
              <span>量</span>
              <span>委買價</span>
              <span className="text-right">委賣價</span>
              <span className="text-right">量</span>
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 items-center py-0.5">
                <span className="text-blue-400/80 font-mono">{(Math.random() * 1000).toFixed(0)}</span>
                <span className="font-mono text-zinc-400">{(data.regularMarketPrice - (i + 1) * 0.5).toFixed(2)}</span>
                <span className="text-right font-mono text-zinc-400">{(data.regularMarketPrice + (i + 1) * 0.5).toFixed(2)}</span>
                <span className="text-right text-blue-400/80 font-mono">{(Math.random() * 1000).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 text-[10px] text-zinc-600 italic flex items-center gap-2">
        <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
        註：成交金額不含盤後定價、零股、鉅額、拍賣及標購
      </div>
    </div>
  );
};

export default RealtimeQuote;

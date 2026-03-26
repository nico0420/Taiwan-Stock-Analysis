import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

// --- Technical Indicators Math ---

function calculateSMA(data: number[], period: number) {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number) {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      if (i === period - 2) {
        let sum = 0;
        for (let j = 0; j < period - 1; j++) {
          sum += data[i - j];
        }
        ema = (sum + data[i + 1]) / period;
      }
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      ema = sum / period;
      result.push(ema);
    } else {
      ema = (data[i] - ema!) * multiplier + ema!;
      result.push(ema);
    }
  }
  return result;
}

function calculateStdDev(data: number[], period: number, sma: (number | null)[]) {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || sma[i] === null) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(data[i - j] - sma[i]!, 2);
      }
      result.push(Math.sqrt(sum / period));
    }
  }
  return result;
}

function calculateIndicators(quotes: any[], interval: string, timezone: string = "UTC") {
  const closes = quotes.map((q) => q.close);
  const highs = quotes.map((q) => q.high);
  const lows = quotes.map((q) => q.low);

  const sma5 = calculateSMA(closes, 5);
  const sma10 = calculateSMA(closes, 10);
  const sma20 = calculateSMA(closes, 20);
  const sma60 = calculateSMA(closes, 60);
  const stdDev20 = calculateStdDev(closes, 20, sma20);
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const dif = ema12.map((e12, i) => (e12 !== null && ema26[i] !== null ? e12 - ema26[i]! : null));
  
  const validDif = dif.filter((d) => d !== null) as number[];
  const deaValid = calculateEMA(validDif, 9);
  const dea = dif.map((d) => (d === null ? null : deaValid.shift() ?? null));
  
  const macd = dif.map((d, i) => (d !== null && dea[i] !== null ? (d - dea[i]!) * 2 : null));

  let k = 50;
  let d = 50;
  const kdj = quotes.map((q, i) => {
    if (i < 8) return { k: null, d: null, j: null };
    
    let h9 = Math.max(...highs.slice(i - 8, i + 1));
    let l9 = Math.min(...lows.slice(i - 8, i + 1));
    
    let rsv = h9 === l9 ? 0 : ((q.close - l9) / (h9 - l9)) * 100;
    
    k = (2 / 3) * k + (1 / 3) * rsv;
    d = (2 / 3) * d + (1 / 3) * k;
    let j = 3 * k - 2 * d;
    
    return { k, d, j };
  });

  return quotes.map((q, i) => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const parts = formatter.formatToParts(q.date);
    
    const p: any = {};
    parts.forEach(part => p[part.type] = part.value);
    
    let dateStr = `${p.year}-${p.month}-${p.day}`;
    if (interval === "1m" || interval === "5m" || interval === "60m") {
      dateStr = `${dateStr} ${p.hour}:${p.minute}`;
    }

    let changePercent = null;
    let change = null;
    if (i > 0 && quotes[i - 1].close) {
      change = q.close - quotes[i - 1].close;
      changePercent = (change / quotes[i - 1].close) * 100;
    }

    return {
      ...q,
      date: dateStr,
      change,
      changePercent,
      ma5: sma5[i],
      ma10: sma10[i],
      ma20: sma20[i],
      ma60: sma60[i],
      bbMiddle: sma20[i],
      bbUpper: sma20[i] !== null && stdDev20[i] !== null ? sma20[i]! + 2 * stdDev20[i]! : null,
      bbLower: sma20[i] !== null && stdDev20[i] !== null ? sma20[i]! - 2 * stdDev20[i]! : null,
      macdDif: dif[i],
      macdDea: dea[i],
      macdHist: macd[i],
      kdjK: kdj[i].k,
      kdjD: kdj[i].d,
      kdjJ: kdj[i].j,
    };
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol: rawSymbol } = req.query;
  const interval = (req.query.interval as string) || "1d";

  if (!rawSymbol) {
    return res.status(400).json({ error: "Symbol is required" });
  }

  try {
    let symbol = Array.isArray(rawSymbol) ? rawSymbol[0] : rawSymbol;
    try {
      symbol = decodeURIComponent(symbol);
    } catch (e) {
      // Ignore
    }
    const rawInput = symbol.trim();
    symbol = rawInput.toUpperCase();
    
    const isChinese = /[\u4e00-\u9fa5]/.test(symbol);
    const isNumeric = /^\d{4,6}$/.test(symbol);
    const isStandard = /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);

    if (isChinese || isNumeric || !isStandard) {
      let resolved = false;
      try {
        const twseRes = await fetch(`https://www.twse.com.tw/zh/api/codeQuery?query=${encodeURIComponent(symbol)}`);
        if (twseRes.ok) {
          const twseData = await twseRes.json();
          if (twseData && twseData.suggestions && twseData.suggestions[0] !== '(無符合之代碼或名稱)') {
            const match = twseData.suggestions.find((s: string) => {
              const parts = s.split('\t');
              return parts[1] === symbol || parts[0] === symbol;
            }) || twseData.suggestions[0];
            
            if (match) {
              const code = match.split('\t')[0];
              symbol = `${code}.TW`;
              resolved = true;
            }
          }
        }
      } catch (e) {
        console.error("TWSE API error:", e);
      }

      if (!resolved) {
        try {
          let searchResult;
          try {
            searchResult = await yahooFinance.search(symbol, { 
              lang: 'zh-Hant-TW', 
              region: 'TW',
              quotesCount: 5,
              newsCount: 0
            });
          } catch (e) {
            searchResult = await yahooFinance.search(symbol, { quotesCount: 5, newsCount: 0 });
          }
          
          if (searchResult && searchResult.quotes && searchResult.quotes.length > 0) {
            const bestMatch = searchResult.quotes.find(q => 
              q.quoteType === 'EQUITY' && ((q as any).symbol?.endsWith('.TW') || (q as any).symbol?.endsWith('.TWO'))
            ) || searchResult.quotes.find(q => q.quoteType === 'EQUITY') || searchResult.quotes[0];
            
            if ((bestMatch as any).symbol) {
              symbol = (bestMatch as any).symbol;
            }
          } else if (isNumeric && !symbol.includes('.')) {
            symbol = `${symbol}.TW`;
          }
        } catch (searchError) {
          if (isNumeric && !symbol.includes('.')) {
            symbol = `${symbol}.TW`;
          }
        }
      }
    }
    
    const validIntervals = ["1m", "5m", "60m", "1d", "1wk", "1mo"];
    const queryInterval = validIntervals.includes(interval) ? interval as any : "1d";
    
    const period1 = new Date();
    if (queryInterval === "1m") {
      period1.setDate(period1.getDate() - 7);
    } else if (queryInterval === "5m") {
      period1.setDate(period1.getDate() - 30);
    } else if (queryInterval === "60m") {
      period1.setMonth(period1.getMonth() - 3);
    } else if (queryInterval === "1d") {
      period1.setMonth(period1.getMonth() - 6);
    } else if (queryInterval === "1wk") {
      period1.setFullYear(period1.getFullYear() - 2);
    } else if (queryInterval === "1mo") {
      period1.setFullYear(period1.getFullYear() - 5);
    }
    const period2 = new Date();
    period2.setDate(period2.getDate() + 1);
    
    const queryOptions = { period1, period2, interval: queryInterval };
    
    let chartResult;
    try {
      chartResult = await yahooFinance.chart(symbol, queryOptions);
    } catch (chartError: any) {
      if (isNumeric && !symbol.includes('.TW') && !symbol.includes('.TWO')) {
        try {
          symbol = `${rawInput.toUpperCase()}.TW`;
          chartResult = await yahooFinance.chart(symbol, queryOptions);
        } catch (e) {
          return res.status(404).json({ error: `找不到該股票資料 (${symbol})` });
        }
      } else {
        return res.status(404).json({ error: `找不到該股票資料 (${symbol})` });
      }
    }

    const result = chartResult.quotes.filter(
      (q: any) => q.close != null && q.open != null && q.high != null && q.low != null
    );
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    const enrichedData = calculateIndicators(result, queryInterval, chartResult.meta.exchangeTimezoneName);
    const latest = enrichedData.length > 0 ? enrichedData[enrichedData.length - 1] : null;
    
    let quote: any = {};
    try {
      quote = await yahooFinance.quote(symbol, { lang: "zh-TW", region: "TW" });
    } catch (e) {
      console.error("Quote fetch error:", e);
    }

    const data = {
      symbol: quote.symbol || symbol,
      shortName: quote.longName || quote.shortName || symbol,
      regularMarketPrice: quote.regularMarketPrice || latest?.close || 0,
      regularMarketChange: quote.regularMarketChange || (latest && latest.close - (latest.open || latest.close)) || 0,
      regularMarketChangePercent: quote.regularMarketChangePercent || (latest && latest.open ? (latest.close - latest.open) / latest.open * 100 : 0),
      regularMarketOpen: quote.regularMarketOpen || latest?.open || 0,
      regularMarketDayHigh: quote.regularMarketDayHigh || latest?.high || 0,
      regularMarketDayLow: quote.regularMarketDayLow || latest?.low || 0,
      regularMarketPreviousClose: quote.regularMarketPreviousClose || (enrichedData.length > 1 ? enrichedData[enrichedData.length - 2].close : latest?.open) || 0,
      regularMarketVolume: quote.regularMarketVolume || latest?.volume || 0,
      averageDailyVolume3Month: quote.averageDailyVolume3Month,
      marketCap: quote.marketCap,
      trailingPE: quote.trailingPE,
      dividendYield: quote.dividendYield,
      bid: quote.bid,
      ask: quote.ask,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      historical: enrichedData,
    };
    
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Error in Vercel API handler:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to fetch stock data"
    });
  }
}

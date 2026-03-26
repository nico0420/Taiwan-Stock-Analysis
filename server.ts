import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
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
    };
    if (interval === "60m" || interval === "1m" || interval === "5m") {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }
    
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const parts = formatter.formatToParts(q.date);
    
    let year, month, day, hour, minute;
    for (const part of parts) {
      if (part.type === 'year') year = part.value;
      if (part.type === 'month') month = part.value;
      if (part.type === 'day') day = part.value;
      if (part.type === 'hour') hour = part.value;
      if (part.type === 'minute') minute = part.value;
    }
    
    let dateStr = `${year}-${month}-${day}`;
    if (interval === "60m" || interval === "1m" || interval === "5m") {
      dateStr = `${dateStr} ${hour}:${minute}`;
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

async function createApp() {
  const app = express();
  
  app.use(express.json());

  app.get("/api/search", async (req, res) => {
    try {
      let query = (req.query.q as string || "").trim();
      try {
        query = decodeURIComponent(query);
      } catch (e) {
        // Ignore decoding errors
      }
      
      if (!query || query.length < 1) return res.json([]);

      const isChinese = /[\u4e00-\u9fa5]/.test(query);
      const isNumeric = /^\d+$/.test(query);
      
      let suggestions: any[] = [];

      // Try TWSE API first for Chinese or numeric queries
      if (isChinese || isNumeric) {
        try {
          const twseRes = await fetch(`https://www.twse.com.tw/zh/api/codeQuery?query=${encodeURIComponent(query)}`);
          if (twseRes.ok) {
            const twseData = await twseRes.json();
            if (twseData && twseData.suggestions && twseData.suggestions[0] !== '(無符合之代碼或名稱)') {
              suggestions = twseData.suggestions.map((s: string) => {
                const parts = s.split('\t');
                return {
                  symbol: `${parts[0]}.TW`,
                  name: parts[1],
                  exchange: 'TWSE',
                  type: 'EQUITY'
                };
              });
            }
          }
        } catch (e) {
          console.error("TWSE API search error:", e);
        }
      }

      // Fallback to Yahoo Finance if TWSE API didn't return anything or it's not Chinese/numeric
      if (suggestions.length === 0) {
        let searchResult;
        try {
          // Try with Taiwan specific parameters first
          searchResult = await yahooFinance.search(query, { 
            lang: 'zh-Hant-TW', 
            region: 'TW',
            quotesCount: 10,
            newsCount: 0 
          });
        } catch (e) {
          try {
            // Fallback to simple search
            searchResult = await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 });
          } catch (e2) {
            return res.json([]);
          }
        }

        suggestions = (searchResult.quotes || [])
          .filter(q => 
            q.quoteType === 'EQUITY' && 
            (q.symbol.endsWith('.TW') || q.symbol.endsWith('.TWO'))
          )
          .map(q => ({
            symbol: q.symbol,
            name: (q as any).longname || (q as any).shortname || q.symbol,
            exchange: q.exchange,
            type: q.quoteType
          }));
      }

      res.json(suggestions.slice(0, 8));
    } catch (error) {
      res.json([]);
    }
  });

  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      let rawInput = req.params.symbol.trim();
      try {
        rawInput = decodeURIComponent(rawInput);
      } catch (e) {
        // Ignore decoding errors
      }
      
      let symbol = rawInput.toUpperCase();
      const interval = (req.query.interval as string) || "1d";
      
      // 1. Try to resolve the symbol if it's not a standard one
      const isChinese = /[\u4e00-\u9fa5]/.test(symbol);
      const isNumeric = /^\d{4,6}$/.test(symbol);
      const isStandard = /^[A-Z0-9]+\.[A-Z]+$/.test(symbol);

      if (isChinese || isNumeric || !isStandard) {
        let resolved = false;

        // Try TWSE API for Chinese names or numeric codes
        try {
          const twseRes = await fetch(`https://www.twse.com.tw/zh/api/codeQuery?query=${encodeURIComponent(symbol)}`);
          if (twseRes.ok) {
            const twseData = await twseRes.json();
            if (twseData && twseData.suggestions && twseData.suggestions[0] !== '(無符合之代碼或名稱)') {
              // Find exact match or first match
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
            // Try standard search with Taiwan parameters
            let searchResult;
            try {
              searchResult = await yahooFinance.search(symbol, { 
                lang: 'zh-Hant-TW', 
                region: 'TW',
                quotesCount: 5,
                newsCount: 0
              });
            } catch (e) {
              // Fallback to simple search if BadRequest occurs
              searchResult = await yahooFinance.search(symbol, { quotesCount: 5, newsCount: 0 });
            }
            
            if (!searchResult || !searchResult.quotes || searchResult.quotes.length === 0) {
              // If first search yields nothing, try appending " stock"
              try {
                searchResult = await yahooFinance.search(`${symbol} stock`, { quotesCount: 5, newsCount: 0 });
              } catch (e) {
                // Ignore search errors in fallback
              }
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
            // If it's a numeric code, we can safely assume it's a Taiwan stock
            if (isNumeric && !symbol.includes('.')) {
              symbol = `${symbol}.TW`;
            } else if (isChinese) {
              // For Chinese names, if search fails, try one more time with a simpler search
              try {
                 const fallbackSearch = await yahooFinance.search(symbol, { quotesCount: 5, newsCount: 0 });
                 if (fallbackSearch.quotes && fallbackSearch.quotes.length > 0) {
                   symbol = (fallbackSearch.quotes[0] as any).symbol;
                 }
              } catch (e) {
                 // Final fallback
              }
            }
          }
        }
      }

      const validIntervals = ["1m", "5m", "60m", "1d", "1wk", "1mo"];
      const queryInterval = validIntervals.includes(interval) ? interval as any : "1d";
      
      const period1 = new Date();
      if (queryInterval === "1m") {
        period1.setDate(period1.getDate() - 7); // Yahoo only allows 7 days for 1m
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
      
      // Fetch chart data
      let chartResult;
      try {
        chartResult = await yahooFinance.chart(symbol, queryOptions);
      } catch (chartError: any) {
        // If chart fails, try one last fallback for numeric symbols
        if (isNumeric && !symbol.includes('.TW') && !symbol.includes('.TWO')) {
          try {
            symbol = `${rawInput.toUpperCase()}.TW`;
            chartResult = await yahooFinance.chart(symbol, queryOptions);
          } catch (e) {
            return res.status(404).json({ error: `找不到該股票資料 (${symbol})，可能已下市或代號錯誤` });
          }
        } else {
          return res.status(404).json({ error: `找不到該股票資料 (${symbol})，可能已下市或代號錯誤` });
        }
      }

      const result = chartResult.quotes.filter(
        (q: any) => q.close != null && q.open != null && q.high != null && q.low != null
      );
      
      if (!result || result.length === 0) {
        return res.status(404).json({ error: `找不到該股票資料 (${symbol})，可能已下市或代號錯誤` });
      }

      const enrichedData = calculateIndicators(result, queryInterval, chartResult.meta.exchangeTimezoneName);
      
      const quote: any = await yahooFinance.quote(symbol, { lang: "zh-TW", region: "TW" });

      res.json({
        symbol: quote.symbol,
        shortName: quote.longName || quote.shortName || symbol,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChange: quote.regularMarketChange,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        regularMarketOpen: quote.regularMarketOpen,
        regularMarketDayHigh: quote.regularMarketDayHigh,
        regularMarketDayLow: quote.regularMarketDayLow,
        regularMarketPreviousClose: quote.regularMarketPreviousClose,
        regularMarketVolume: quote.regularMarketVolume,
        averageDailyVolume3Month: quote.averageDailyVolume3Month,
        marketCap: quote.marketCap,
        trailingPE: quote.trailingPE,
        dividendYield: quote.dividendYield,
        historical: enrichedData,
      });
    } catch (error: any) {
      console.error("Error fetching stock data:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stock data" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  
  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = 3000;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  startServer();
}

export default createApp;

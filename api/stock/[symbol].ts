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
    };
    if (interval === "60m") {
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
    if (interval === "60m") {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol } = req.query;
  const interval = (req.query.interval as string) || "1d";

  if (!symbol) {
    return res.status(400).json({ error: "Symbol is required" });
  }

  try {
    let symbolStr = Array.isArray(symbol) ? symbol[0] : symbol;
    try {
      symbolStr = decodeURIComponent(symbolStr);
    } catch (e) {
      // Ignore
    }
    let symbolUpper = symbolStr.toUpperCase().trim();
    
    // 1. Try to resolve the symbol if it's not a standard one
    const isChinese = /[\u4e00-\u9fa5]/.test(symbolUpper);
    const isNumeric = /^\d{4,6}$/.test(symbolUpper);
    const isStandard = /^[A-Z0-9]+\.[A-Z]+$/.test(symbolUpper);

    if (isChinese || isNumeric || !isStandard) {
      let resolved = false;

      // Try TWSE API for Chinese names or numeric codes
      try {
        const twseRes = await fetch(`https://www.twse.com.tw/zh/api/codeQuery?query=${encodeURIComponent(symbolUpper)}`);
        if (twseRes.ok) {
          const twseData = await twseRes.json();
          if (twseData && twseData.suggestions && twseData.suggestions[0] !== '(無符合之代碼或名稱)') {
            // Find exact match or first match
            const match = twseData.suggestions.find((s: string) => {
              const parts = s.split('\t');
              return parts[1] === symbolUpper || parts[0] === symbolUpper;
            }) || twseData.suggestions[0];
            
            if (match) {
              const code = match.split('\t')[0];
              symbolUpper = `${code}.TW`;
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
            searchResult = await yahooFinance.search(symbolUpper, { 
              lang: 'zh-Hant-TW', 
              region: 'TW',
              quotesCount: 5,
              newsCount: 0
            });
          } catch (e) {
            // Fallback to simple search if BadRequest occurs
            searchResult = await yahooFinance.search(symbolUpper, { quotesCount: 5, newsCount: 0 });
          }
          
          if (!searchResult || !searchResult.quotes || searchResult.quotes.length === 0) {
            // If first search yields nothing, try appending " stock"
            try {
              searchResult = await yahooFinance.search(`${symbolUpper} stock`, { quotesCount: 5, newsCount: 0 });
            } catch (e) {
              // Ignore search errors in fallback
            }
          }

          if (searchResult && searchResult.quotes && searchResult.quotes.length > 0) {
            const bestMatch = searchResult.quotes.find(q => 
              q.quoteType === 'EQUITY' && ((q as any).symbol?.endsWith('.TW') || (q as any).symbol?.endsWith('.TWO'))
            ) || searchResult.quotes.find(q => q.quoteType === 'EQUITY') || searchResult.quotes[0];
            
            if ((bestMatch as any).symbol) {
              symbolUpper = (bestMatch as any).symbol;
            }
          } else if (isNumeric && !symbolUpper.includes('.')) {
            symbolUpper = `${symbolUpper}.TW`;
          }
        } catch (searchError) {
          // If it's a numeric code, we can safely assume it's a Taiwan stock
          if (isNumeric && !symbolUpper.includes('.')) {
            symbolUpper = `${symbolUpper}.TW`;
          } else if (isChinese) {
            // For Chinese names, if search fails, try one more time with a simpler search
            try {
               const fallbackSearch = await yahooFinance.search(symbolUpper, { quotesCount: 5, newsCount: 0 });
               if (fallbackSearch.quotes && fallbackSearch.quotes.length > 0) {
                 symbolUpper = (fallbackSearch.quotes[0] as any).symbol;
               }
            } catch (e) {
               // Final fallback
            }
          }
        }
      }
    }
    
    const validIntervals = ["60m", "1d", "1wk", "1mo"];
    const queryInterval = validIntervals.includes(interval) ? interval as any : "1d";
    
    const period1 = new Date();
    if (queryInterval === "60m") {
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
    const chartResult = await yahooFinance.chart(symbolUpper, queryOptions);
    const result = chartResult.quotes.filter(
      (q: any) => q.close != null && q.open != null && q.high != null && q.low != null
    );
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: "No data found for symbol" });
    }

    const enrichedData = calculateIndicators(result, queryInterval, chartResult.meta.exchangeTimezoneName);
    
    const quote: any = await yahooFinance.quote(symbolUpper, { lang: "zh-TW", region: "TW" });

    const data = {
      symbol: quote.symbol,
      shortName: quote.longName || quote.shortName || symbolUpper,
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange,
      regularMarketChangePercent: quote.regularMarketChangePercent,
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

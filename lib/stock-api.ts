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

export async function getStockData(symbol: string, interval: string = "1d") {
  const symbolUpper = symbol.toUpperCase();
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
    throw new Error("No data found for symbol");
  }

  const enrichedData = calculateIndicators(result, queryInterval, chartResult.meta.exchangeTimezoneName);
  
  const quote: any = await yahooFinance.quote(symbolUpper, { lang: "zh-TW", region: "TW" });

  return {
    symbol: quote.symbol,
    shortName: quote.longName || quote.shortName || symbolUpper,
    regularMarketPrice: quote.regularMarketPrice,
    regularMarketChange: quote.regularMarketChange,
    regularMarketChangePercent: quote.regularMarketChangePercent,
    historical: enrichedData,
  };
}

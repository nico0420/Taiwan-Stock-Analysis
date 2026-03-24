import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 6);
    const period2 = new Date();
    
    const intervals = ["60m", "1d", "1wk", "1mo"] as const;
    for (const interval of intervals) {
      const queryOptions = { period1, period2, interval };
      const result = await yahooFinance.chart("2330.TW", queryOptions);
      console.log(`Interval ${interval} success: ${result.quotes.length} quotes`);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}
test();

import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 6);
    const period2 = new Date();
    const queryOptions = { period1, period2, interval: "1d" as const };
    const result = await yahooFinance.chart("2330.TW", queryOptions);
    console.log("First quote:", result.quotes[0]);
    console.log("Last quote:", result.quotes[result.quotes.length - 1]);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();

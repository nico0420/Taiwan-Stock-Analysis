import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

async function test() {
  try {
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 6);
    const period2 = new Date();
    const queryOptions = { period1, period2 };
    const result = await yahooFinance.historical("2330.TW", queryOptions);
    console.log("Success:", result.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();

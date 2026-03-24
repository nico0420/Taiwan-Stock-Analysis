import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
async function run() {
  const result = await yahooFinance.chart('2330.TW', { period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), interval: '60m' });
  console.log(result.meta.exchangeTimezoneName);
}
run();

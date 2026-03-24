import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStockData } from "../../lib/stock-api";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel populates req.query with dynamic path segments
  const { symbol } = req.query;
  const interval = (req.query.interval as string) || "1d";

  if (!symbol) {
    return res.status(400).json({ error: "Symbol is required" });
  }

  try {
    // Ensure we handle the symbol correctly (it might be an array if multiple are passed)
    const symbolStr = Array.isArray(symbol) ? symbol[0] : symbol;
    
    console.log(`Fetching data for ${symbolStr} with interval ${interval}`);
    const data = await getStockData(symbolStr, interval);
    
    // Set cache headers to improve performance and reduce API calls
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Error in Vercel API handler:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to fetch stock data",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

import express from "express";
import { getStockData } from "../lib/stock-api";

const app = express();
app.use(express.json());

app.get("/api/stock/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const interval = (req.query.interval as string) || "1d";
    const data = await getStockData(symbol, interval);
    res.json(data);
  } catch (error: any) {
    console.error("Error fetching stock data:", error);
    res.status(500).json({ error: error.message || "Failed to fetch stock data" });
  }
});

export default app;

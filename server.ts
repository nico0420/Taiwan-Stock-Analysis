import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { getStockData } from "./lib/stock-api";

async function createApp() {
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

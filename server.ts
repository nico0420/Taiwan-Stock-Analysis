import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import searchHandler from "./api/search";
import stockHandler from "./api/stock/[symbol]";

async function createApp() {
  const app = express();
  
  app.use(express.json());

  app.get("/api/search", async (req, res) => {
    try {
      // Map Express req/res to Vercel-like req/res
      await searchHandler(req as any, res as any);
    } catch (error) {
      console.error("Search API error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/stock/:symbol", async (req, res) => {
    try {
      // Vercel handler expects symbol in req.query
      req.query.symbol = req.params.symbol;
      await stockHandler(req as any, res as any);
    } catch (error) {
      console.error("Stock API error:", error);
      res.status(500).json({ error: "Internal Server Error" });
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

// For Vercel compatibility, we export the app
const appPromise = createApp();
export default appPromise;

// Start server if running directly
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  appPromise.then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

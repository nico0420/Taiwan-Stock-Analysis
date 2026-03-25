import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let query = (req.query.q as string || "").trim();
    try {
      query = decodeURIComponent(query);
    } catch (e) {
      // Ignore decoding errors
    }
    
    if (!query || query.length < 1) return res.json([]);

    const isChinese = /[\u4e00-\u9fa5]/.test(query);
    const isNumeric = /^\d+$/.test(query);
    
    let suggestions: any[] = [];

    // Try TWSE API first for Chinese or numeric queries
    if (isChinese || isNumeric) {
      try {
        const twseRes = await fetch(`https://www.twse.com.tw/zh/api/codeQuery?query=${encodeURIComponent(query)}`);
        if (twseRes.ok) {
          const twseData = await twseRes.json();
          if (twseData && twseData.suggestions && twseData.suggestions[0] !== '(無符合之代碼或名稱)') {
            suggestions = twseData.suggestions.map((s: string) => {
              const parts = s.split('\t');
              return {
                symbol: `${parts[0]}.TW`,
                name: parts[1],
                exchange: 'TWSE',
                type: 'EQUITY'
              };
            });
          }
        }
      } catch (e) {
        console.error("TWSE API search error:", e);
      }
    }

    // Fallback to Yahoo Finance if TWSE API didn't return anything or it's not Chinese/numeric
    if (suggestions.length === 0) {
      let searchResult;
      try {
        // Try with Taiwan specific parameters first
        searchResult = await yahooFinance.search(query, { 
          lang: 'zh-Hant-TW', 
          region: 'TW',
          quotesCount: 10,
          newsCount: 0 
        });
      } catch (e) {
        try {
          // Fallback to simple search
          searchResult = await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 });
        } catch (e2) {
          return res.json([]);
        }
      }

      suggestions = (searchResult.quotes || [])
        .filter(q => 
          q.quoteType === 'EQUITY' && 
          ((q as any).symbol?.endsWith('.TW') || (q as any).symbol?.endsWith('.TWO'))
        )
        .map(q => ({
          symbol: (q as any).symbol,
          name: (q as any).longname || (q as any).shortname || (q as any).symbol,
          exchange: q.exchange || 'Taiwan',
          type: q.quoteType
        }));
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.json(suggestions.slice(0, 8));
  } catch (error) {
    console.error("Error in Vercel API search handler:", error);
    return res.json([]);
  }
}

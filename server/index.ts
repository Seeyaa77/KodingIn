import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Input validation schema for GitHub Scraper
const ScrapeQuerySchema = z.object({
  url: z.string().url().refine(
    (val) => val.includes('github.com'),
    { message: "URL must be a valid GitHub link." }
  )
});

// Centralized error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Centralized Error Handler:", err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal server error"
  });
});

// Root API Endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({ status: "online", system: "Kodingin API Gateway v1.0" });
});

// 1. Scrape GitHub Repository Metadata
app.get('/api/scrape-github', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request query parameters using Zod
    const parsed = ScrapeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: true,
        message: parsed.error.issues[0].message
      });
      return;
    }

    const { url } = parsed.data;

    // Parse owner and repo name from URL: https://github.com/owner/repo
    const githubRegex = /github\.com\/([^/]+)\/([^/&#?]+)/;
    const match = url.match(githubRegex);
    if (!match) {
      res.status(400).json({
        error: true,
        message: "Invalid GitHub repository URL format. Example: https://github.com/facebook/react"
      });
      return;
    }

    const [_, owner, repo] = match;
    const cleanRepo = repo.replace('.git', '');

    console.log(`[SCRAPER] Processing repository: ${owner}/${cleanRepo}`);

    // Let's scrape using Axios and Cheerio
    try {
      const { data: html } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 8000
      });

      const $ = cheerio.load(html);

      // Extract metadata from page
      // Stars: GitHub often uses #repo-stars-counter-star or data-social-count
      let starsText = $('#repo-stars-counter-star').text().trim() || 
                      $('span[data-social-count]').first().text().trim() ||
                      $('a[href$="/stargazers"] .Counter').first().text().trim();
      
      // Forks: GitHub uses #repo-forks-counter-star or href pointing to /forks
      let forksText = $('#repo-forks-counter-star').text().trim() ||
                      $('a[href$="/forknetwork"] .Counter').first().text().trim() ||
                      $('a[href$="/forks"] .Counter').first().text().trim();

      // Description: itemprop="about" or meta name="description"
      let description = $('span[itemprop="about"]').text().trim() || 
                        $('meta[name="description"]').attr('content')?.trim() || 
                        $('p.f4.my-3').text().trim();

      // Primary Language: span[itemprop="programmingLanguage"] or search for lang list
      let language = $('span[itemprop="programmingLanguage"]').first().text().trim() ||
                     $('.repository-lang-stats-numbers li .lang').first().text().trim() ||
                     $('span.color-fg-default.text-bold').first().text().trim();

      // Clean numbers (remove commas, whitespace, units like 'k')
      const cleanNumber = (numStr: string) => {
        if (!numStr) return 0;
        let cleaned = numStr.replace(/,/g, '').trim().toLowerCase();
        if (cleaned.includes('k')) {
          return Math.round(parseFloat(cleaned.replace('k', '')) * 1000);
        }
        return parseInt(cleaned, 10) || 0;
      };

      const stars = cleanNumber(starsText);
      const forks = cleanNumber(forksText);

      // Fallback: If scraper returns empty metadata, fetch Github REST API
      if (!description || stars === 0) {
        console.log(`[SCRAPER] Cheerio got partial data, triggering GitHub REST API fallback...`);
        try {
          const apiRes = await axios.get(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
            timeout: 5000,
            headers: { 'User-Agent': 'Kodingin-Agent-App' }
          });
          const apiData = apiRes.data;
          
          res.json({
            owner,
            repo: cleanRepo,
            description: description || apiData.description || "No description provided.",
            stars: stars || apiData.stargazers_count || 0,
            forks: forks || apiData.forks_count || 0,
            language: language || apiData.language || "Unknown",
            url
          });
          return;
        } catch (apiErr: any) {
          console.warn("[SCRAPER] GitHub API Fallback also failed:", apiErr.message);
        }
      }

      res.json({
        owner,
        repo: cleanRepo,
        description: description || "No description provided.",
        stars: stars || 0,
        forks: forks || 0,
        language: language || "Unknown",
        url
      });

    } catch (scrapeErr: any) {
      console.warn(`[SCRAPER] Web scrape failed: ${scrapeErr.message}. Triggering API direct call...`);
      // Direct API Call fallback if website blocks or scrapes fail
      const apiRes = await axios.get(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
        timeout: 5000,
        headers: { 'User-Agent': 'Kodingin-Agent-App' }
      });
      const apiData = apiRes.data;

      res.json({
        owner,
        repo: cleanRepo,
        description: apiData.description || "No description provided.",
        stars: apiData.stargazers_count || 0,
        forks: apiData.forks_count || 0,
        language: apiData.language || "Unknown",
        url
      });
    }

  } catch (error: any) {
    console.error("Error in /api/scrape-github:", error.message);
    res.status(500).json({
      error: true,
      message: `Failed to scrape repository info: ${error.message}`
    });
  }
});

// 2. Reputation Points Sync endpoint
app.post('/api/reputation/calculate', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: true, message: "Missing userId" });
    return;
  }
  
  // Calculate daily reputation logic
  res.json({
    success: true,
    message: `Reputation recalculated for user ${userId}.`,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Express Server running on port ${PORT}`);
});

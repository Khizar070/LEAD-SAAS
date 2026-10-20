import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

export interface PerformanceMetrics {
  score: number; // 0-100
  lcpMs?: number;
  clsScore?: number;
  transferSizeBytes?: number;
  renderBlockingCount?: number;
  responseTimeMs?: number;
  source?: "google_pagespeed" | "local_analyzer";
}

export class PageSpeedProvider {
  async analyzePerformance(
    url: string,
    html?: string,
    responseTimeMs?: number
  ): Promise<PerformanceMetrics> {
    const apiKey = env.GOOGLE_MAPS_API_KEY;

    // Try Google PageSpeed Insights API if URL is public
    if (apiKey && url.startsWith("http")) {
      try {
        const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
          url
        )}&category=PERFORMANCE&key=${apiKey}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(psUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const perfScore = Math.round(
            (data.lighthouseResult?.categories?.performance?.score ?? 0.7) * 100
          );
          const lcp = data.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue;

          return {
            score: Math.max(10, Math.min(100, perfScore)),
            lcpMs: lcp ? Math.round(lcp) : undefined,
            responseTimeMs,
            source: "google_pagespeed",
          };
        }
      } catch (err) {
        logger.debug("Google PageSpeed API call skipped or timed out, using local analyzer", { url, err });
      }
    }

    // Local Performance Analyzer fallback based on TTFB latency & DOM structure
    try {
      if (!html) {
        return { score: 30, responseTimeMs, source: "local_analyzer" };
      }

      let score = 90;
      const htmlSize = Buffer.byteLength(html, "utf-8");

      // TTFB / Server Latency penalty
      if (responseTimeMs) {
        if (responseTimeMs > 3000) {
          score -= 30;
        } else if (responseTimeMs > 1500) {
          score -= 15;
        } else if (responseTimeMs > 800) {
          score -= 5;
        }
      }

      // Heavy DOM Penalty
      if (htmlSize > 800000) {
        score -= 25;
      } else if (htmlSize > 300000) {
        score -= 15;
      }

      // External scripts count
      const scriptMatches = html.match(/<script[^>]*src=/gi) || [];
      if (scriptMatches.length > 25) {
        score -= 20;
      } else if (scriptMatches.length > 12) {
        score -= 10;
      }

      // Unoptimized images
      const imgWithoutLoading = html.match(/<img(?![^>]*loading=)/gi) || [];
      if (imgWithoutLoading.length > 10) {
        score -= 10;
      }

      const finalScore = Math.max(10, Math.min(100, score));

      return {
        score: finalScore,
        lcpMs: responseTimeMs ? Math.round(responseTimeMs * 1.5) : finalScore < 50 ? 3800 : 1400,
        clsScore: finalScore < 60 ? 0.22 : 0.04,
        transferSizeBytes: htmlSize,
        renderBlockingCount: scriptMatches.length,
        responseTimeMs,
        source: "local_analyzer",
      };
    } catch (error) {
      logger.error("Failed to analyze performance", { url, error });
      return { score: 50, responseTimeMs, source: "local_analyzer" };
    }
  }
}

import { logger } from "@/lib/logger";

export interface CrawlResult {
  reachable: boolean;
  httpStatus?: number;
  finalUrl?: string;
  isHttps: boolean;
  html?: string;
  errorMessage?: string;
  responseHeaders?: Record<string, string>;
  responseTimeMs?: number;
  extractedPhones?: string[];
  extractedEmails?: string[];
  extractedSocials?: { type: string; url: string }[];
  hasMobileViewport?: boolean;
  hasResponsiveDesign?: boolean;
  hasFixedWidthContainer?: boolean;
  htmlSizeBytes?: number;
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Localhost & loopback
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  // Cloud metadata endpoint
  if (host === "169.254.169.254") {
    return true;
  }

  // IPv4 Private Range Check
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

export async function crawlWebsite(targetUrl: string): Promise<CrawlResult> {
  const startTime = Date.now();
  let normalized = targetUrl.trim();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  // Try HTTPS first, if fails try HTTP
  const urlsToTry = [normalized];
  if (normalized.startsWith("https://")) {
    urlsToTry.push(normalized.replace("https://", "http://"));
  }

  let lastError: Error | null = null;

  for (const url of urlsToTry) {
    try {
      const parsed = new URL(url);

      if (isPrivateOrLocalHost(parsed.hostname)) {
        logger.warn("SSRF attempt blocked", { url, hostname: parsed.hostname });
        return {
          reachable: false,
          isHttps: parsed.protocol === "https:",
          errorMessage: "Target URL points to a restricted private/local destination.",
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch(parsed.toString(), {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webkit,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);
      const responseTimeMs = Date.now() - startTime;

      const isHttps = response.url.startsWith("https://");
      const html = await response.text();
      const htmlSizeBytes = Buffer.byteLength(html, "utf-8");

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key.toLowerCase()] = val;
      });

      // Extract contact details & responsiveness metadata from HTML
      const extractedPhones = extractPhonesFromHtml(html);
      const extractedEmails = extractEmailsFromHtml(html);
      const extractedSocials = extractSocialsFromHtml(html);

      const hasMobileViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
      const hasResponsiveDesign =
        hasMobileViewport ||
        /@media\s*\(min-width|@media\s*\(max-width|flex|grid|container-fluid|tailwind|bootstrap/i.test(html);
      const hasFixedWidthContainer = /style=["'][^"']*width:\s*(?:1[0-9]{3}|2[0-9]{3})px/i.test(html);

      return {
        reachable: response.ok || response.status < 400,
        httpStatus: response.status,
        finalUrl: response.url,
        isHttps,
        html,
        responseHeaders,
        responseTimeMs,
        extractedPhones,
        extractedEmails,
        extractedSocials,
        hasMobileViewport,
        hasResponsiveDesign,
        hasFixedWidthContainer,
        htmlSizeBytes,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn("Crawl attempt failed", { url, error: lastError.message });
    }
  }

  return {
    reachable: false,
    isHttps: targetUrl.startsWith("https://"),
    responseTimeMs: Date.now() - startTime,
    errorMessage: lastError ? lastError.message : "Network connection failed or host unreachable",
  };
}

function extractPhonesFromHtml(html: string): string[] {
  const phones = new Set<string>();
  // 1. tel: links
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  let match;
  while ((match = telRegex.exec(html)) !== null) {
    phones.add(match[1].trim());
  }

  // 2. International / standard phone regex patterns in text
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const matches = html.match(phoneRegex) || [];
  for (const m of matches) {
    const cleaned = m.trim();
    if (cleaned.length >= 8 && cleaned.length <= 20 && /\d/.test(cleaned)) {
      // Avoid matching random CSS or date strings
      if (!cleaned.startsWith("202") && !cleaned.startsWith("199")) {
        phones.add(cleaned);
      }
    }
  }
  return Array.from(phones).slice(0, 5);
}

function extractEmailsFromHtml(html: string): string[] {
  const emails = new Set<string>();
  const mailtoRegex = /href=["']mailto:([^"?#'\s]+)/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    emails.add(match[1].toLowerCase().trim());
  }

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  for (const m of matches) {
    const lower = m.toLowerCase().trim();
    if (!lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".svg") && !lower.endsWith(".js")) {
      emails.add(lower);
    }
  }
  return Array.from(emails).slice(0, 5);
}

function extractSocialsFromHtml(html: string): { type: string; url: string }[] {
  const socials: { type: string; url: string }[] = [];
  const platforms = [
    { type: "facebook", pattern: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/i },
    { type: "instagram", pattern: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i },
    { type: "linkedin", pattern: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/i },
    { type: "twitter", pattern: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9._-]+/i },
  ];

  for (const p of platforms) {
    const match = html.match(p.pattern);
    if (match) {
      socials.push({ type: p.type, url: match[0] });
    }
  }
  return socials;
}

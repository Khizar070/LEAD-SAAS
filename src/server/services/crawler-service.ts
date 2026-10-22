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
  whatsappPhone?: string;
  extractedEmails?: string[];
  extractedSocials?: { type: string; url: string }[];
  hasMobileViewport?: boolean;
  hasResponsiveDesign?: boolean;
  hasFixedWidthContainer?: boolean;
  htmlSizeBytes?: number;
  hasChatbot?: boolean;
  chatbotDetails?: string;
  hasBookingSystem?: boolean;
  bookingDetails?: string;
  hasVoiceAgent?: boolean;
  voiceAgentDetails?: string;
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
      let extractedPhones = extractPhonesFromHtml(html);
      let extractedEmails = extractEmailsFromHtml(html);
      const extractedSocials = extractSocialsFromHtml(html);
      const whatsappPhone = extractWhatsappFromHtml(html);

      // Tech & AI detection
      const chatbotCheck = detectChatbot(html);
      const bookingCheck = detectBookingSystem(html);
      const voiceCheck = detectVoiceAgent(html);

      // If no emails found on homepage, attempt a quick fetch of /contact or /about
      if (extractedEmails.length === 0) {
        try {
          const contactUrl = new URL("/contact", response.url).toString();
          const contactCtrl = new AbortController();
          const contactTimer = setTimeout(() => contactCtrl.abort(), 4000);
          const contactRes = await fetch(contactUrl, {
            signal: contactCtrl.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            },
          });
          clearTimeout(contactTimer);
          if (contactRes.ok) {
            const contactHtml = await contactRes.text();
            const moreEmails = extractEmailsFromHtml(contactHtml);
            const morePhones = extractPhonesFromHtml(contactHtml);
            extractedEmails = Array.from(new Set([...extractedEmails, ...moreEmails])).slice(0, 5);
            extractedPhones = Array.from(new Set([...extractedPhones, ...morePhones])).slice(0, 5);
          }
        } catch {
          // ignore secondary contact page fetch failure
        }
      }

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
        whatsappPhone,
        extractedEmails,
        extractedSocials,
        hasMobileViewport,
        hasResponsiveDesign,
        hasFixedWidthContainer,
        htmlSizeBytes,
        hasChatbot: chatbotCheck.hasChatbot,
        chatbotDetails: chatbotCheck.details,
        hasBookingSystem: bookingCheck.hasBookingSystem,
        bookingDetails: bookingCheck.details,
        hasVoiceAgent: voiceCheck.hasVoiceAgent,
        voiceAgentDetails: voiceCheck.details,
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

function extractWhatsappFromHtml(html: string): string | undefined {
  // 1. wa.me link
  const waMatch = html.match(/https?:\/\/(?:www\.)?wa\.me\/(?:\+?)([0-9]{7,15})/i);
  if (waMatch && waMatch[1]) {
    return cleanPhoneNumber(waMatch[1]);
  }

  // 2. api.whatsapp.com link
  const apiMatch = html.match(/https?:\/\/api\.whatsapp\.com\/send\?(?:[^"'>]*&)?phone=(?:\+?)([0-9]{7,15})/i);
  if (apiMatch && apiMatch[1]) {
    return cleanPhoneNumber(apiMatch[1]);
  }

  // 3. whatsapp:// protocol
  const protocolMatch = html.match(/whatsapp:\/\/send\?(?:[^"'>]*&)?phone=(?:\+?)([0-9]{7,15})/i);
  if (protocolMatch && protocolMatch[1]) {
    return cleanPhoneNumber(protocolMatch[1]);
  }

  // 4. WhatsApp in anchor text with tel link
  const whatsappAnchorMatch = html.match(/<a[^>]*href=["'](?:tel:|https?:\/\/[^"']*whatsapp[^"']*)[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
  if (whatsappAnchorMatch) {
    const rawText = whatsappAnchorMatch[1].replace(/<[^>]+>/g, "").trim();
    const phoneInText = rawText.match(/\+?[0-9\s-()]{8,20}/);
    if (phoneInText) {
      return cleanPhoneNumber(phoneInText[0]);
    }
  }

  return undefined;
}

function cleanPhoneNumber(phoneStr: string): string {
  let cleaned = phoneStr.trim().replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+") && cleaned.length >= 10) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

function detectChatbot(html: string): { hasChatbot: boolean; details?: string } {
  const bots = [
    { name: "Tidio Chat", pattern: /code\.tidio\.co|tidioChatApi/i },
    { name: "Intercom", pattern: /widget\.intercom\.io|intercomSettings/i },
    { name: "Crisp Chat", pattern: /client\.crisp\.chat|\$crisp/i },
    { name: "Tawk.to", pattern: /embed\.tawk\.to|Tawk_API/i },
    { name: "Drift", pattern: /js\.driftt\.com|drift\.load/i },
    { name: "LiveChat", pattern: /cdn\.livechatinc\.com|__livechat/i },
    { name: "Chatbase", pattern: /chatbase\.co\/embed|chatbase/i },
    { name: "Voiceflow", pattern: /voiceflow\.com\/widget|voiceflow/i },
    { name: "Botpress", pattern: /botpress\.cloud|botpressWebChat/i },
    { name: "Zendesk Chat", pattern: /static\.zdassets\.com\/ekr\/snippet\.js|zE\(/i },
    { name: "HubSpot Chat", pattern: /js\.usemessages\.com|hs-messages-widget/i },
    { name: "Custom Web Chatbot", pattern: /class=["'][^"']*(?:chat-widget|ai-chat|chatbot-container|chat-bubble|live-chat-box)[^"']*["']/i },
  ];

  for (const b of bots) {
    if (b.pattern.test(html)) {
      return { hasChatbot: true, details: b.name };
    }
  }
  return { hasChatbot: false };
}

function detectBookingSystem(html: string): { hasBookingSystem: boolean; details?: string } {
  const systems = [
    { name: "Calendly", pattern: /calendly\.com|calendly-inline-widget/i },
    { name: "Acuity Scheduling", pattern: /acuityscheduling\.com/i },
    { name: "Cal.com", pattern: /cal\.com/i },
    { name: "Fresha", pattern: /fresha\.com/i },
    { name: "Jane App", pattern: /janeapp\.com|jane\.app/i },
    { name: "Mindbody", pattern: /mindbodyonline\.com/i },
    { name: "SimplyBook.me", pattern: /simplybook\.me/i },
    { name: "Setmore", pattern: /setmore\.com/i },
    { name: "Appointlet", pattern: /appointlet\.com/i },
    { name: "Square Appointments", pattern: /squareup\.com\/appointments/i },
    { name: "OpenTable", pattern: /opentable\.com/i },
    { name: "Resy", pattern: /resy\.com/i },
    { name: "Online Booking System", pattern: /href=["'][^"']*(?:\/book-online|\/appointments|\/schedule-consultation|\/online-booking)[^"']*["']/i },
  ];

  for (const s of systems) {
    if (s.pattern.test(html)) {
      return { hasBookingSystem: true, details: s.name };
    }
  }
  return { hasBookingSystem: false };
}

function detectVoiceAgent(html: string): { hasVoiceAgent: boolean; details?: string } {
  const agents = [
    { name: "Vapi AI Voice", pattern: /vapi\.ai/i },
    { name: "Bland AI Calling", pattern: /bland\.ai/i },
    { name: "Retell AI Voice", pattern: /retellai\.com/i },
    { name: "Air AI", pattern: /air\.ai/i },
  ];

  for (const a of agents) {
    if (a.pattern.test(html)) {
      return { hasVoiceAgent: true, details: a.name };
    }
  }
  return { hasVoiceAgent: false };
}

function extractPhonesFromHtml(html: string): string[] {
  const phones = new Set<string>();
  // 1. tel: links
  const telRegex = /href=["']tel:([^"']+)["']/gi;
  let match;
  while ((match = telRegex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (raw.length >= 7 && raw.length <= 25) {
      phones.add(cleanPhoneNumber(raw));
    }
  }

  // 2. International / standard phone regex patterns in text
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const matches = html.match(phoneRegex) || [];
  for (const m of matches) {
    const cleaned = m.trim();
    if (cleaned.length >= 8 && cleaned.length <= 20 && /\d/.test(cleaned)) {
      // Avoid matching random CSS or date strings
      if (!cleaned.startsWith("202") && !cleaned.startsWith("199")) {
        phones.add(cleanPhoneNumber(cleaned));
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
    if (
      !lower.endsWith(".png") &&
      !lower.endsWith(".jpg") &&
      !lower.endsWith(".jpeg") &&
      !lower.endsWith(".webp") &&
      !lower.endsWith(".svg") &&
      !lower.endsWith(".js") &&
      !lower.endsWith(".css")
    ) {
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
    { type: "youtube", pattern: /https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|user\/|@)[a-zA-Z0-9._-]+/i },
    { type: "tiktok", pattern: /https?:\/\/(?:www\.)?tiktok\.com\/@[a-zA-Z0-9._-]+/i },
  ];

  for (const p of platforms) {
    const match = html.match(p.pattern);
    if (match) {
      socials.push({ type: p.type, url: match[0] });
    }
  }
  return socials;
}

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
  whatsappPhones?: string[];
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
      let whatsappPhones = extractAllWhatsappFromHtml(html);

      // Tech & AI detection
      const chatbotCheck = detectChatbot(html);
      const bookingCheck = detectBookingSystem(html);
      const voiceCheck = detectVoiceAgent(html);

      // If no WhatsApp, no emails, or only 1 phone found, attempt a quick fetch of /contact
      if (whatsappPhones.length === 0 || extractedEmails.length === 0 || extractedPhones.length < 2) {
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
            const moreWa = extractAllWhatsappFromHtml(contactHtml);
            extractedEmails = Array.from(new Set([...extractedEmails, ...moreEmails])).slice(0, 5);
            extractedPhones = Array.from(new Set([...extractedPhones, ...morePhones])).slice(0, 8);
            whatsappPhones = Array.from(new Set([...whatsappPhones, ...moreWa])).slice(0, 5);
          }
        } catch {
          // ignore secondary contact page fetch failure
        }
      }

      // If website explicitly mentions WhatsApp or has widget and extracted phones has a mobile number
      if (whatsappPhones.length === 0 && (html.toLowerCase().includes("whatsapp") || html.includes("wa.me"))) {
        for (const phone of extractedPhones) {
          if (isMobileOrWhatsappCandidate(phone)) {
            whatsappPhones.push(phone);
          }
        }
      }

      const whatsappPhone = whatsappPhones.length > 0 ? whatsappPhones.join(", ") : undefined;

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
        whatsappPhones,
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

export function extractAllWhatsappFromHtml(html: string): string[] {
  const whatsappNumbers = new Set<string>();

  // 1. wa.me link: wa.me/447700900077 or wa.me/+447700900077
  const waRegex = /https?:\/\/(?:www\.)?wa\.me\/(?:\+?)([0-9]{7,16})/gi;
  let waMatch;
  while ((waMatch = waRegex.exec(html)) !== null) {
    if (waMatch[1]) {
      const cleaned = cleanPhoneNumber(waMatch[1]);
      if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
    }
  }

  // 2. api.whatsapp.com link
  const apiRegex = /https?:\/\/api\.whatsapp\.com\/send\?(?:[^"'>]*&)?phone=(?:\+?)([0-9]{7,16})/gi;
  let apiMatch;
  while ((apiMatch = apiRegex.exec(html)) !== null) {
    if (apiMatch[1]) {
      const cleaned = cleanPhoneNumber(apiMatch[1]);
      if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
    }
  }

  // 3. whatsapp:// protocol
  const protocolRegex = /whatsapp:\/\/send\?(?:[^"'>]*&)?phone=(?:\+?)([0-9]{7,16})/gi;
  let protocolMatch;
  while ((protocolMatch = protocolRegex.exec(html)) !== null) {
    if (protocolMatch[1]) {
      const cleaned = cleanPhoneNumber(protocolMatch[1]);
      if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
    }
  }

  // 4. Data attributes from WhatsApp widgets (Joinchat, WP WhatsApp, Elfsight, etc.)
  const dataRegex = /(?:data-phone|data-whatsapp|data-number|data-wa|whatsapp-number|data-tel)=["']([+0-9\s-()]{7,20})["']/gi;
  let dataMatch;
  while ((dataMatch = dataRegex.exec(html)) !== null) {
    const cleaned = cleanPhoneNumber(dataMatch[1]);
    if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
  }

  // 5. WhatsApp in anchor tag with tel: link or text
  const waTagRegex = /<a[^>]+(?:class=["'][^"']*whatsapp[^"']*["']|href=["'][^"']*whatsapp[^"']*["']|aria-label=["'][^"']*whatsapp[^"']*["'])[^>]*>([\s\S]*?)<\/a>/gi;
  let tagMatch;
  while ((tagMatch = waTagRegex.exec(html)) !== null) {
    const fullTag = tagMatch[0];
    const text = tagMatch[1];
    const telMatch = fullTag.match(/href=["']tel:([^"']+)["']/i);
    if (telMatch) {
      const cleaned = cleanPhoneNumber(telMatch[1]);
      if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
    }
    const phoneInText = text.replace(/<[^>]+>/g, "").match(/\+?[0-9\s-()]{8,20}/);
    if (phoneInText) {
      const cleaned = cleanPhoneNumber(phoneInText[0]);
      if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
    }
  }

  // 6. Explicit text mentioning WhatsApp: "WhatsApp: +44..." or "WhatsApp: 07..."
  const textWaRegex = /(?:whatsapp|chat on whatsapp|whatsapp us|whatsapp booking)[\s:-]+(?:\+?[0-9\s-()]{8,20})/gi;
  const textMatches = html.match(textWaRegex) || [];
  for (const tm of textMatches) {
    const num = tm.match(/\+?[0-9\s-()]{8,20}/);
    if (num) {
      const cleaned = cleanPhoneNumber(num[0]);
      if (isValidPhone(cleaned)) whatsappNumbers.add(cleaned);
    }
  }

  return Array.from(whatsappNumbers);
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, "");
  // Standard phone numbers must have 10 to 14 digits
  if (digits.length < 10 || digits.length > 14) return false;
  // Exclude repetitive or CSS patterns (e.g., 011171024, 00000)
  if (/^0111|^0000|^1111|^9999/.test(digits)) return false;
  // Exclude dates/years
  if (/^(?:199\d|200\d|201\d|202\d|203\d)/.test(digits)) return false;
  return true;
}

export function isMobileOrWhatsappCandidate(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, "");
  // UK mobile: starts with 447 or 07 (11 digits local or 12 digits with country code 44)
  if (/^(?:447\d{9}|07\d{9})$/.test(digits)) return true;
  // International mobile candidates (non-UK landline prefixes)
  if (phone.startsWith("+") && !digits.startsWith("441") && !digits.startsWith("442") && !digits.startsWith("443") && !digits.startsWith("448")) {
    return digits.length >= 10 && digits.length <= 13;
  }
  return false;
}

export function cleanPhoneNumber(phoneStr: string): string {
  let cleaned = phoneStr.trim().replace(/[^\d+]/g, "");
  // UK mobile starting with 07 and 11 digits: e.g. 07700 900077 -> +447700900077
  if (/^07\d{9}$/.test(cleaned)) {
    return `+44${cleaned.substring(1)}`;
  }
  // UK landline starting with 01/02/03/08: e.g. 020 3553 3869 -> +442035533869
  if (/^0[1238]\d{8,10}$/.test(cleaned)) {
    return `+44${cleaned.substring(1)}`;
  }
  // If starts with 00: e.g. 0044... -> +44...
  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.substring(2)}`;
  }
  // If doesn't start with +, but has international digits
  if (!cleaned.startsWith("+") && cleaned.length >= 10 && cleaned.length <= 14) {
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
    const cleaned = cleanPhoneNumber(raw);
    if (isValidPhone(cleaned)) {
      phones.add(cleaned);
    }
  }

  // 2. International / standard phone regex patterns in text
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
  const matches = html.match(phoneRegex) || [];
  for (const m of matches) {
    const cleaned = cleanPhoneNumber(m.trim());
    if (isValidPhone(cleaned)) {
      phones.add(cleaned);
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

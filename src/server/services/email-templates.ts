export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: "AI" | "WebDev" | "SEO" | "General";
  pitchAngle: string;
  recommendedService: string;
  defaultTone: "professional" | "consultative" | "direct";
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "ai-automation",
    name: "🤖 AI Chatbot & 24/7 Lead Capture",
    description: "Pitch an AI assistant to handle customer inquiries & capture appointments 24/7.",
    category: "AI",
    pitchAngle: "Focus on missed customer inquiries after business hours and how an intelligent AI assistant captures contact info and books consultations automatically.",
    recommendedService: "AI Chatbot & Lead Automation",
    defaultTone: "consultative",
  },
  {
    id: "booking-system",
    name: "📅 Automated Booking & Calendar Scheduling",
    description: "Pitch an automated self-scheduling system to stop losing appointment leads.",
    category: "AI",
    pitchAngle: "Focus on friction in booking consultations and how instant self-service booking converts visitors before they leave for a competitor.",
    recommendedService: "Online Booking System Integration",
    defaultTone: "consultative",
  },
  {
    id: "website-redesign",
    name: "🎨 Modern Website Redesign & Mobile UX",
    description: "Pitch a modern, mobile-first responsive redesign to increase conversions.",
    category: "WebDev",
    pitchAngle: "Highlight mobile display friction, layout responsiveness, and modern design aesthetic that builds immediate credibility.",
    recommendedService: "Modern Website Redesign",
    defaultTone: "consultative",
  },
  {
    id: "speed-seo",
    name: "⚡ Speed Optimization & Google SEO Ranking",
    description: "Pitch faster load times, Core Web Vitals, and local Google visibility.",
    category: "SEO",
    pitchAngle: "Highlight server latency, slow response, and missing meta elements that prevent top Google local rankings.",
    recommendedService: "Website Speed & SEO Optimization",
    defaultTone: "direct",
  },
  {
    id: "direct-value",
    name: "💡 Short Consultative Audit (Zero Pitch)",
    description: "A friendly, ultra-short note offering a 2-minute video breakdown of issues.",
    category: "General",
    pitchAngle: "Keep it under 90 words. Zero pushy sales talk. Just offer to send a quick screen-share video of the identified website fixes.",
    recommendedService: "Web & AI Consultation",
    defaultTone: "consultative",
  },
];

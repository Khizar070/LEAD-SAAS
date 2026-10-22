import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface DiscoveredLeadInput {
  sourcePlaceId: string;
  name: string;
  category?: string;
  websiteUrl?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
}

export type DiscoverSortOrder = "bottom-to-top" | "top-to-bottom" | "lowest-reviews";

export interface DiscoverParams {
  niche: string;
  location: string;
  maxResults?: number;
  sortOrder?: DiscoverSortOrder;
}

export class GooglePlacesProvider {
  async discoverLeads(params: DiscoverParams): Promise<DiscoveredLeadInput[]> {
    const { niche, location, maxResults = 10, sortOrder = "bottom-to-top" } = params;
    const apiKey = env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      logger.info("GOOGLE_MAPS_API_KEY is not configured. Returning development mock leads.", {
        niche,
        location,
        sortOrder,
      });
      return this.getMockLeads(niche, location, maxResults, sortOrder);
    }

    try {
      const query = `${niche} in ${location}`;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query
      )}&key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Places API returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ""}`);
      }

      let rawResults = [...((data.results || []) as Array<Record<string, unknown>>)];

      // Apply User's discovery sorting preference:
      if (sortOrder === "bottom-to-top") {
        // Reverse so lower-ranking / small local businesses appear first
        rawResults = rawResults.reverse();
      } else if (sortOrder === "lowest-reviews") {
        rawResults = rawResults.sort((a, b) => {
          const countA = typeof a.user_ratings_total === "number" ? a.user_ratings_total : 0;
          const countB = typeof b.user_ratings_total === "number" ? b.user_ratings_total : 0;
          return countA - countB;
        });
      }

      const targetedResults = rawResults.slice(0, maxResults);

      // TextSearch API does not include website or phone details by default.
      // We must fetch Place Details for each place to get website and phone numbers.
      const enrichedLeads = await Promise.all(
        targetedResults.map(async (place: Record<string, unknown>) => {
          const placeId = (place.place_id as string) || "";
          const geometry = place.geometry as { location?: { lat?: number; lng?: number } } | undefined;
          const basicName = (place.name as string) || "Unknown Business";
          const basicAddress = (place.formatted_address as string) || undefined;

          let websiteUrl: string | undefined = undefined;
          let phone: string | undefined = undefined;

          if (placeId) {
            const details = await this.fetchPlaceDetails(placeId, apiKey);
            if (details) {
              websiteUrl = details.website;
              phone = details.phone;
            }
          }

          // Fallback: If websiteUrl is still missing, attempt web search discovery
          if (!websiteUrl) {
            websiteUrl = await this.searchWebsiteFallback(basicName, location);
          }

          return {
            sourcePlaceId: placeId || `place_${Date.now()}_${Math.random()}`,
            name: basicName,
            category: niche,
            websiteUrl: websiteUrl ? this.cleanUrl(websiteUrl) : undefined,
            phone,
            address: basicAddress,
            city: location,
            country: "UK",
            latitude: geometry?.location?.lat,
            longitude: geometry?.location?.lng,
            rating: typeof place.rating === "number" ? place.rating : undefined,
            reviewCount: typeof place.user_ratings_total === "number" ? place.user_ratings_total : undefined,
          };
        })
      );

      return enrichedLeads;
    } catch (error) {
      logger.error("Failed to query Google Places API, falling back to mock leads", { error });
      return this.getMockLeads(niche, location, maxResults);
    }
  }

  /**
   * Fetch Place Details from Google Places API to extract website & phone number
   */
  async fetchPlaceDetails(
    placeId: string,
    apiKey: string
  ): Promise<{ website?: string; phone?: string } | null> {
    try {
      const fields = "name,website,formatted_phone_number,international_phone_number";
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=${fields}&key=${apiKey}`;

      const res = await fetch(detailsUrl);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.status !== "OK" || !data.result) return null;

      const result = data.result;
      const website = (result.website as string) || undefined;
      const phone =
        (result.formatted_phone_number as string) || (result.international_phone_number as string) || undefined;

      return { website, phone };
    } catch (err) {
      logger.warn("Failed to fetch Google Place Details", { placeId, error: err });
      return null;
    }
  }

  /**
   * Search web as fallback to discover official website for a business
   */
  async searchWebsiteFallback(businessName: string, location: string): Promise<string | undefined> {
    try {
      const query = `${businessName} ${location} official website`;
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) return undefined;

      const html = await res.text();
      // Extract links from DuckDuckGo search result page
      const linkRegex = /<a[^>]+class="[^"]*result__url[^"]*"[^>]+href="([^"]+)"/gi;
      let match;
      const excludedDomains = ["facebook.com", "instagram.com", "linkedin.com", "yelp.com", "google.com", "tripadvisor.com", "yellowpages.com"];

      while ((match = linkRegex.exec(html)) !== null) {
        let rawUrl = match[1];
        if (rawUrl.includes("uddg=")) {
          const urlParam = new URLSearchParams(rawUrl.split("?")[1]).get("uddg");
          if (urlParam) rawUrl = urlParam;
        }

        try {
          const parsed = new URL(rawUrl);
          const domain = parsed.hostname.toLowerCase();
          if (!excludedDomains.some((ex) => domain.includes(ex))) {
            return `${parsed.protocol}//${parsed.hostname}`;
          }
        } catch {
          // invalid url
        }
      }
    } catch (err) {
      logger.warn("DuckDuckGo website fallback search failed", { businessName, error: err });
    }
    return undefined;
  }

  private cleanUrl(url: string): string {
    let cleaned = url.trim();
    if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
      cleaned = `https://${cleaned}`;
    }
    return cleaned;
  }

  private getMockLeads(
    niche: string,
    location: string,
    maxResults: number,
    sortOrder: DiscoverSortOrder = "bottom-to-top"
  ): DiscoveredLeadInput[] {
    let mockData: DiscoveredLeadInput[] = [
      {
        sourcePlaceId: `mock_place_1_${location.toLowerCase().replace(/\s+/g, "_")}`,
        name: `Apex ${niche} & Digital Clinic`,
        category: niche,
        websiteUrl: "https://example.com/apex-clinic",
        phone: "+44 20 7946 0912",
        address: `102 High Street, ${location}`,
        city: location,
        country: "UK",
        rating: 4.8,
        reviewCount: 42,
      },
      {
        sourcePlaceId: `mock_place_2_${location.toLowerCase().replace(/\s+/g, "_")}`,
        name: `Harbor Care ${niche} Center`,
        category: niche,
        websiteUrl: "https://example.com/harbor-care",
        phone: "+44 20 7946 0843",
        address: `45 Park Lane, ${location}`,
        city: location,
        country: "UK",
        rating: 4.2,
        reviewCount: 19,
      },
      {
        sourcePlaceId: `mock_place_3_${location.toLowerCase().replace(/\s+/g, "_")}`,
        name: `St. Jude Specialist ${niche}`,
        category: niche,
        websiteUrl: "https://example.com/st-jude",
        phone: "+44 20 7946 0119",
        address: `12 Victoria Road, ${location}`,
        city: location,
        country: "UK",
        rating: 3.9,
        reviewCount: 8,
      },
      {
        sourcePlaceId: `mock_place_4_${location.toLowerCase().replace(/\s+/g, "_")}`,
        name: `Metro ${niche} Solutions`,
        category: niche,
        websiteUrl: "https://example.com/metro-solutions",
        phone: "+44 20 7946 0554",
        address: `88 Station Square, ${location}`,
        city: location,
        country: "UK",
        rating: 4.6,
        reviewCount: 31,
      },
    ];

    if (sortOrder === "bottom-to-top") {
      mockData = mockData.reverse();
    } else if (sortOrder === "lowest-reviews") {
      mockData = mockData.sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0));
    }

    return mockData.slice(0, maxResults);
  }
}

import { z } from "zod";

// Mock data generators for Google Ads
const generateRandomMetric = (min: number, max: number, decimals = 2) => {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
};

const generateDateRange = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
};

// Google Ads Tools
export const googleAdsTools = {
  getGoogleAdsStats: {
    description:
      "Get Google Ads campaign statistics including CTR, CPC, impressions, clicks, and conversions",
    parameters: z.object({
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for statistics"),
      campaignId: z
        .string()
        .optional()
        .describe("Specific campaign ID (optional)"),
    }),
    execute: async (params: {
      timeframe: "7d" | "30d" | "90d";
      campaignId?: string;
    }) => {
      const days =
        params.timeframe === "7d" ? 7 : params.timeframe === "30d" ? 30 : 90;
      const dateRange = generateDateRange(days);

      const mockData = {
        dateRange,
        timeframe: params.timeframe,
        campaignId: params.campaignId || "all",
        metrics: {
          impressions: Math.floor(generateRandomMetric(10000, 500000, 0)),
          clicks: Math.floor(generateRandomMetric(500, 25000, 0)),
          ctr: generateRandomMetric(2.1, 8.5),
          cpc: generateRandomMetric(0.45, 3.2),
          cost: generateRandomMetric(1500, 15000),
          conversions: Math.floor(generateRandomMetric(25, 800, 0)),
          conversionRate: generateRandomMetric(1.2, 6.8),
          costPerConversion: generateRandomMetric(8.5, 45.0),
          qualityScore: generateRandomMetric(6.0, 9.5),
        },
        topCampaigns: [
          {
            id: "camp_001",
            name: "Summer Sale Campaign",
            status: "active",
            impressions: Math.floor(generateRandomMetric(5000, 50000, 0)),
            clicks: Math.floor(generateRandomMetric(200, 2500, 0)),
            ctr: generateRandomMetric(3.2, 7.1),
            cost: generateRandomMetric(800, 5000),
          },
          {
            id: "camp_002",
            name: "Black Friday Promotion",
            status: "active",
            impressions: Math.floor(generateRandomMetric(8000, 80000, 0)),
            clicks: Math.floor(generateRandomMetric(300, 4000, 0)),
            ctr: generateRandomMetric(2.8, 6.5),
            cost: generateRandomMetric(1200, 8000),
          },
          {
            id: "camp_003",
            name: "Brand Awareness",
            status: "paused",
            impressions: Math.floor(generateRandomMetric(2000, 20000, 0)),
            clicks: Math.floor(generateRandomMetric(80, 800, 0)),
            ctr: generateRandomMetric(1.5, 4.2),
            cost: generateRandomMetric(400, 2500),
          },
        ],
      };

      return {
        success: true,
        data: mockData,
      };
    },
  },

  getPaymentInfo: {
    name: "getGoogleAdsPaymentInfo",
    description:
      "Get Google Ads account payment information and billing status",
    parameters: z.object({}),
    execute: async () => {
      const paymentStatuses = ["current", "requires_payment", "suspended"];
      const selectedStatus =
        paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];

      return {
        success: true,
        data: {
          accountId: "123-456-7890",
          billingStatus: selectedStatus,
          currentBalance: generateRandomMetric(-500, 1000),
          monthlySpend: generateRandomMetric(2000, 15000),
          outstandingBalance:
            selectedStatus === "requires_payment"
              ? generateRandomMetric(315, 2500)
              : 0,
          nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          paymentMethod: {
            type: "credit_card",
            lastFour: "4567",
            expiryMonth: 12,
            expiryYear: 2025,
          },
          spendingLimit: {
            daily: 500,
            monthly: 15000,
          },
          alerts:
            selectedStatus === "requires_payment"
              ? [
                  {
                    type: "payment_required",
                    message: `Payment of $${generateRandomMetric(315, 2500)} is required to continue advertising`,
                    severity: "high",
                  },
                ]
              : [],
        },
      };
    },
  },

  getCampaigns: {
    name: "getGoogleAdsCampaigns",
    description:
      "Get list of all Google Ads campaigns with their current status and performance",
    parameters: z.object({
      status: z
        .enum(["all", "active", "paused", "removed"])
        .default("all")
        .describe("Filter campaigns by status"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("Number of campaigns to return"),
    }),
    execute: async (params: {
      status: "all" | "active" | "paused" | "removed";
      limit: number;
    }) => {
      const campaignTypes = [
        "Search",
        "Display",
        "Shopping",
        "Video",
        "Performance Max",
      ];
      const statuses = ["active", "paused", "removed"];

      const campaigns = Array.from({ length: params.limit }, (_, i) => ({
        id: `camp_${String(i + 1).padStart(3, "0")}`,
        name: `Campaign ${i + 1}`,
        type: campaignTypes[Math.floor(Math.random() * campaignTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        budget: {
          daily: generateRandomMetric(50, 500),
          type: "daily",
        },
        startDate: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0],
        metrics: {
          impressions: Math.floor(generateRandomMetric(1000, 50000, 0)),
          clicks: Math.floor(generateRandomMetric(50, 2500, 0)),
          cost: generateRandomMetric(200, 3000),
          conversions: Math.floor(generateRandomMetric(5, 150, 0)),
        },
      }));

      const filteredCampaigns =
        params.status === "all"
          ? campaigns
          : campaigns.filter((camp) => camp.status === params.status);

      return {
        success: true,
        data: {
          campaigns: filteredCampaigns,
          totalCount: filteredCampaigns.length,
          filters: {
            status: params.status,
            limit: params.limit,
          },
        },
      };
    },
  },

  getKeywords: {
    name: "getGoogleAdsKeywords",
    description:
      "Get keyword performance data including search terms, quality scores, and bid information",
    parameters: z.object({
      campaignId: z
        .string()
        .optional()
        .describe("Specific campaign ID to get keywords from"),
      sortBy: z
        .enum(["clicks", "impressions", "ctr", "cost", "quality_score"])
        .default("clicks")
        .describe("Sort keywords by metric"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of keywords to return"),
    }),
    execute: async (params: {
      campaignId?: string;
      sortBy: string;
      limit: number;
    }) => {
      const sampleKeywords = [
        "running shoes",
        "nike sneakers",
        "athletic footwear",
        "sport shoes online",
        "buy running shoes",
        "best running shoes",
        "marathon shoes",
        "trail running shoes",
        "women's running shoes",
        "men's athletic shoes",
        "discount sneakers",
        "premium running gear",
      ];

      const keywords = Array.from({ length: params.limit }, (_, i) => ({
        id: `kw_${String(i + 1).padStart(3, "0")}`,
        keyword:
          sampleKeywords[i % sampleKeywords.length] +
          (i >= sampleKeywords.length
            ? ` ${Math.floor(i / sampleKeywords.length) + 1}`
            : ""),
        matchType: ["exact", "phrase", "broad"][Math.floor(Math.random() * 3)],
        campaignId:
          params.campaignId ||
          `camp_${String(Math.floor(Math.random() * 5) + 1).padStart(3, "0")}`,
        bid: generateRandomMetric(0.5, 5.0),
        qualityScore: Math.floor(generateRandomMetric(4, 10, 0)),
        metrics: {
          impressions: Math.floor(generateRandomMetric(100, 10000, 0)),
          clicks: Math.floor(generateRandomMetric(5, 500, 0)),
          ctr: generateRandomMetric(1.0, 12.0),
          cost: generateRandomMetric(10, 800),
          avgPosition: generateRandomMetric(1.1, 4.5),
          conversions: Math.floor(generateRandomMetric(0, 25, 0)),
        },
        status: ["active", "paused"][Math.floor(Math.random() * 2)],
      }));

      return {
        success: true,
        data: {
          keywords,
          totalCount: keywords.length,
          campaignId: params.campaignId || "all",
          sortBy: params.sortBy,
        },
      };
    },
  },

  getAudienceInsights: {
    name: "getGoogleAdsAudienceInsights",
    description: "Get audience demographics and interests data for campaigns",
    parameters: z.object({
      campaignId: z
        .string()
        .optional()
        .describe("Specific campaign ID for audience data"),
      dimension: z
        .enum(["age", "gender", "device", "location"])
        .default("age")
        .describe("Audience dimension to analyze"),
    }),
    execute: async (params: { campaignId?: string; dimension: string }) => {
      const audienceData: Record<string, any> = {
        age: [
          {
            segment: "18-24",
            impressions: 15420,
            clicks: 892,
            cost: 2340.5,
            conversions: 45,
          },
          {
            segment: "25-34",
            impressions: 28934,
            clicks: 1567,
            cost: 4123.75,
            conversions: 89,
          },
          {
            segment: "35-44",
            impressions: 22156,
            clicks: 1234,
            cost: 3567.2,
            conversions: 72,
          },
          {
            segment: "45-54",
            impressions: 18765,
            clicks: 987,
            cost: 2890.15,
            conversions: 58,
          },
          {
            segment: "55-64",
            impressions: 12043,
            clicks: 654,
            cost: 1923.4,
            conversions: 34,
          },
          {
            segment: "65+",
            impressions: 8932,
            clicks: 423,
            cost: 1245.8,
            conversions: 21,
          },
        ],
        gender: [
          {
            segment: "Male",
            impressions: 52340,
            clicks: 2876,
            cost: 8234.5,
            conversions: 167,
          },
          {
            segment: "Female",
            impressions: 47160,
            clicks: 2654,
            cost: 7543.25,
            conversions: 152,
          },
          {
            segment: "Unknown",
            impressions: 6750,
            clicks: 327,
            cost: 1102.05,
            conversions: 18,
          },
        ],
        device: [
          {
            segment: "Mobile",
            impressions: 67230,
            clicks: 3245,
            cost: 9876.3,
            conversions: 198,
          },
          {
            segment: "Desktop",
            impressions: 28450,
            clicks: 1534,
            cost: 5432.7,
            conversions: 112,
          },
          {
            segment: "Tablet",
            impressions: 10570,
            clicks: 578,
            cost: 1570.8,
            conversions: 27,
          },
        ],
        location: [
          {
            segment: "New York",
            impressions: 18750,
            clicks: 1034,
            cost: 3245.8,
            conversions: 67,
          },
          {
            segment: "California",
            impressions: 22340,
            clicks: 1267,
            cost: 3890.45,
            conversions: 89,
          },
          {
            segment: "Texas",
            impressions: 16890,
            clicks: 923,
            cost: 2756.2,
            conversions: 54,
          },
          {
            segment: "Florida",
            impressions: 14560,
            clicks: 798,
            cost: 2134.75,
            conversions: 43,
          },
          {
            segment: "Others",
            impressions: 33710,
            clicks: 1835,
            cost: 4852.6,
            conversions: 84,
          },
        ],
      };

      return {
        success: true,
        data: {
          campaignId: params.campaignId || "all",
          dimension: params.dimension,
          segments: audienceData[params.dimension],
          totalImpressions: audienceData[params.dimension].reduce(
            (sum: number, seg: any) => sum + seg.impressions,
            0
          ),
          totalClicks: audienceData[params.dimension].reduce(
            (sum: number, seg: any) => sum + seg.clicks,
            0
          ),
          totalCost: audienceData[params.dimension].reduce(
            (sum: number, seg: any) => sum + seg.cost,
            0
          ),
          totalConversions: audienceData[params.dimension].reduce(
            (sum: number, seg: any) => sum + seg.conversions,
            0
          ),
        },
      };
    },
  },

  getCompetitorAnalysis: {
    name: "getGoogleAdsCompetitorAnalysis",
    description: "Get competitor insights and auction data for your campaigns",
    parameters: z.object({
      domain: z
        .string()
        .optional()
        .describe("Your domain to analyze against competitors"),
    }),
    execute: async (params: { domain?: string }) => {
      const competitors = [
        { domain: "competitor1.com", name: "Competitor One" },
        { domain: "competitor2.com", name: "Competitor Two" },
        { domain: "competitor3.com", name: "Competitor Three" },
        { domain: "competitor4.com", name: "Competitor Four" },
        { domain: "competitor5.com", name: "Competitor Five" },
      ];

      const competitorData = competitors.map((comp) => ({
        ...comp,
        metrics: {
          impressionShare: generateRandomMetric(5, 35),
          avgPosition: generateRandomMetric(1.2, 4.8),
          overlapRate: generateRandomMetric(15, 85),
          positionAboveRate: generateRandomMetric(10, 60),
          topOfPageRate: generateRandomMetric(20, 80),
          estimatedClicks: Math.floor(generateRandomMetric(500, 15000, 0)),
          estimatedCost: generateRandomMetric(1200, 12000),
        },
      }));

      return {
        success: true,
        data: {
          yourDomain: params.domain || "yourdomain.com",
          competitors: competitorData,
          yourMetrics: {
            impressionShare: generateRandomMetric(25, 45),
            avgPosition: generateRandomMetric(1.1, 2.8),
            topOfPageRate: generateRandomMetric(60, 90),
          },
          insights: [
            "Your impression share is competitive in this market",
            "Consider increasing bids for higher ad positions",
            "Competitor 2 shows strong performance in mobile traffic",
            "Your quality scores are above industry average",
          ],
        },
      };
    },
  },
};

export type GoogleAdsToolName = keyof typeof googleAdsTools;

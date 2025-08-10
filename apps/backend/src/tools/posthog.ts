import { z } from "zod";

// Mock data generators for PostHog
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

const eventNames = [
  "page_view",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "checkout_completed",
  "user_signup",
  "user_login",
  "search",
  "filter_applied",
  "product_clicked",
  "email_opened",
  "button_clicked",
  "form_submitted",
  "video_played",
];

const pageUrls = [
  "/",
  "/products",
  "/collections/bestsellers",
  "/about",
  "/contact",
  "/cart",
  "/checkout",
  "/account",
  "/search",
  "/blog",
  "/product/item-1",
  "/product/item-2",
];

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Japan",
];
const cities = [
  "New York",
  "Los Angeles",
  "London",
  "Berlin",
  "Paris",
  "Toronto",
  "Sydney",
  "Tokyo",
];
const browsers = ["Chrome", "Safari", "Firefox", "Edge", "Opera"];
const devices = ["Desktop", "Mobile", "Tablet"];

// PostHog Tools
export const posthogTools = {
  getEvents: {
    name: "getPostHogEvents",
    description:
      "Get event tracking data including user interactions, page views, and custom events",
    parameters: z.object({
      eventName: z
        .string()
        .optional()
        .describe("Filter by specific event name"),
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for events"),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(100)
        .describe("Number of events to return"),
    }),
    execute: async (params: {
      eventName?: string;
      timeframe: string;
      limit: number;
    }) => {
      const days =
        params.timeframe === "7d" ? 7 : params.timeframe === "30d" ? 30 : 90;

      const events = Array.from({ length: params.limit }, (_, i) => {
        const eventTime = new Date(
          Date.now() - Math.random() * days * 24 * 60 * 60 * 1000
        );
        const selectedEvent =
          params.eventName ||
          eventNames[Math.floor(Math.random() * eventNames.length)];

        return {
          id: `event_${String(i + 1).padStart(6, "0")}`,
          event: selectedEvent,
          timestamp: eventTime.toISOString(),
          distinctId: `user_${Math.floor(Math.random() * 10000)}`,
          properties: {
            $current_url: pageUrls[Math.floor(Math.random() * pageUrls.length)],
            $browser: browsers[Math.floor(Math.random() * browsers.length)],
            $device_type: devices[Math.floor(Math.random() * devices.length)],
            $country: countries[Math.floor(Math.random() * countries.length)],
            $city: cities[Math.floor(Math.random() * cities.length)],
            $referrer: Math.random() > 0.3 ? "https://google.com" : "$direct",
            ...(selectedEvent === "product_view" && {
              product_id: `prod_${String(Math.floor(Math.random() * 100) + 1).padStart(3, "0")}`,
              product_name: "Sample Product",
              product_price: generateRandomMetric(10, 500),
              category: "Electronics",
            }),
            ...(selectedEvent === "add_to_cart" && {
              product_id: `prod_${String(Math.floor(Math.random() * 100) + 1).padStart(3, "0")}`,
              quantity: Math.floor(generateRandomMetric(1, 5, 0)),
              value: generateRandomMetric(10, 500),
            }),
            ...(selectedEvent === "checkout_completed" && {
              order_id: `order_${String(Math.floor(Math.random() * 10000) + 1).padStart(6, "0")}`,
              revenue: generateRandomMetric(25, 1000),
              items_count: Math.floor(generateRandomMetric(1, 8, 0)),
            }),
          },
          sessionId: `session_${Math.floor(Math.random() * 5000)}`,
          person: {
            created_at: new Date(
              Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            properties: {
              email:
                Math.random() > 0.3
                  ? `user${Math.floor(Math.random() * 10000)}@example.com`
                  : null,
              name:
                Math.random() > 0.5
                  ? `User ${Math.floor(Math.random() * 10000)}`
                  : null,
              is_identified: Math.random() > 0.4,
            },
          },
        };
      });

      const filteredEvents = params.eventName
        ? events.filter((e) => e.event === params.eventName)
        : events;

      const eventSummary = {
        total: filteredEvents.length,
        unique_users: new Set(filteredEvents.map((e) => e.distinctId)).size,
        unique_sessions: new Set(filteredEvents.map((e) => e.sessionId)).size,
        top_events: eventNames
          .map((eventName) => ({
            event: eventName,
            count: filteredEvents.filter((e) => e.event === eventName).length,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      };

      return {
        success: true,
        data: {
          events: filteredEvents,
          eventSummary,
          timeframe: params.timeframe,
          filters: {
            eventName: params.eventName,
            limit: params.limit,
          },
        },
      };
    },
  },

  getFunnelAnalysis: {
    name: "getPostHogFunnelAnalysis",
    description:
      "Analyze conversion funnels to understand user journey and drop-off points",
    parameters: z.object({
      funnelType: z
        .enum(["purchase", "signup", "engagement"])
        .default("purchase")
        .describe("Type of funnel to analyze"),
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for funnel analysis"),
    }),
    execute: async (params: { funnelType: string; timeframe: string }) => {
      const funnelSteps: Record<string, any> = {
        purchase: [
          { step: 1, name: "Product View", event: "product_view" },
          { step: 2, name: "Add to Cart", event: "add_to_cart" },
          { step: 3, name: "Checkout Started", event: "checkout_started" },
          { step: 4, name: "Payment Info", event: "payment_info_added" },
          { step: 5, name: "Purchase Complete", event: "checkout_completed" },
        ],
        signup: [
          { step: 1, name: "Landing Page", event: "page_view" },
          { step: 2, name: "Signup Form View", event: "signup_form_view" },
          { step: 3, name: "Form Started", event: "signup_started" },
          { step: 4, name: "Email Entered", event: "email_entered" },
          { step: 5, name: "Signup Complete", event: "user_signup" },
        ],
        engagement: [
          { step: 1, name: "First Visit", event: "page_view" },
          { step: 2, name: "Product Browse", event: "product_view" },
          { step: 3, name: "Search Used", event: "search" },
          { step: 4, name: "Filter Applied", event: "filter_applied" },
          { step: 5, name: "Account Created", event: "user_signup" },
        ],
      };

      const selectedFunnel = funnelSteps[params.funnelType];
      let previousUsers = Math.floor(generateRandomMetric(5000, 20000, 0));

      const funnelData = selectedFunnel.map((step: any, index: number) => {
        const dropOffRate = generateRandomMetric(15, 40);
        const currentUsers =
          index === 0
            ? previousUsers
            : Math.floor(previousUsers * (1 - dropOffRate / 100));
        const conversionRate =
          index === 0
            ? 100
            : (currentUsers / selectedFunnel[0].users || previousUsers) * 100;

        previousUsers = currentUsers;

        return {
          ...step,
          users: currentUsers,
          conversionRate: Number(conversionRate.toFixed(2)),
          dropOffRate: index === 0 ? 0 : Number(dropOffRate.toFixed(2)),
          averageTime: generateRandomMetric(30, 600), // seconds
        };
      });

      // Update the first step to have the actual user count
      funnelData[0].users = Math.floor(generateRandomMetric(5000, 20000, 0));

      // Recalculate based on first step
      for (let i = 1; i < funnelData.length; i++) {
        const dropOffRate = generateRandomMetric(15, 40);
        funnelData[i].users = Math.floor(
          funnelData[i - 1].users * (1 - dropOffRate / 100)
        );
        funnelData[i].conversionRate =
          (funnelData[i].users / funnelData[0].users) * 100;
        funnelData[i].dropOffRate =
          ((funnelData[i - 1].users - funnelData[i].users) /
            funnelData[i - 1].users) *
          100;
      }

      const insights = [
        `${funnelData[0].users.toLocaleString()} users entered the ${params.funnelType} funnel`,
        `${funnelData[funnelData.length - 1].users.toLocaleString()} users completed the entire funnel (${funnelData[funnelData.length - 1].conversionRate.toFixed(1)}% conversion rate)`,
        `Biggest drop-off occurs at step ${funnelData.reduce((max, current, index) => (current.dropOffRate > funnelData[max].dropOffRate ? index : max), 1) + 1}: ${funnelData.reduce((max, current) => (current.dropOffRate > max.dropOffRate ? current : max), funnelData[1]).name}`,
        `Average time to complete funnel: ${Math.round(funnelData.reduce((sum, step) => sum + step.averageTime, 0) / 60)} minutes`,
      ];

      return {
        success: true,
        data: {
          funnelType: params.funnelType,
          timeframe: params.timeframe,
          steps: funnelData,
          overall: {
            totalEntrants: funnelData[0].users,
            totalCompletions: funnelData[funnelData.length - 1].users,
            overallConversionRate:
              funnelData[funnelData.length - 1].conversionRate,
            averageStepDropOff:
              funnelData
                .slice(1)
                .reduce((sum, step) => sum + step.dropOffRate, 0) /
              (funnelData.length - 1),
          },
          insights,
        },
      };
    },
  },

  getCohortAnalysis: {
    name: "getPostHogCohortAnalysis",
    description:
      "Analyze user cohorts to understand retention and behavior patterns over time",
    parameters: z.object({
      cohortType: z
        .enum(["weekly", "monthly"])
        .default("monthly")
        .describe("Cohort time period"),
      metric: z
        .enum(["retention", "revenue", "activity"])
        .default("retention")
        .describe("Metric to analyze"),
    }),
    execute: async (params: { cohortType: string; metric: string }) => {
      const periods = params.cohortType === "weekly" ? 12 : 6; // 12 weeks or 6 months
      const cohortSize = Math.floor(generateRandomMetric(500, 2000, 0));

      const cohorts = Array.from({ length: periods }, (_, i) => {
        const cohortDate = new Date();
        if (params.cohortType === "weekly") {
          cohortDate.setDate(cohortDate.getDate() - i * 7);
        } else {
          cohortDate.setMonth(cohortDate.getMonth() - i);
        }

        const periodData = Array.from({ length: periods - i }, (_, j) => {
          let value;
          if (params.metric === "retention") {
            // Retention typically decreases over time
            value = generateRandomMetric(Math.max(5, 80 - j * 10), 95 - j * 5);
          } else if (params.metric === "revenue") {
            // Revenue per user
            value = generateRandomMetric(20, 200);
          } else {
            // Activity (sessions per user)
            value = generateRandomMetric(1, 10);
          }
          return Number(value.toFixed(2));
        });

        return {
          cohortDate: cohortDate.toISOString().split("T")[0],
          cohortSize: Math.floor(generateRandomMetric(400, 1800, 0)),
          periods: periodData,
        };
      });

      const averages = Array.from({ length: periods }, (_, i) => {
        const values = cohorts
          .filter((cohort) => cohort.periods[i] !== undefined)
          .map((cohort) => cohort.periods[i]);
        return values.length > 0
          ? Number(
              (
                values.reduce((sum, val) => sum + val, 0) / values.length
              ).toFixed(2)
            )
          : 0;
      });

      return {
        success: true,
        data: {
          cohortType: params.cohortType,
          metric: params.metric,
          cohorts,
          averages,
          insights: [
            `${params.cohortType.charAt(0).toUpperCase() + params.cohortType.slice(1)} cohort analysis shows ${params.metric} patterns`,
            `Average ${params.metric} starts at ${averages[0]}${params.metric === "retention" ? "%" : ""}`,
            `${params.metric === "retention" ? "Retention" : "Value"} drops to ${averages[Math.min(3, averages.length - 1)]}${params.metric === "retention" ? "%" : ""} after ${params.cohortType === "weekly" ? "3 weeks" : "3 months"}`,
            `Most recent cohort shows ${cohorts[0].periods[0]} ${params.metric === "retention" ? "% retention" : params.metric === "revenue" ? "revenue per user" : "sessions per user"}`,
          ],
          summary: {
            totalCohorts: cohorts.length,
            averageStartingValue: averages[0],
            periodsTracked: averages.length,
            bestPerformingCohort: cohorts.reduce(
              (best, current) =>
                current.periods[0] > best.periods[0] ? current : best,
              cohorts[0]
            ),
          },
        },
      };
    },
  },

  getUserSegments: {
    name: "getPostHogUserSegments",
    description:
      "Get user segmentation data based on behavior, demographics, and engagement patterns",
    parameters: z.object({
      segmentType: z
        .enum(["behavior", "demographics", "engagement", "value"])
        .default("behavior")
        .describe("Type of segmentation"),
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for segmentation"),
    }),
    execute: async (params: { segmentType: string; timeframe: string }) => {
      const segmentData: Record<string, any> = {
        behavior: [
          {
            name: "Power Users",
            description: "Users with high engagement and frequent visits",
            count: Math.floor(generateRandomMetric(200, 800, 0)),
            criteria: "More than 20 sessions in the last 30 days",
            metrics: {
              averageSessions: generateRandomMetric(25, 50),
              averageSessionDuration: generateRandomMetric(300, 600),
              conversionRate: generateRandomMetric(8, 15),
            },
          },
          {
            name: "Regular Shoppers",
            description: "Users who make purchases regularly",
            count: Math.floor(generateRandomMetric(500, 1500, 0)),
            criteria: "2-3 purchases in the last 30 days",
            metrics: {
              averageSessions: generateRandomMetric(8, 20),
              averageSessionDuration: generateRandomMetric(180, 400),
              conversionRate: generateRandomMetric(12, 25),
            },
          },
          {
            name: "Browsers",
            description: "Users who browse but rarely purchase",
            count: Math.floor(generateRandomMetric(1000, 3000, 0)),
            criteria: "Multiple sessions, low purchase rate",
            metrics: {
              averageSessions: generateRandomMetric(3, 12),
              averageSessionDuration: generateRandomMetric(120, 300),
              conversionRate: generateRandomMetric(1, 4),
            },
          },
          {
            name: "One-time Visitors",
            description: "Users with single or very few visits",
            count: Math.floor(generateRandomMetric(2000, 5000, 0)),
            criteria: "1-2 sessions in the last 30 days",
            metrics: {
              averageSessions: generateRandomMetric(1, 2),
              averageSessionDuration: generateRandomMetric(60, 180),
              conversionRate: generateRandomMetric(0.5, 2),
            },
          },
        ],
        demographics: [
          {
            name: "Mobile Users",
            description: "Primarily mobile device users",
            count: Math.floor(generateRandomMetric(3000, 8000, 0)),
            criteria: "80%+ of sessions on mobile devices",
            properties: {
              device: "mobile",
              percentage: generateRandomMetric(65, 85),
            },
          },
          {
            name: "Desktop Users",
            description: "Primarily desktop users",
            count: Math.floor(generateRandomMetric(1500, 4000, 0)),
            criteria: "80%+ of sessions on desktop",
            properties: {
              device: "desktop",
              percentage: generateRandomMetric(15, 35),
            },
          },
          {
            name: "International Users",
            description: "Users from outside primary market",
            count: Math.floor(generateRandomMetric(800, 2500, 0)),
            criteria: "Located outside primary country",
            properties: {
              location: "international",
              countries: ["Canada", "UK", "Germany", "Australia"],
            },
          },
        ],
        engagement: [
          {
            name: "Highly Engaged",
            description: "Users with deep engagement patterns",
            count: Math.floor(generateRandomMetric(300, 1000, 0)),
            criteria: "High page views, long sessions, multiple return visits",
            score: generateRandomMetric(80, 100),
          },
          {
            name: "Moderately Engaged",
            description: "Users with medium engagement",
            count: Math.floor(generateRandomMetric(1000, 3000, 0)),
            criteria: "Regular visits, moderate session duration",
            score: generateRandomMetric(40, 79),
          },
          {
            name: "Low Engagement",
            description: "Users with minimal engagement",
            count: Math.floor(generateRandomMetric(2000, 6000, 0)),
            criteria: "Short sessions, infrequent visits",
            score: generateRandomMetric(1, 39),
          },
        ],
        value: [
          {
            name: "High Value Customers",
            description: "Customers with high lifetime value",
            count: Math.floor(generateRandomMetric(100, 400, 0)),
            criteria: "LTV > $500",
            averageValue: generateRandomMetric(500, 2000),
          },
          {
            name: "Medium Value Customers",
            description: "Customers with moderate spending",
            count: Math.floor(generateRandomMetric(400, 1200, 0)),
            criteria: "LTV $100-$500",
            averageValue: generateRandomMetric(100, 500),
          },
          {
            name: "Low Value Customers",
            description: "Customers with low spending",
            count: Math.floor(generateRandomMetric(800, 2500, 0)),
            criteria: "LTV < $100",
            averageValue: generateRandomMetric(10, 100),
          },
          {
            name: "Potential Customers",
            description: "Users who haven't made a purchase yet",
            count: Math.floor(generateRandomMetric(2000, 8000, 0)),
            criteria: "No purchases, but showing interest",
            averageValue: 0,
          },
        ],
      };

      const segments = segmentData[params.segmentType];
      const totalUsers = segments.reduce(
        (sum: number, segment: any) => sum + segment.count,
        0
      );

      return {
        success: true,
        data: {
          segmentType: params.segmentType,
          timeframe: params.timeframe,
          segments: segments.map((segment: any) => ({
            ...segment,
            percentage: Number(((segment.count / totalUsers) * 100).toFixed(1)),
          })),
          summary: {
            totalUsers,
            totalSegments: segments.length,
            largestSegment: segments.reduce(
              (largest: any, current: any) =>
                current.count > largest.count ? current : largest,
              segments[0]
            ),
            insights: [
              `${segments[0].name} represents the largest segment with ${segments[0].count.toLocaleString()} users`,
              `Total analyzed users: ${totalUsers.toLocaleString()}`,
              `Segmentation shows clear behavioral patterns across ${segments.length} distinct groups`,
            ],
          },
        },
      };
    },
  },

  getFeatureFlags: {
    name: "getPostHogFeatureFlags",
    description:
      "Get feature flag data including rollout status, user exposure, and performance metrics",
    parameters: z.object({
      flagStatus: z
        .enum(["all", "active", "inactive", "archived"])
        .default("active")
        .describe("Filter by flag status"),
    }),
    execute: async (params: { flagStatus: string }) => {
      const flagNames = [
        "new_checkout_flow",
        "mobile_app_promotion",
        "premium_features",
        "dark_mode",
        "advanced_search",
        "social_login",
        "recommendation_engine",
        "live_chat",
        "express_shipping",
        "loyalty_program",
        "product_reviews",
        "wishlist_feature",
      ];

      const statuses = ["active", "inactive", "archived"];

      const flags = flagNames.map((name, i) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const rolloutPercentage =
          status === "active" ? generateRandomMetric(10, 100) : 0;
        const totalUsers = Math.floor(generateRandomMetric(1000, 10000, 0));
        const exposedUsers = Math.floor(totalUsers * (rolloutPercentage / 100));

        return {
          id: `flag_${String(i + 1).padStart(3, "0")}`,
          name,
          description: `Feature flag for ${name.replace(/_/g, " ")}`,
          status,
          rolloutPercentage: Number(rolloutPercentage.toFixed(1)),
          userGroups: ["all_users", "beta_users", "premium_users"][
            Math.floor(Math.random() * 3)
          ],
          metrics: {
            totalUsers,
            exposedUsers,
            conversionRate: generateRandomMetric(2, 12),
            clickThrough: generateRandomMetric(5, 25),
            retention: generateRandomMetric(60, 90),
          },
          performance: {
            controlGroup: {
              users: totalUsers - exposedUsers,
              conversionRate: generateRandomMetric(3, 8),
              averageValue: generateRandomMetric(50, 150),
            },
            testGroup: {
              users: exposedUsers,
              conversionRate: generateRandomMetric(4, 12),
              averageValue: generateRandomMetric(55, 180),
            },
          },
          createdAt: new Date(
            Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
          ).toISOString(),
          lastModified: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      });

      const filteredFlags =
        params.flagStatus === "all"
          ? flags
          : flags.filter((flag) => flag.status === params.flagStatus);

      const flagSummary = {
        total: filteredFlags.length,
        active: filteredFlags.filter((f) => f.status === "active").length,
        inactive: filteredFlags.filter((f) => f.status === "inactive").length,
        archived: filteredFlags.filter((f) => f.status === "archived").length,
        averageRollout:
          filteredFlags.reduce((sum, f) => sum + f.rolloutPercentage, 0) /
            filteredFlags.length || 0,
        totalExposedUsers: filteredFlags.reduce(
          (sum, f) => sum + f.metrics.exposedUsers,
          0
        ),
      };

      return {
        success: true,
        data: {
          flags: filteredFlags,
          flagSummary,
          filters: {
            flagStatus: params.flagStatus,
          },
          insights: [
            `${flagSummary.active} feature flags are currently active`,
            `Average rollout percentage: ${flagSummary.averageRollout.toFixed(1)}%`,
            `Total users exposed to feature flags: ${flagSummary.totalExposedUsers.toLocaleString()}`,
            filteredFlags.length > 0
              ? `Best performing flag: ${
                  filteredFlags.reduce(
                    (best, current) =>
                      current.performance.testGroup.conversionRate >
                      best.performance.testGroup.conversionRate
                        ? current
                        : best,
                    filteredFlags[0]
                  ).name
                }`
              : "No flags to analyze",
          ],
        },
      };
    },
  },

  getInsights: {
    name: "getPostHogInsights",
    description:
      "Get AI-powered insights and recommendations based on user behavior data",
    parameters: z.object({
      insightType: z
        .enum(["trends", "anomalies", "opportunities", "recommendations"])
        .default("trends")
        .describe("Type of insights to generate"),
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for insights"),
    }),
    execute: async (params: { insightType: string; timeframe: string }) => {
      const insightData: Record<string, any> = {
        trends: [
          {
            title: "Mobile Traffic Surge",
            description:
              "Mobile traffic has increased by 35% compared to the previous period",
            impact: "high",
            metric: "mobile_sessions",
            change: "+35%",
            recommendation:
              "Optimize mobile checkout flow to capitalize on increased mobile traffic",
          },
          {
            title: "Weekend Conversion Drop",
            description: "Conversion rates drop significantly on weekends",
            impact: "medium",
            metric: "weekend_conversion",
            change: "-18%",
            recommendation:
              "Consider weekend-specific promotions or adjusted marketing campaigns",
          },
          {
            title: "Search Feature Usage Growth",
            description: "Internal search usage has grown steadily",
            impact: "medium",
            metric: "search_usage",
            change: "+22%",
            recommendation:
              "Improve search results and consider adding advanced filtering options",
          },
        ],
        anomalies: [
          {
            title: "Unusual Spike in Bounce Rate",
            description: "Bounce rate increased unexpectedly on product pages",
            severity: "high",
            detectedAt: new Date(
              Date.now() - 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
            affectedPages: [
              "/product/item-1",
              "/product/item-2",
              "/collections/electronics",
            ],
            possibleCauses: [
              "Page loading issues",
              "Broken images",
              "Payment form errors",
            ],
          },
          {
            title: "Cart Abandonment Increase",
            description: "Cart abandonment rate spiked beyond normal range",
            severity: "medium",
            detectedAt: new Date(
              Date.now() - 5 * 24 * 60 * 60 * 1000
            ).toISOString(),
            affectedPages: ["/cart", "/checkout"],
            possibleCauses: [
              "Shipping cost surprise",
              "Complex checkout process",
              "Payment method issues",
            ],
          },
        ],
        opportunities: [
          {
            title: "Untapped International Market",
            description: "High traffic from German users with low conversion",
            potential: "high",
            currentMetric: "2.1% conversion rate from German traffic",
            opportunity:
              "Localize pricing and payment methods for German market",
            estimatedImpact: "+$25,000 monthly revenue",
          },
          {
            title: "Email Campaign Optimization",
            description:
              "Email subscribers show high engagement but low purchase completion",
            potential: "medium",
            currentMetric: "78% email open rate, 3.2% purchase rate",
            opportunity:
              "Create targeted email sequences for engaged subscribers",
            estimatedImpact: "+$12,000 monthly revenue",
          },
          {
            title: "Mobile App Promotion Gap",
            description: "High mobile web usage but low app downloads",
            potential: "medium",
            currentMetric: "65% mobile traffic, 8% app download rate",
            opportunity: "Implement app download incentives and banners",
            estimatedImpact: "+2,500 app downloads monthly",
          },
        ],
        recommendations: [
          {
            priority: "high",
            category: "conversion_optimization",
            title: "Implement Exit-Intent Popups",
            description:
              "Add exit-intent popups on key pages to recover abandoning users",
            expectedImpact: "5-8% reduction in bounce rate",
            effort: "low",
            implementation:
              "Add popup library and configure triggers for product and checkout pages",
          },
          {
            priority: "high",
            category: "user_experience",
            title: "Optimize Page Load Speed",
            description:
              "Several pages show slow loading times affecting user experience",
            expectedImpact: "10-15% improvement in conversion rate",
            effort: "medium",
            implementation:
              "Compress images, implement lazy loading, optimize CSS/JS bundles",
          },
          {
            priority: "medium",
            category: "personalization",
            title: "Add Product Recommendations",
            description:
              "Implement personalized product recommendations based on browsing history",
            expectedImpact: "8-12% increase in average order value",
            effort: "high",
            implementation:
              "Set up recommendation engine using PostHog data and user behavior patterns",
          },
          {
            priority: "medium",
            category: "retention",
            title: "Create Onboarding Flow",
            description:
              "Guide new users through key features to improve retention",
            expectedImpact: "20-30% improvement in day-7 retention",
            effort: "medium",
            implementation:
              "Design multi-step onboarding with tooltips and progress indicators",
          },
        ],
      };

      const selectedInsights = insightData[params.insightType];

      return {
        success: true,
        data: {
          insightType: params.insightType,
          timeframe: params.timeframe,
          insights: selectedInsights,
          summary: {
            totalInsights: selectedInsights.length,
            highPriority: selectedInsights.filter(
              (insight: any) =>
                insight.priority === "high" ||
                insight.impact === "high" ||
                insight.severity === "high"
            ).length,
            actionable: selectedInsights.filter(
              (insight: any) =>
                insight.recommendation ||
                insight.opportunity ||
                insight.implementation
            ).length,
          },
          lastUpdated: new Date().toISOString(),
          dataQuality: {
            score: generateRandomMetric(85, 98),
            coverage: generateRandomMetric(90, 99),
            confidence: generateRandomMetric(80, 95),
          },
        },
      };
    },
  },
};

export type PostHogToolName = keyof typeof posthogTools;

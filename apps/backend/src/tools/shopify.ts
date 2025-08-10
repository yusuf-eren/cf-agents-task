import { z } from "zod";

// Mock data generators for Shopify
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

const productNames = [
  "Wireless Bluetooth Headphones",
  "Smart Fitness Tracker",
  "Organic Cotton T-Shirt",
  "Premium Coffee Beans",
  "Stainless Steel Water Bottle",
  "Eco-Friendly Yoga Mat",
  "Designer Sunglasses",
  "Laptop Backpack",
  "Essential Oil Diffuser",
  "Phone Case",
  "Running Shoes",
  "Skincare Set",
  "Kitchen Knife Set",
  "Bluetooth Speaker",
  "Desk Organizer",
  "Travel Mug",
  "Workout Leggings",
  "Board Game",
];

const customerNames = [
  "John Smith",
  "Emma Johnson",
  "Michael Brown",
  "Sarah Davis",
  "David Wilson",
  "Lisa Anderson",
  "James Taylor",
  "Jennifer Martinez",
  "Robert Garcia",
  "Mary Rodriguez",
];

// Shopify Tools
export const shopifyTools = {
  getStoreStats: {
    name: "getShopifyStoreStats",
    description:
      "Get overall store statistics including sales, orders, customers, and revenue",
    parameters: z.object({
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for statistics"),
    }),
    execute: async (params: { timeframe: "7d" | "30d" | "90d" }) => {
      const days =
        params.timeframe === "7d" ? 7 : params.timeframe === "30d" ? 30 : 90;
      const dateRange = generateDateRange(days);

      return {
        success: true,
        data: {
          dateRange,
          timeframe: params.timeframe,
          revenue: {
            total: generateRandomMetric(15000, 150000),
            previousPeriod: generateRandomMetric(12000, 140000),
            growth: generateRandomMetric(-15, 35),
            currency: "USD",
          },
          orders: {
            total: Math.floor(generateRandomMetric(200, 2500, 0)),
            previousPeriod: Math.floor(generateRandomMetric(180, 2300, 0)),
            growth: generateRandomMetric(-10, 40),
            averageOrderValue: generateRandomMetric(45, 180),
          },
          customers: {
            total: Math.floor(generateRandomMetric(150, 1800, 0)),
            new: Math.floor(generateRandomMetric(30, 400, 0)),
            returning: Math.floor(generateRandomMetric(50, 800, 0)),
            retentionRate: generateRandomMetric(25, 75),
          },
          traffic: {
            totalSessions: Math.floor(generateRandomMetric(5000, 50000, 0)),
            conversionRate: generateRandomMetric(1.5, 8.5),
            bounceRate: generateRandomMetric(35, 70),
            averageSessionDuration: Math.floor(
              generateRandomMetric(120, 480, 0)
            ), // seconds
          },
        },
      };
    },
  },

  getInventory: {
    name: "getShopifyInventory",
    description: "Get inventory levels, stock status, and product availability",
    parameters: z.object({
      lowStockThreshold: z
        .number()
        .min(0)
        .default(10)
        .describe("Threshold for considering items as low stock"),
      category: z.string().optional().describe("Filter by product category"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of products to return"),
    }),
    execute: async (params: {
      lowStockThreshold: number;
      category?: string;
      limit: number;
    }) => {
      const categories = [
        "Electronics",
        "Clothing",
        "Health & Beauty",
        "Home & Garden",
        "Sports",
      ];

      const products = Array.from({ length: params.limit }, (_, i) => {
        const stock = Math.floor(generateRandomMetric(0, 200, 0));
        return {
          id: `prod_${String(i + 1).padStart(4, "0")}`,
          title:
            productNames[i % productNames.length] +
            (i >= productNames.length
              ? ` ${Math.floor(i / productNames.length) + 1}`
              : ""),
          sku: `SKU-${String(i + 1).padStart(4, "0")}`,
          category: categories[Math.floor(Math.random() * categories.length)],
          price: generateRandomMetric(9.99, 299.99),
          stock: {
            quantity: stock,
            status:
              stock === 0
                ? "out_of_stock"
                : stock <= params.lowStockThreshold
                  ? "low_stock"
                  : "in_stock",
            reserved: Math.floor(
              generateRandomMetric(0, Math.min(stock, 20), 0)
            ),
            available: Math.max(
              0,
              stock -
                Math.floor(generateRandomMetric(0, Math.min(stock, 20), 0))
            ),
          },
          sales: {
            last7Days: Math.floor(generateRandomMetric(0, 50, 0)),
            last30Days: Math.floor(generateRandomMetric(5, 200, 0)),
            totalSold: Math.floor(generateRandomMetric(50, 2000, 0)),
          },
          vendor: `Vendor ${Math.floor(Math.random() * 10) + 1}`,
          createdAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      });

      const filteredProducts = params.category
        ? products.filter((p) =>
            p.category.toLowerCase().includes(params.category!.toLowerCase())
          )
        : products;

      const stockSummary = {
        total: filteredProducts.length,
        inStock: filteredProducts.filter((p) => p.stock.status === "in_stock")
          .length,
        lowStock: filteredProducts.filter((p) => p.stock.status === "low_stock")
          .length,
        outOfStock: filteredProducts.filter(
          (p) => p.stock.status === "out_of_stock"
        ).length,
        totalValue: filteredProducts.reduce(
          (sum, p) => sum + p.price * p.stock.quantity,
          0
        ),
      };

      return {
        success: true,
        data: {
          products: filteredProducts,
          stockSummary,
          filters: {
            category: params.category,
            lowStockThreshold: params.lowStockThreshold,
            limit: params.limit,
          },
        },
      };
    },
  },

  getOrders: {
    name: "getShopifyOrders",
    description:
      "Get order information including recent orders, order status, and fulfillment details",
    parameters: z.object({
      status: z
        .enum(["all", "pending", "fulfilled", "cancelled", "refunded"])
        .default("all")
        .describe("Filter orders by status"),
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for orders"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of orders to return"),
    }),
    execute: async (params: {
      status: string;
      timeframe: string;
      limit: number;
    }) => {
      const days =
        params.timeframe === "7d" ? 7 : params.timeframe === "30d" ? 30 : 90;
      const statuses = ["pending", "fulfilled", "cancelled", "refunded"];
      const paymentStatuses = ["paid", "pending", "failed", "refunded"];

      const orders = Array.from({ length: params.limit }, (_, i) => {
        const orderStatus =
          statuses[Math.floor(Math.random() * statuses.length)];
        const itemCount = Math.floor(generateRandomMetric(1, 5, 0));
        const orderValue = generateRandomMetric(25, 500);

        return {
          id: `order_${String(i + 1).padStart(6, "0")}`,
          orderNumber: `#${1000 + i}`,
          customer: {
            name: customerNames[
              Math.floor(Math.random() * customerNames.length)
            ],
            email: `customer${i + 1}@example.com`,
            isReturning: Math.random() > 0.3,
          },
          status: orderStatus,
          paymentStatus:
            paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)],
          financial: {
            subtotal: orderValue,
            tax: orderValue * 0.08,
            shipping: generateRandomMetric(0, 15),
            total: orderValue * 1.08 + generateRandomMetric(0, 15),
            currency: "USD",
          },
          items: Array.from({ length: itemCount }, (_, j) => ({
            productId: `prod_${String(j + 1).padStart(4, "0")}`,
            title: productNames[j % productNames.length],
            quantity: Math.floor(generateRandomMetric(1, 3, 0)),
            price: generateRandomMetric(10, 100),
          })),
          shipping: {
            address: {
              city: [
                "New York",
                "Los Angeles",
                "Chicago",
                "Houston",
                "Phoenix",
              ][Math.floor(Math.random() * 5)],
              state: ["NY", "CA", "IL", "TX", "AZ"][
                Math.floor(Math.random() * 5)
              ],
              country: "United States",
              zip: String(Math.floor(Math.random() * 90000) + 10000),
            },
            method: ["Standard", "Express", "Overnight"][
              Math.floor(Math.random() * 3)
            ],
            trackingNumber:
              Math.random() > 0.5
                ? `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`
                : null,
          },
          createdAt: new Date(
            Date.now() - Math.random() * days * 24 * 60 * 60 * 1000
          ).toISOString(),
          updatedAt: new Date(
            Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      });

      const filteredOrders =
        params.status === "all"
          ? orders
          : orders.filter((order) => order.status === params.status);

      const orderSummary = {
        total: filteredOrders.length,
        pending: filteredOrders.filter((o) => o.status === "pending").length,
        fulfilled: filteredOrders.filter((o) => o.status === "fulfilled")
          .length,
        cancelled: filteredOrders.filter((o) => o.status === "cancelled")
          .length,
        refunded: filteredOrders.filter((o) => o.status === "refunded").length,
        totalRevenue: filteredOrders.reduce(
          (sum, o) => sum + o.financial.total,
          0
        ),
        averageOrderValue:
          filteredOrders.reduce((sum, o) => sum + o.financial.total, 0) /
            filteredOrders.length || 0,
      };

      return {
        success: true,
        data: {
          orders: filteredOrders,
          orderSummary,
          filters: {
            status: params.status,
            timeframe: params.timeframe,
            limit: params.limit,
          },
        },
      };
    },
  },

  getCustomers: {
    name: "getShopifyCustomers",
    description:
      "Get customer information including purchase history, lifetime value, and segments",
    parameters: z.object({
      segment: z
        .enum(["all", "new", "returning", "vip", "at_risk"])
        .default("all")
        .describe("Customer segment filter"),
      sortBy: z
        .enum(["lifetime_value", "last_order", "total_orders", "created_at"])
        .default("lifetime_value")
        .describe("Sort customers by"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of customers to return"),
    }),
    execute: async (params: {
      segment: string;
      sortBy: string;
      limit: number;
    }) => {
      const segments = ["new", "returning", "vip", "at_risk"];
      const locations = [
        "New York, NY",
        "Los Angeles, CA",
        "Chicago, IL",
        "Houston, TX",
        "Phoenix, AZ",
      ];

      const customers = Array.from({ length: params.limit }, (_, i) => {
        const totalOrders = Math.floor(generateRandomMetric(1, 50, 0));
        const lifetimeValue = generateRandomMetric(50, 5000);
        const daysSinceLastOrder = Math.floor(generateRandomMetric(1, 365, 0));

        return {
          id: `cust_${String(i + 1).padStart(6, "0")}`,
          name:
            customerNames[i % customerNames.length] +
            (i >= customerNames.length
              ? ` ${Math.floor(i / customerNames.length) + 1}`
              : ""),
          email: `customer${i + 1}@example.com`,
          phone: `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          segment: segments[Math.floor(Math.random() * segments.length)],
          location: locations[Math.floor(Math.random() * locations.length)],
          metrics: {
            totalOrders,
            lifetimeValue,
            averageOrderValue: lifetimeValue / totalOrders,
            lastOrderDate: new Date(
              Date.now() - daysSinceLastOrder * 24 * 60 * 60 * 1000
            )
              .toISOString()
              .split("T")[0],
            daysSinceLastOrder,
            totalSpent: lifetimeValue,
          },
          preferences: {
            emailMarketing: Math.random() > 0.3,
            smsMarketing: Math.random() > 0.7,
            preferredCategory: [
              "Electronics",
              "Clothing",
              "Health & Beauty",
              "Home & Garden",
            ][Math.floor(Math.random() * 4)],
          },
          risk: {
            level:
              daysSinceLastOrder > 180
                ? "high"
                : daysSinceLastOrder > 90
                  ? "medium"
                  : "low",
            score: Math.floor(generateRandomMetric(1, 100, 0)),
          },
          createdAt: new Date(
            Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000
          ).toISOString(),
          tags: [
            "loyal",
            "big_spender",
            "email_subscriber",
            "mobile_user",
          ].filter(() => Math.random() > 0.6),
        };
      });

      const filteredCustomers =
        params.segment === "all"
          ? customers
          : customers.filter((customer) => customer.segment === params.segment);

      const customerSummary = {
        total: filteredCustomers.length,
        segments: {
          new: filteredCustomers.filter((c) => c.segment === "new").length,
          returning: filteredCustomers.filter((c) => c.segment === "returning")
            .length,
          vip: filteredCustomers.filter((c) => c.segment === "vip").length,
          atRisk: filteredCustomers.filter((c) => c.segment === "at_risk")
            .length,
        },
        totalLifetimeValue: filteredCustomers.reduce(
          (sum, c) => sum + c.metrics.lifetimeValue,
          0
        ),
        averageLifetimeValue:
          filteredCustomers.reduce(
            (sum, c) => sum + c.metrics.lifetimeValue,
            0
          ) / filteredCustomers.length || 0,
        emailSubscribers: filteredCustomers.filter(
          (c) => c.preferences.emailMarketing
        ).length,
      };

      return {
        success: true,
        data: {
          customers: filteredCustomers,
          customerSummary,
          filters: {
            segment: params.segment,
            sortBy: params.sortBy,
            limit: params.limit,
          },
        },
      };
    },
  },

  getProducts: {
    name: "getShopifyProducts",
    description:
      "Get product catalog information including bestsellers, performance metrics, and variants",
    parameters: z.object({
      category: z.string().optional().describe("Filter by product category"),
      sortBy: z
        .enum(["sales", "revenue", "views", "created_at", "price"])
        .default("sales")
        .describe("Sort products by metric"),
      limit: z
        .number()
        .min(1)
        .max(100)
        .default(20)
        .describe("Number of products to return"),
    }),
    execute: async (params: {
      category?: string;
      sortBy: string;
      limit: number;
    }) => {
      const categories = [
        "Electronics",
        "Clothing",
        "Health & Beauty",
        "Home & Garden",
        "Sports",
      ];
      const vendors = ["Brand A", "Brand B", "Brand C", "Brand D", "Brand E"];

      const products = Array.from({ length: params.limit }, (_, i) => {
        const unitsSold = Math.floor(generateRandomMetric(10, 1000, 0));
        const price = generateRandomMetric(9.99, 299.99);

        return {
          id: `prod_${String(i + 1).padStart(4, "0")}`,
          title:
            productNames[i % productNames.length] +
            (i >= productNames.length
              ? ` ${Math.floor(i / productNames.length) + 1}`
              : ""),
          handle:
            productNames[i % productNames.length]
              .toLowerCase()
              .replace(/ /g, "-") +
            (i >= productNames.length
              ? `-${Math.floor(i / productNames.length) + 1}`
              : ""),
          category: categories[Math.floor(Math.random() * categories.length)],
          vendor: vendors[Math.floor(Math.random() * vendors.length)],
          pricing: {
            price,
            compareAtPrice:
              Math.random() > 0.7
                ? price * generateRandomMetric(1.1, 1.5)
                : null,
            cost: price * generateRandomMetric(0.3, 0.7),
            margin: generateRandomMetric(20, 70),
          },
          inventory: {
            totalStock: Math.floor(generateRandomMetric(0, 500, 0)),
            variants: Math.floor(generateRandomMetric(1, 5, 0)),
            availableForSale: Math.random() > 0.1,
          },
          performance: {
            unitsSold,
            revenue: unitsSold * price,
            views: Math.floor(
              generateRandomMetric(unitsSold, unitsSold * 10, 0)
            ),
            conversionRate: generateRandomMetric(1, 15),
            returnRate: generateRandomMetric(0, 8),
          },
          seo: {
            metaTitle: `${productNames[i % productNames.length]} - Best Quality`,
            metaDescription: `High-quality ${productNames[i % productNames.length].toLowerCase()} with great features and competitive pricing.`,
            searchTerms: productNames[i % productNames.length]
              .toLowerCase()
              .split(" "),
          },
          status: ["active", "draft", "archived"][
            Math.floor(Math.random() * 3)
          ],
          createdAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updatedAt: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          tags: ["bestseller", "new", "featured", "sale"].filter(
            () => Math.random() > 0.7
          ),
        };
      });

      const filteredProducts = params.category
        ? products.filter((p) =>
            p.category.toLowerCase().includes(params.category!.toLowerCase())
          )
        : products;

      const productSummary = {
        total: filteredProducts.length,
        active: filteredProducts.filter((p) => p.status === "active").length,
        draft: filteredProducts.filter((p) => p.status === "draft").length,
        archived: filteredProducts.filter((p) => p.status === "archived")
          .length,
        totalRevenue: filteredProducts.reduce(
          (sum, p) => sum + p.performance.revenue,
          0
        ),
        totalUnitsSold: filteredProducts.reduce(
          (sum, p) => sum + p.performance.unitsSold,
          0
        ),
        averagePrice:
          filteredProducts.reduce((sum, p) => sum + p.pricing.price, 0) /
            filteredProducts.length || 0,
      };

      return {
        success: true,
        data: {
          products: filteredProducts,
          productSummary,
          filters: {
            category: params.category,
            sortBy: params.sortBy,
            limit: params.limit,
          },
        },
      };
    },
  },

  getAnalytics: {
    name: "getShopifyAnalytics",
    description:
      "Get detailed analytics including traffic sources, conversion funnels, and performance trends",
    parameters: z.object({
      metric: z
        .enum(["traffic", "conversion", "revenue", "customers"])
        .default("traffic")
        .describe("Primary metric to analyze"),
      timeframe: z
        .enum(["7d", "30d", "90d"])
        .default("30d")
        .describe("Time period for analytics"),
    }),
    execute: async (params: { metric: string; timeframe: string }) => {
      const days =
        params.timeframe === "7d" ? 7 : params.timeframe === "30d" ? 30 : 90;

      const trafficSources = [
        {
          source: "Organic Search",
          sessions: Math.floor(generateRandomMetric(1000, 15000, 0)),
          conversionRate: generateRandomMetric(2, 8),
        },
        {
          source: "Direct",
          sessions: Math.floor(generateRandomMetric(800, 12000, 0)),
          conversionRate: generateRandomMetric(3, 10),
        },
        {
          source: "Social Media",
          sessions: Math.floor(generateRandomMetric(500, 8000, 0)),
          conversionRate: generateRandomMetric(1, 5),
        },
        {
          source: "Email Marketing",
          sessions: Math.floor(generateRandomMetric(200, 3000, 0)),
          conversionRate: generateRandomMetric(8, 25),
        },
        {
          source: "Paid Ads",
          sessions: Math.floor(generateRandomMetric(300, 5000, 0)),
          conversionRate: generateRandomMetric(4, 15),
        },
        {
          source: "Referral",
          sessions: Math.floor(generateRandomMetric(100, 2000, 0)),
          conversionRate: generateRandomMetric(2, 12),
        },
      ];

      const dailyData = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          date: date.toISOString().split("T")[0],
          sessions: Math.floor(generateRandomMetric(200, 2000, 0)),
          pageViews: Math.floor(generateRandomMetric(500, 5000, 0)),
          orders: Math.floor(generateRandomMetric(10, 100, 0)),
          revenue: generateRandomMetric(500, 8000),
          conversionRate: generateRandomMetric(1.5, 8.5),
          averageOrderValue: generateRandomMetric(45, 180),
        };
      });

      return {
        success: true,
        data: {
          timeframe: params.timeframe,
          metric: params.metric,
          overview: {
            totalSessions: trafficSources.reduce(
              (sum, source) => sum + source.sessions,
              0
            ),
            totalRevenue: dailyData.reduce((sum, day) => sum + day.revenue, 0),
            totalOrders: dailyData.reduce((sum, day) => sum + day.orders, 0),
            averageConversionRate:
              dailyData.reduce((sum, day) => sum + day.conversionRate, 0) /
              dailyData.length,
          },
          trafficSources,
          dailyTrends: dailyData,
          topPages: [
            {
              page: "/",
              views: Math.floor(generateRandomMetric(2000, 20000, 0)),
              bounceRate: generateRandomMetric(30, 70),
            },
            {
              page: "/products",
              views: Math.floor(generateRandomMetric(1500, 15000, 0)),
              bounceRate: generateRandomMetric(25, 60),
            },
            {
              page: "/collections/bestsellers",
              views: Math.floor(generateRandomMetric(1000, 10000, 0)),
              bounceRate: generateRandomMetric(20, 55),
            },
            {
              page: "/about",
              views: Math.floor(generateRandomMetric(500, 5000, 0)),
              bounceRate: generateRandomMetric(35, 75),
            },
            {
              page: "/contact",
              views: Math.floor(generateRandomMetric(300, 3000, 0)),
              bounceRate: generateRandomMetric(40, 80),
            },
          ],
          deviceBreakdown: {
            mobile: {
              percentage: generateRandomMetric(50, 70),
              conversionRate: generateRandomMetric(2, 6),
            },
            desktop: {
              percentage: generateRandomMetric(25, 40),
              conversionRate: generateRandomMetric(4, 10),
            },
            tablet: {
              percentage: generateRandomMetric(5, 15),
              conversionRate: generateRandomMetric(3, 8),
            },
          },
        },
      };
    },
  },
};

export type ShopifyToolName = keyof typeof shopifyTools;

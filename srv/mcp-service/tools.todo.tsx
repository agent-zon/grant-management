import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default function register(
  server: McpServer,
  tools: Record<string, RegisteredTool>
) {
  // Helper function to generate random ID
  const generateId = (prefix: string) => {
    return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // ============================================================================
  // Email Inbox Tools
  // ============================================================================

  tools["messages_search"] = server.registerTool(
    "messages_search",
    {
      title: "Search Messages",
      description: "Search for email messages in the inbox",
      inputSchema: {
        query: z.string().optional(),
        folder: z.string().optional().default("inbox"),
        limit: z.number().int().min(1).max(500).optional().default(50),
        from: z.string().optional(),
        subject: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      },
      outputSchema: {
        messages: z.array(
          z.object({
            id: z.string(),
            from: z.string(),
            to: z.array(z.string()),
            subject: z.string(),
            body: z.string(),
            date: z.string(),
            folder: z.string(),
            read: z.boolean(),
          })
        ),
      },
    },
    async ({ query, folder = "inbox", limit = 50, from, subject, dateFrom, dateTo }) => {
      // Generate mock messages
      const mockMessages = Array.from({ length: Math.min(limit, 10) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        return {
          id: generateId("msg"),
          from: from || `sender${i + 1}@example.com`,
          to: ["user@example.com"],
          subject: subject || `Message ${i + 1}: ${query || "Important Update"}`,
          body: `This is the body of message ${i + 1}. ${query ? `Related to: ${query}` : "Content here..."}`,
          date: date.toISOString(),
          folder,
          read: i % 3 === 0,
        };
      });

      return {
        content: [
          { type: "text", text: JSON.stringify({ messages: mockMessages }) },
        ],
        structuredContent: { messages: mockMessages },
      };
    }
  );

  tools["messages_read"] = server.registerTool(
    "messages_read",
    {
      title: "Read Message",
      description: "Read the content of a specific email message",
      inputSchema: {
        messageId: z.string(),
        includeAttachments: z.boolean().optional().default(false),
      },
      outputSchema: {
        message: z.object({
          id: z.string(),
          from: z.string(),
          to: z.array(z.string()),
          subject: z.string(),
          body: z.string(),
          date: z.string(),
          folder: z.string(),
          read: z.boolean(),
          attachments: z
            .array(
              z.object({
                filename: z.string(),
                size: z.number(),
                mimeType: z.string(),
              })
            )
            .optional(),
        }),
      },
    },
    async ({ messageId, includeAttachments = false }) => {
      // Generate mock message based on ID
      const message: any = {
        id: messageId,
        from: "sender@example.com",
        to: ["user@example.com"],
        subject: `Message: ${messageId}`,
        body: `This is the content of message ${messageId}. It contains important information that you requested.`,
        date: new Date().toISOString(),
        folder: "inbox",
        read: true,
      };

      if (includeAttachments) {
        message.attachments = [
          {
            filename: "document.pdf",
            size: 245000,
            mimeType: "application/pdf",
          },
          {
            filename: "image.jpg",
            size: 125000,
            mimeType: "image/jpeg",
          },
        ];
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ message }) }],
        structuredContent: { message },
      };
    }
  );

  tools["messages_send"] = server.registerTool(
    "messages_send",
    {
      title: "Send Message",
      description: "Send a new email message",
      inputSchema: {
        to: z.array(z.string().email()).min(1),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string(),
        body: z.string(),
        bodyType: z.enum(["text", "html"]).optional().default("text"),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              data: z.string(),
              mimeType: z.string().optional(),
            })
          )
          .optional(),
      },
      outputSchema: {
        messageId: z.string(),
        status: z.string(),
        sentAt: z.string(),
      },
    },
    async ({ to, cc, bcc, subject, body, bodyType = "text", attachments }) => {
      const messageId = generateId("msg");
      const sentAt = new Date().toISOString();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              messageId,
              status: "sent",
              sentAt,
            }),
          },
        ],
        structuredContent: {
          messageId,
          status: "sent",
          sentAt,
        },
      };
    }
  );

  // ============================================================================
  // SAP Concur Tools
  // ============================================================================

  tools["trips_read"] = server.registerTool(
    "trips_read",
    {
      title: "Read Trips",
      description: "Retrieve upcoming trips and travel itineraries from Concur",
      inputSchema: {
        tripId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      },
      outputSchema: {
        trips: z.array(
          z.object({
            id: z.string(),
            destination: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            status: z.string(),
            itinerary: z.array(
              z.object({
                date: z.string(),
                description: z.string(),
              })
            ),
          })
        ),
      },
    },
    async ({ tripId, startDate, endDate }) => {
      // Generate mock trips
      const destinations = ["New York, NY", "London, UK", "Tokyo, Japan", "Paris, France", "Sydney, Australia"];
      const statuses = ["confirmed", "pending", "cancelled"];
      
      let trips: any[] = [];
      
      if (tripId) {
        // Return single trip
        const start = startDate || "2025-02-01";
        const end = endDate || "2025-02-05";
        trips = [{
          id: tripId,
          destination: destinations[Math.floor(Math.random() * destinations.length)],
          startDate: start,
          endDate: end,
          status: "confirmed",
          itinerary: [
            { date: start, description: "Flight departure" },
            { date: end, description: "Return flight" },
          ],
        }];
      } else {
        // Generate multiple trips
        trips = Array.from({ length: 3 }, (_, i) => {
          const start = startDate || `2025-0${2 + i}-01`;
          const end = endDate || `2025-0${2 + i}-05`;
          return {
            id: generateId("trip"),
            destination: destinations[i % destinations.length],
            startDate: start,
            endDate: end,
            status: statuses[i % statuses.length],
            itinerary: [
              { date: start, description: "Flight departure" },
              { date: end, description: "Return flight" },
            ],
          };
        });
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ trips }) }],
        structuredContent: { trips },
      };
    }
  );

  tools["expenses_create"] = server.registerTool(
    "expenses_create",
    {
      title: "Create Expense Report",
      description: "Create a new expense report in Concur",
      inputSchema: {
        reportName: z.string(),
        expenses: z.array(
          z.object({
            amount: z.number(),
            currency: z.string(),
            expenseType: z.string(),
            date: z.string().optional(),
            description: z.string().optional(),
          })
        ),
      },
      outputSchema: {
        reportId: z.string(),
        reportName: z.string(),
        status: z.string(),
        totalAmount: z.number(),
      },
    },
    async ({ reportName, expenses: expenseItems }) => {
      const reportId = generateId("exp");
      const totalAmount = expenseItems.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              reportId,
              reportName,
              status: "draft",
              totalAmount,
            }),
          },
        ],
        structuredContent: {
          reportId,
          reportName,
          status: "draft",
          totalAmount,
        },
      };
    }
  );

  tools["receipts_attach"] = server.registerTool(
    "receipts_attach",
    {
      title: "Attach Receipt",
      description: "Attach a receipt image to an expense entry",
      inputSchema: {
        expenseId: z.string(),
        receiptData: z.string(),
        mimeType: z.string().optional().default("image/jpeg"),
      },
      outputSchema: {
        success: z.boolean(),
        receiptId: z.string(),
      },
    },
    async ({ expenseId, receiptData, mimeType = "image/jpeg" }) => {
      const receiptId = `receipt-${expenseId}`;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              receiptId,
            }),
          },
        ],
        structuredContent: {
          success: true,
          receiptId,
        },
      };
    }
  );

  // ============================================================================
  // SAP Commerce Platform Tools
  // ============================================================================

  tools["orders_create"] = server.registerTool(
    "orders_create",
    {
      title: "Create Order",
      description: "Create a new sales order in the commerce platform",
      inputSchema: {
        customerId: z.string(),
        items: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().int().min(1),
              unitPrice: z.number().optional(),
            })
          )
          .min(1),
        shippingAddress: z.any().optional(),
        paymentMethod: z.string().optional(),
      },
      outputSchema: {
        orderId: z.string(),
        status: z.string(),
        total: z.number(),
        date: z.string(),
      },
    },
    async ({ customerId, items, shippingAddress, paymentMethod }) => {
      const orderId = `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const date = new Date().toISOString().split("T")[0];

      // Calculate total with mock prices if not provided
      const total = items.reduce((sum, item) => {
        const price = item.unitPrice || (Math.random() * 100 + 10); // Mock price between 10-110
        return sum + price * item.quantity;
      }, 0);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              orderId,
              status: "pending",
              total: Math.round(total * 100) / 100,
              date,
            }),
          },
        ],
        structuredContent: {
          orderId,
          status: "pending",
          total: Math.round(total * 100) / 100,
          date,
        },
      };
    }
  );

  tools["orders_read"] = server.registerTool(
    "orders_read",
    {
      title: "Read Order",
      description: "Retrieve order details by order ID",
      inputSchema: {
        orderId: z.string(),
        includeItems: z.boolean().optional().default(true),
        includeHistory: z.boolean().optional().default(false),
      },
      outputSchema: {
        order: z.object({
          id: z.string(),
          customerId: z.string(),
          items: z.array(z.any()).optional(),
          status: z.string(),
          total: z.number(),
          date: z.string(),
          history: z.array(z.any()).optional(),
        }),
      },
    },
    async ({ orderId, includeItems = true, includeHistory = false }) => {
      const result: any = {
        id: orderId,
        customerId: `CUST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: "processing",
        total: Math.random() * 500 + 50,
        date: new Date().toISOString().split("T")[0],
      };

      if (includeItems) {
        result.items = [
          {
            productId: generateId("PROD"),
            quantity: Math.floor(Math.random() * 5) + 1,
            unitPrice: Math.round((Math.random() * 100 + 10) * 100) / 100,
          },
          {
            productId: generateId("PROD"),
            quantity: Math.floor(Math.random() * 3) + 1,
            unitPrice: Math.round((Math.random() * 50 + 20) * 100) / 100,
          },
        ];
      }

      if (includeHistory) {
        result.history = [
          { date: result.date, status: "created", description: "Order created" },
          {
            date: result.date,
            status: result.status,
            description: `Order status: ${result.status}`,
          },
        ];
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ order: result }) }],
        structuredContent: { order: result },
      };
    }
  );

  tools["orders_search"] = server.registerTool(
    "orders_search",
    {
      title: "Search Orders",
      description: "Search for orders with filters",
      inputSchema: {
        customerId: z.string().optional(),
        status: z
          .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
          .optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        limit: z.number().int().min(1).max(500).optional().default(50),
      },
      outputSchema: {
        orders: z.array(
          z.object({
            id: z.string(),
            customerId: z.string(),
            status: z.string(),
            total: z.number(),
            date: z.string(),
          })
        ),
      },
    },
    async ({ customerId, status, dateFrom, dateTo, limit = 50 }) => {
      // Generate mock orders
      const statuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
      const orders = Array.from({ length: Math.min(limit, 10) }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        return {
          id: `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          customerId: customerId || `CUST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          status: status || statuses[i % statuses.length],
          total: Math.round((Math.random() * 500 + 50) * 100) / 100,
          date: date.toISOString().split("T")[0],
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ orders }) }],
        structuredContent: { orders },
      };
    }
  );

  tools["products_search"] = server.registerTool(
    "products_search",
    {
      title: "Search Products",
      description: "Search for products in the catalog",
      inputSchema: {
        query: z.string().optional(),
        category: z.string().optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        inStock: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional().default(50),
      },
      outputSchema: {
        products: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            category: z.string(),
            price: z.number(),
            inStock: z.boolean(),
            description: z.string(),
          })
        ),
      },
    },
    async ({ query, category, priceMin, priceMax, inStock, limit = 50 }) => {
      // Generate mock products
      const categories = ["Electronics", "Accessories", "Clothing", "Home", "Sports"];
      const productNames = [
        "Wireless Headphones",
        "Smart Watch",
        "Laptop Stand",
        "USB-C Cable",
        "Wireless Mouse",
        "Keyboard",
        "Monitor Stand",
        "Phone Case",
        "Tablet Stand",
        "Charging Dock",
      ];

      const products = Array.from({ length: Math.min(limit, 10) }, (_, i) => {
        const price = Math.round((Math.random() * 200 + 10) * 100) / 100;
        const selectedCategory = category || categories[i % categories.length];
        const name = query 
          ? `${query} Product ${i + 1}`
          : productNames[i % productNames.length];

        return {
          id: generateId("PROD"),
          name,
          category: selectedCategory,
          price,
          inStock: inStock !== undefined ? inStock : Math.random() > 0.3,
          description: `High-quality ${name.toLowerCase()} in the ${selectedCategory.toLowerCase()} category.`,
        };
      });

      // Apply filters
      let filtered = products;
      if (priceMin !== undefined) {
        filtered = filtered.filter((p) => p.price >= priceMin);
      }
      if (priceMax !== undefined) {
        filtered = filtered.filter((p) => p.price <= priceMax);
      }

      return {
        content: [
          { type: "text", text: JSON.stringify({ products: filtered }) },
        ],
        structuredContent: { products: filtered },
      };
    }
  );

  tools["products_read"] = server.registerTool(
    "products_read",
    {
      title: "Read Product",
      description: "Retrieve detailed product information",
      inputSchema: {
        productId: z.string(),
        includeVariants: z.boolean().optional().default(false),
        includeReviews: z.boolean().optional().default(false),
      },
      outputSchema: {
        product: z.object({
          id: z.string(),
          name: z.string(),
          category: z.string(),
          price: z.number(),
          inStock: z.boolean(),
          description: z.string(),
          variants: z.array(z.any()).optional(),
          reviews: z.array(z.any()).optional(),
        }),
      },
    },
    async ({ productId, includeVariants = false, includeReviews = false }) => {
      const product: any = {
        id: productId,
        name: `Product ${productId}`,
        category: "Electronics",
        price: Math.round((Math.random() * 200 + 10) * 100) / 100,
        inStock: Math.random() > 0.3,
        description: `Detailed description for product ${productId}. This is a high-quality product with excellent features.`,
      };

      if (includeVariants) {
        product.variants = [
          { id: `${productId}-v1`, name: "Small", price: product.price * 0.9 },
          { id: `${productId}-v2`, name: "Medium", price: product.price },
          { id: `${productId}-v3`, name: "Large", price: product.price * 1.1 },
        ];
      }

      if (includeReviews) {
        product.reviews = [
          {
            id: "rev-1",
            rating: 5,
            comment: "Great product!",
            author: "Customer A",
            date: "2025-01-10",
          },
          {
            id: "rev-2",
            rating: 4,
            comment: "Good value for money",
            author: "Customer B",
            date: "2025-01-08",
          },
          {
            id: "rev-3",
            rating: 5,
            comment: "Highly recommended!",
            author: "Customer C",
            date: "2025-01-05",
          },
        ];
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ product }) }],
        structuredContent: { product },
      };
    }
  );

  tools["customers_read"] = server.registerTool(
    "customers_read",
    {
      title: "Read Customer",
      description: "Retrieve customer master data",
      inputSchema: {
        customerId: z.string(),
        includeOrders: z.boolean().optional().default(false),
        includePreferences: z.boolean().optional().default(false),
      },
      outputSchema: {
        customer: z.object({
          id: z.string(),
          email: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          phone: z.string().optional(),
          orders: z.array(z.any()).optional(),
          preferences: z.any().optional(),
        }),
      },
    },
    async ({ customerId, includeOrders = false, includePreferences = false }) => {
      const customer: any = {
        id: customerId,
        email: `customer${customerId}@example.com`,
        firstName: "John",
        lastName: "Doe",
        phone: `+1-555-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
      };

      if (includeOrders) {
        customer.orders = Array.from({ length: 3 }, (_, i) => ({
          id: `ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
          total: Math.round((Math.random() * 500 + 50) * 100) / 100,
          status: ["pending", "processing", "shipped"][i % 3],
        }));
      }

      if (includePreferences) {
        customer.preferences = {
          currency: "USD",
          language: "en",
          newsletter: true,
          categories: ["Electronics", "Accessories"],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify({ customer }) }],
        structuredContent: { customer },
      };
    }
  );

  tools["customers_create"] = server.registerTool(
    "customers_create",
    {
      title: "Create Customer",
      description: "Create a new customer record",
      inputSchema: {
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        phone: z.string().optional(),
        address: z.any().optional(),
      },
      outputSchema: {
        customerId: z.string(),
        status: z.string(),
      },
    },
    async ({ email, firstName, lastName, phone, address }) => {
      const customerId = `CUST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              customerId,
              status: "created",
            }),
          },
        ],
        structuredContent: {
          customerId,
          status: "created",
        },
      };
    }
  );

  tools["analytics_salesInsights"] = server.registerTool(
    "analytics_salesInsights",
    {
      title: "Get Sales Insights",
      description: "Retrieve sales analytics and insights",
      inputSchema: {
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        category: z.string().optional(),
        customerSegment: z.string().optional(),
      },
      outputSchema: {
        insights: z.object({
          totalRevenue: z.number(),
          totalOrders: z.number(),
          averageOrderValue: z.number(),
          topProducts: z.array(z.any()),
          trends: z.array(z.any()),
        }),
      },
    },
    async ({ dateFrom, dateTo, category, customerSegment }) => {
      // Generate mock analytics
      const totalRevenue = Math.round((Math.random() * 100000 + 50000) * 100) / 100;
      const totalOrders = Math.floor(Math.random() * 500 + 100);
      const averageOrderValue = Math.round((totalRevenue / totalOrders) * 100) / 100;

      const insights = {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        topProducts: [
          { productId: generateId("PROD"), sales: 15, revenue: 449.85 },
          { productId: generateId("PROD"), sales: 8, revenue: 399.92 },
          { productId: generateId("PROD"), sales: 12, revenue: 239.88 },
        ],
        trends: [
          { period: "2025-01", revenue: 5000, orders: 50 },
          { period: "2025-02", revenue: 7500, orders: 75 },
          { period: "2025-03", revenue: 10000, orders: 100 },
        ],
      };

      return {
        content: [
          { type: "text", text: JSON.stringify({ insights }) },
        ],
        structuredContent: { insights },
      };
    }
  );

  tools["orders_orderApproval"] = server.registerTool(
    "orders_orderApproval",
    {
      title: "Request Order Approval",
      description: "Initiate order approval workflow",
      inputSchema: {
        orderId: z.string(),
        approverLevel: z.enum(["manager", "director", "vp"]).optional(),
      },
      outputSchema: {
        approvalRequestId: z.string(),
        status: z.string(),
        approverLevel: z.string(),
      },
    },
    async ({ orderId, approverLevel = "manager" }) => {
      const approvalRequestId = `approval-${orderId}`;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              approvalRequestId,
              status: "pending",
              approverLevel,
            }),
          },
        ],
        structuredContent: {
          approvalRequestId,
          status: "pending",
          approverLevel,
        },
      };
    }
  );


  tools["fraud_detect"] = server.registerTool(
    "fraud_detect",
    {
      title: "Detect Fraud",
      description: "Run fraud detection on a transaction",
      inputSchema: {
        transactionAmount: z.number(),
        paymentMethod: z.string(),
        customerLocation: z.string().optional(),
        orderId: z.string().optional(),
      },
      outputSchema: {
        fraudScore: z.number(),
        riskLevel: z.string(),
        flagged: z.boolean(),
        reasons: z.array(z.string()).optional(),
      },
    },
    async ({ transactionAmount, paymentMethod, customerLocation, orderId }) => {
      // Mock fraud detection logic
      let fraudScore = 0;
      const reasons: string[] = [];

      if (transactionAmount > 10000) {
        fraudScore += 30;
        reasons.push("High transaction amount");
      }
      if (paymentMethod === "wire_transfer") {
        fraudScore += 20;
        reasons.push("Wire transfer payment method");
      }
      if (customerLocation && customerLocation.includes("High Risk")) {
        fraudScore += 25;
        reasons.push("High-risk location");
      }

      const riskLevel =
        fraudScore >= 50 ? "high" : fraudScore >= 25 ? "medium" : "low";
      const flagged = fraudScore >= 30;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              fraudScore,
              riskLevel,
              flagged,
              reasons: reasons.length > 0 ? reasons : undefined,
            }),
          },
        ],
        structuredContent: {
          fraudScore,
          riskLevel,
          flagged,
          reasons: reasons.length > 0 ? reasons : undefined,
        },
      };
    }
  );
}

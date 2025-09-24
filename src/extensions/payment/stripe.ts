import Stripe from "stripe";
import type {
  PaymentProvider,
  PaymentConfigs,
  PaymentResult,
  PaymentSession,
  PaymentWebhookResult,
  PaymentRequest,
} from ".";

/**
 * Stripe payment provider configs
 * @docs https://stripe.com/docs
 */
export interface StripeConfigs extends PaymentConfigs {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
  apiVersion?: string;
}

/**
 * Stripe payment provider implementation
 * @website https://stripe.com/
 */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";
  configs: StripeConfigs;

  private client: Stripe;

  constructor(configs: StripeConfigs) {
    this.configs = configs;
    this.client = new Stripe(configs.secretKey, {
      apiVersion: (configs.apiVersion as any) || "2024-06-20",
    });
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (request.type === "subscription") {
      return this.createSubscriptionPayment(request);
    } else {
      return this.createOneTimePayment(request);
    }
  }

  async createOneTimePayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      if (!request.price) {
        throw new Error("price is required");
      }

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      if (request.products && request.products.length > 0) {
        // Create line items from products
        for (const product of request.products) {
          lineItems.push({
            price_data: {
              currency: product.price.currency,
              product_data: {
                name: product.name,
                description: product.description,
                metadata: product.metadata,
              },
              unit_amount: product.price.amount, // unit: cents
            },
            quantity: 1,
          });
        }
      } else {
        // Create single line item from amount
        lineItems.push({
          price_data: {
            currency: request.price.currency,
            product_data: {
              name: request.description || "Payment",
            },
            unit_amount: request.price.amount, // unit: cents
          },
          quantity: 1,
        });
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: lineItems,
        metadata: request.metadata,
      };

      if (request.customer) {
        if (request.customer.email) {
          sessionParams.customer_email = request.customer.email;
        }
        if (request.customer.id) {
          sessionParams.customer = request.customer.id;
        }
      }

      if (request.successUrl) {
        sessionParams.success_url = request.successUrl;
      }

      if (request.cancelUrl) {
        sessionParams.cancel_url = request.cancelUrl;
      }

      const session = await this.client.checkout.sessions.create(sessionParams);

      return {
        success: true,
        session: {
          id: session.id,
          url: session.url || undefined,
          status: this.mapStripeStatus(session.status),
          price: request.price,
          customer: request.customer,
          metadata: request.metadata,
          provider: this.name,
        },
        provider: this.name,
        providerResult: session,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: this.name,
      };
    }
  }

  async createSubscriptionPayment(
    request: PaymentRequest
  ): Promise<PaymentResult> {
    try {
      if (!request.plan) {
        throw new Error("plan is required");
      }

      // First, create or retrieve customer
      let customerId = request.customer?.id;
      if (!customerId && request.customer?.email) {
        const customers = await this.client.customers.list({
          email: request.customer.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        } else {
          const customer = await this.client.customers.create({
            email: request.customer.email,
            name: request.customer.name,
            phone: request.customer.phone,
            metadata: request.customer.metadata,
          });
          customerId = customer.id;
        }
      }

      // Create or retrieve price for the subscription plan
      const price = await this.client.prices.create({
        currency: request.plan.price.currency,
        unit_amount: request.plan.price.amount, // unit: cents
        recurring: {
          interval: request.plan.interval,
          interval_count: request.plan.intervalCount || 1,
        },
        product_data: {
          name: request.plan.name,
          metadata: request.plan.metadata,
        },
      });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata: request.metadata,
      };

      if (customerId) {
        sessionParams.customer = customerId;
      } else if (request.customer?.email) {
        sessionParams.customer_email = request.customer.email;
      }

      if (request.successUrl) {
        sessionParams.success_url = request.successUrl;
      }

      if (request.cancelUrl) {
        sessionParams.cancel_url = request.cancelUrl;
      }

      if (request.trialPeriodDays || request.plan.trialPeriodDays) {
        sessionParams.subscription_data = {
          trial_period_days:
            request.trialPeriodDays || request.plan.trialPeriodDays,
        };
      }

      const session = await this.client.checkout.sessions.create(sessionParams);

      return {
        success: true,
        session: {
          id: session.id,
          url: session.url || undefined,
          status: this.mapStripeStatus(session.status),
          price: request.plan.price,
          customer: request.customer,
          metadata: request.metadata,
          provider: this.name,
        },
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: this.name,
      };
    }
  }

  async getPaymentSession({
    sessionId,
    searchParams,
  }: {
    sessionId?: string;
    searchParams?: URLSearchParams;
  }): Promise<PaymentSession | null> {
    try {
      if (!sessionId && !searchParams) {
        throw new Error("sessionId or searchParams is required");
      }

      if (!sessionId) {
        sessionId = searchParams?.get("session_id") || "";
      }

      if (!sessionId) {
        throw new Error("sessionId is required");
      }

      const session = await this.client.checkout.sessions.retrieve(sessionId);

      return {
        id: session.id,
        url: session.url || undefined,
        status: this.mapStripeStatus(session.status),
        metadata: session.metadata || undefined,
        provider: this.name,
        providerResult: session,
      };
    } catch (error) {
      console.error("Error retrieving Stripe session:", error);
      return null;
    }
  }

  async handleWebhook(
    rawBody: string | Buffer,
    signature?: string,
    _headers?: Record<string, string>
  ): Promise<PaymentWebhookResult> {
    try {
      if (!this.configs.webhookSecret) {
        throw new Error("Webhook secret not configured");
      }

      if (!signature) {
        throw new Error("Webhook signature not provided");
      }

      const event = this.client.webhooks.constructEvent(
        rawBody,
        signature,
        this.configs.webhookSecret
      );

      // Process the event based on type
      console.log(`Stripe webhook event: ${event.type}`, event.data);

      return {
        success: true,
        acknowledged: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        acknowledged: false,
      };
    }
  }

  private mapStripeStatus(status: string | null): PaymentSession["status"] {
    switch (status) {
      case "open":
        return "pending";
      case "complete":
        return "completed";
      case "expired":
        return "cancelled";
      default:
        return "pending";
    }
  }
}

/**
 * Create Stripe provider with configs
 */
export function createStripeProvider(configs: StripeConfigs): StripeProvider {
  return new StripeProvider(configs);
}

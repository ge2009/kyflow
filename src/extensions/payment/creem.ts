import type {
  PaymentProvider,
  PaymentConfigs,
  PaymentRequest,
  PaymentResult,
  PaymentSession,
  PaymentWebhookResult,
} from ".";

/**
 * Creem payment provider configs
 * @docs https://docs.creem.io/
 */
export interface CreemConfigs extends PaymentConfigs {
  apiKey: string;
  webhookSecret?: string;
  environment?: "sandbox" | "production";
}

/**
 * Creem payment provider implementation
 * @website https://creem.io/
 */
export class CreemProvider implements PaymentProvider {
  readonly name = "creem";
  configs: CreemConfigs;

  private baseUrl: string;

  constructor(configs: CreemConfigs) {
    this.configs = configs;
    this.baseUrl =
      configs.environment === "production"
        ? "https://api.creem.io"
        : "https://test-api.creem.io";
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      if (!request.productId) {
        throw new Error("productId is required");
      }

      const payload: any = {
        product_id: request.productId,
        request_id: request.requestId,
        units: 1,
        discount_code: request.discount
          ? {
              code: request.discount.code,
            }
          : undefined,
        customer: request.customer
          ? {
              id: request.customer.id,
              email: request.customer.email,
            }
          : undefined,
        custom_fields: request.customFields
          ? request.customFields.map((customField) => ({
              type: customField.type,
              key: customField.name,
              label: customField.title,
              optional: customField.isRequired,
              text: customField.metadata,
            }))
          : undefined,
        success_url: request.successUrl,
        metadata: request.metadata,
      };

      const result = await this.makeRequest("/v1/checkouts", "POST", payload);

      if (result.error) {
        return {
          success: false,
          error: result.error.message || "Creem payment creation failed",
          provider: this.name,
        };
      }

      return {
        success: true,
        session: {
          id: result.id,
          url: result.checkout_url,
          status: this.mapCreemStatus(result.status),
          price: request.price,
          customer: request.customer,
          metadata: request.metadata,
          provider: this.name,
        },
        provider: this.name,
        providerResult: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        provider: this.name,
      };
    }
  }

  // get payment session by session id
  // @docs https://docs.creem.io/api-reference/endpoint/get-checkout
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
        sessionId = searchParams?.get("checkout_id") || "";
      }

      if (!sessionId) {
        throw new Error("sessionId is required");
      }

      const result = await this.makeRequest(
        `/v1/checkouts?checkout_id=${sessionId}`,
        "GET"
      );

      if (result.error) {
        return null;
      }

      return {
        id: result.id,
        url: result.checkout_url,
        status: this.mapCreemStatus(result.status),
        metadata: result.metadata,
        provider: this.name,
        providerResult: result,
      };
    } catch (error) {
      console.error("Error retrieving Creem session:", error);
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

      // Parse the webhook payload
      const payload =
        typeof rawBody === "string"
          ? JSON.parse(rawBody)
          : JSON.parse(rawBody.toString());

      // Verify webhook signature if provided
      if (signature && this.configs.webhookSecret) {
        const crypto = require("crypto");
        const expectedSignature = crypto
          .createHmac("sha256", this.configs.webhookSecret)
          .update(rawBody)
          .digest("hex");

        if (signature !== expectedSignature) {
          throw new Error("Invalid webhook signature");
        }
      }

      // Process the webhook event
      console.log(`Creem webhook event: ${payload.event_type}`, payload.data);

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

  private async makeRequest(endpoint: string, method: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "x-api-key": this.configs.apiKey,
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`request failed with status: ${response.status}`);
    }

    return await response.json();
  }

  private mapCreemStatus(status: string): PaymentSession["status"] {
    switch (status) {
      case "pending":
        return "pending";
      case "processing":
        return "processing";
      case "completed":
      case "paid":
        return "completed";
      case "failed":
        return "failed";
      case "cancelled":
      case "expired":
        return "cancelled";
      default:
        return "pending";
    }
  }
}

/**
 * Create Creem provider with configs
 */
export function createCreemProvider(configs: CreemConfigs): CreemProvider {
  return new CreemProvider(configs);
}

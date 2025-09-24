/**
 * Payment price interface
 */
export interface PaymentPrice {
  amount: number;
  currency: string;
}

/**
 * Payment discount interface
 */
export interface PaymentDiscount {
  code: string;
}

/**
 * Payment customer interface
 */
export interface PaymentCustomer {
  id?: string;
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface PaymentCustomField {
  type: string;
  name: string;
  title: string;
  isRequired?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Payment product interface
 */
export interface PaymentProduct {
  id: string;
  name: string;
  title?: string;
  description?: string;
  price: PaymentPrice;
  metadata?: Record<string, any>;
}

/**
 * Payment subscription plan interface
 */
export interface PaymentSubscriptionPlan {
  id: string;
  name: string;
  title?: string;
  description?: string;
  price: PaymentPrice;
  interval: "day" | "week" | "month" | "year";
  intervalCount?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}

/**
 * Payment request interface
 */
export interface PaymentRequest {
  provider?: string; // optional
  type?: "one-time" | "subscription"; // optional
  productId?: string; // create product first
  requestId?: string; // request id
  price?: PaymentPrice; // required if productId is not provided
  discount?: PaymentDiscount; // discount code
  quantity?: number; // quantity
  customer?: PaymentCustomer;
  description?: string; // checkout description
  successUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
  products?: PaymentProduct[];
  plan?: PaymentSubscriptionPlan; // required for subscription
  trialPeriodDays?: number; // optional for subscription
  customFields?: PaymentCustomField[]; // optional for custom fields
}

/**
 * Payment session interface
 */
export interface PaymentSession {
  id: string;
  url?: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  price?: PaymentPrice;
  customer?: PaymentCustomer;
  metadata?: Record<string, any>;
}

/**
 * Payment result interface
 */
export interface PaymentResult {
  success: boolean;
  session?: PaymentSession;
  error?: string;
  provider: string;
  providerResult?: any;
}

/**
 * Payment webhook notification interface
 */
export interface PaymentWebhookEvent {
  id: string;
  type: string;
  data: any;
  provider: string;
  created: Date;
}

/**
 * Payment webhook result interface
 */
export interface PaymentWebhookResult {
  success: boolean;
  error?: string;
  acknowledged: boolean;
}

/**
 * Payment configs interface
 */
export interface PaymentConfigs {
  [key: string]: any;
}

/**
 * Payment provider interface
 */
export interface PaymentProvider {
  // provider name
  readonly name: string;

  // provider configs
  configs: PaymentConfigs;

  // create payment
  createPayment(request: PaymentRequest): Promise<PaymentResult>;

  // handle callback by search params
  handleCallback?(searchParams: URLSearchParams): Promise<boolean>;

  // get payment session by session id or search params
  getPaymentSession({
    sessionId,
    searchParams,
  }: {
    sessionId?: string;
    searchParams?: URLSearchParams;
  }): Promise<PaymentSession | null>;

  // handle webhook notification
  handleWebhook(
    rawBody: string | Buffer,
    signature?: string,
    headers?: Record<string, string>
  ): Promise<PaymentWebhookResult>;
}

/**
 * Payment manager to manage all payment providers
 */
export class PaymentManager {
  // payment providers
  private providers: PaymentProvider[] = [];
  private defaultProvider?: PaymentProvider;

  // add payment provider
  addProvider(provider: PaymentProvider, isDefault = false) {
    this.providers.push(provider);
    if (isDefault) {
      this.defaultProvider = provider;
    }
  }

  // get provider by name
  getProvider(name: string): PaymentProvider | undefined {
    return this.providers.find((p) => p.name === name);
  }

  // create payment using default provider
  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    if (request.provider) {
      return this.createPaymentWithProvider(request, request.provider);
    }

    // set default provider if not set
    if (!this.defaultProvider && this.providers.length > 0) {
      this.defaultProvider = this.providers[0];
    }

    if (!this.defaultProvider) {
      throw new Error("No payment provider configured");
    }

    return this.defaultProvider.createPayment(request);
  }

  // create payment using specific provider
  async createPaymentWithProvider(
    request: PaymentRequest,
    providerName: string
  ): Promise<PaymentResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' not found`);
    }
    return provider.createPayment(request);
  }

  // handle webhook using specific provider
  async handleWebhook(
    providerName: string,
    rawBody: string | Buffer,
    signature?: string,
    headers?: Record<string, string>
  ): Promise<PaymentWebhookResult> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' not found`);
    }
    return provider.handleWebhook(rawBody, signature, headers);
  }

  // get payment session using specific provider
  async getPaymentSession({
    providerName,
    sessionId,
    searchParams,
  }: {
    providerName: string;
    sessionId?: string;
    searchParams?: URLSearchParams;
  }): Promise<PaymentSession | null> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw new Error(`Payment provider '${providerName}' not found`);
    }
    return provider.getPaymentSession({ sessionId, searchParams });
  }

  // get all provider names
  getProviderNames(): string[] {
    return this.providers.map((p) => p.name);
  }
}

// Global payment manager instance
export const paymentManager = new PaymentManager();

// Export all providers
export * from "./stripe";
export * from "./creem";
export * from "./paypal";

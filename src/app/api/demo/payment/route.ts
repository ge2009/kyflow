import { envConfigs } from "@/config";
import { respData, respErr } from "@/lib/resp";
import { paymentService } from "@/services/payment";

export async function POST(req: Request) {
  try {
    const { amount, currency, product_id, provider, email } = await req.json();

    let successUrl = `${envConfigs.app_url}/api/demo/payment/callback/${provider}`;
    if (provider === "stripe") {
      successUrl += `?session_id={CHECKOUT_SESSION_ID}`;
    }

    const result = await paymentService.createPayment({
      provider: provider,
      productId: product_id,
      price: {
        amount: amount,
        currency: currency,
      },
      customer: {
        email: email,
      },
      successUrl: successUrl,
    });

    return respData(result);
  } catch (e) {
    console.log("payment failed:", e);
    return respErr("payment failed");
  }
}

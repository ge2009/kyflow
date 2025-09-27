import { respData, respErr } from "@/lib/resp";
import { paymentService } from "@/services/payment";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ provider: string }>;
  }
) {
  const { provider } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id") || "";

  const paymentProvider = paymentService.getProvider(provider);
  if (!paymentProvider) {
    return respErr("payment provider not found");
  }

  const session = await paymentProvider.getPayment({
    sessionId: sessionId,
  });

  if (!session) {
    return respErr("session not found");
  }

  return respData(session);
}

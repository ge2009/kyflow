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

  const session = await paymentService.getPaymentSession({
    providerName: provider,
    searchParams,
  });

  if (!session) {
    return respErr("session not found");
  }

  return respData(session);
}

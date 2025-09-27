import { envConfigs } from "@/config";
import { PaymentStatus, PaymentType } from "@/extensions/payment";
import { getSnowId, getUuid } from "@/lib/hash";
import {
  findOrderByOrderNo,
  OrderStatus,
  UpdateOrder,
  updateOrderByOrderNo,
  updateOrderWithSubscription,
} from "@/services/order";
import { paymentService } from "@/services/payment";
import {
  createSubscription,
  NewSubscription,
  SubscriptionStatus,
} from "@/services/subscription";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  let redirectUrl = "";

  try {
    const { searchParams } = new URL(req.url);
    const orderNo = searchParams.get("order_no");

    if (!orderNo) {
      throw new Error("invalid callback params");
    }

    // get sign user
    const user = await getUserInfo();
    if (!user || !user.email) {
      throw new Error("no auth, please sign in");
    }

    // get order
    const order = await findOrderByOrderNo(orderNo);
    if (!order) {
      throw new Error("order not found");
    }

    // validate order and user
    if (order.userId !== user.id) {
      throw new Error("order and user not match");
    }

    if (!order.paymentSessionId || !order.paymentProvider) {
      throw new Error("payment session id or provider not found");
    }

    // check order status
    const paymentProvider = paymentService.getProvider(order.paymentProvider);
    if (!paymentProvider) {
      throw new Error("payment provider not found");
    }

    const session = await paymentProvider.getPayment({
      sessionId: order.paymentSessionId,
    });

    if (order.paymentType === PaymentType.SUBSCRIPTION) {
      if (!session.subscriptionId) {
        throw new Error("subscription id not found");
      }
    }

    // payment success
    if (session.paymentStatus === PaymentStatus.SUCCESS) {
      // update order status to be paid
      const updateOrder: UpdateOrder = {
        status: OrderStatus.PAID,
        paymentResult: JSON.stringify(session.paymentResult),
        paymentAmount: session.paymentInfo?.paymentAmount,
        paymentCurrency: session.paymentInfo?.paymentCurrency,
        paymentEmail: session.paymentInfo?.paymentEmail,
        paidAt: session.paymentInfo?.paidAt,
      };

      if (session.subscriptionInfo) {
        // create subscription, before update order
        const subscriptionInfo = session.subscriptionInfo;

        // new subscription
        const newSubscription: NewSubscription = {
          id: getUuid(),
          subscriptionNo: getSnowId(),
          userId: order.userId,
          userEmail: order.paymentEmail || order.userEmail,
          status: SubscriptionStatus.ACTIVE,
          paymentProvider: order.paymentProvider,
          subscriptionId: subscriptionInfo.subscriptionId,
          subscriptionResult: JSON.stringify(session.subscriptionResult),
          productId: subscriptionInfo.productId,
          description: subscriptionInfo.description,
          amount: subscriptionInfo.amount,
          currency: subscriptionInfo.currency,
          interval: subscriptionInfo.interval,
          intervalCount: subscriptionInfo.intervalCount,
          trialPeriodDays: subscriptionInfo.trialPeriodDays,
          currentPeriodStart: subscriptionInfo.currentPeriodStart,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        };

        updateOrder.subscriptionId = session.subscriptionId;
        updateOrder.subscriptionResult = JSON.stringify(
          session.subscriptionResult
        );

        await updateOrderWithSubscription(
          orderNo,
          updateOrder,
          newSubscription
        );
      } else {
        // not subscription
        await updateOrderByOrderNo(orderNo, updateOrder);
      }

      redirectUrl = `${order.callbackUrl || envConfigs.app_url}/`;
    } else if (
      session.paymentStatus === PaymentStatus.FAILED ||
      session.paymentStatus === PaymentStatus.CANCELLED
    ) {
      // update order status to be failed
      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.FAILED,
        paymentResult: JSON.stringify(session.paymentResult),
      });

      redirectUrl = `${envConfigs.app_url}/pricing`;
    } else if (session.paymentStatus === PaymentStatus.PROCESSING) {
      // update order payment result
      await updateOrderByOrderNo(orderNo, {
        paymentResult: JSON.stringify(session.paymentResult),
      });

      redirectUrl = `${envConfigs.app_url}/settings/billing`;
    } else {
      throw new Error("unknown payment status");
    }
  } catch (e: any) {
    console.log("checkout callback failed:", e);
    redirectUrl = `${envConfigs.app_url}/pricing`;
  }

  redirect(redirectUrl);
}

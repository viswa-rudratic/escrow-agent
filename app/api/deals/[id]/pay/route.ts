import { createHoldOrder } from "@/lib/paypal";
import { getDeal, mutateDeal } from "@/lib/store";

export async function POST(req: Request, ctx: RouteContext<"/api/deals/[id]/pay">) {
  const { id } = await ctx.params;
  const deal = await getDeal(id);
  if (!deal) return Response.json({ error: "Not found" }, { status: 404 });
  if (deal.status !== "awaiting_payment")
    return Response.json({ error: "Deal is already funded" }, { status: 409 });

  try {
    const origin = new URL(req.url).origin;
    const { orderId, approveUrl } = await createHoldOrder({
      dealId: deal.id,
      title: deal.title,
      amountCents: deal.amountCents,
      returnUrl: `${origin}/api/deals/${deal.id}/return`,
      cancelUrl: `${origin}/deals/${deal.id}?as=buyer`,
    });
    await mutateDeal(id, (d) => {
      d.orderId = orderId;
      return "Buyer sent to PayPal to approve the hold";
    });
    return Response.json({ approveUrl });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

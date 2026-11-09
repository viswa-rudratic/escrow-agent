import { authorizeOrder } from "@/lib/paypal";
import { deriveStatus, getDeal, mutateDeal } from "@/lib/store";

export async function GET(req: Request, ctx: RouteContext<"/api/deals/[id]/return">) {
  const { id } = await ctx.params;
  const origin = new URL(req.url).origin;
  const dest = `${origin}/deals/${id}?as=buyer`;
  const deal = await getDeal(id);
  if (!deal || !deal.orderId || deal.status !== "awaiting_payment")
    return Response.redirect(dest, 303);

  // Only trust the order we created ourselves, not a token from the query string.
  const token = new URL(req.url).searchParams.get("token");
  if (token && token !== deal.orderId) return Response.redirect(`${dest}&error=order_mismatch`, 303);

  try {
    const { authorizationId } = await authorizeOrder(deal.orderId);
    await mutateDeal(id, (d) => {
      d.authorizationId = authorizationId;
      d.status = deriveStatus(d);
      return "Funds held in escrow (PayPal authorization created)";
    });
    return Response.redirect(dest, 303);
  } catch {
    return Response.redirect(`${dest}&error=authorize_failed`, 303);
  }
}

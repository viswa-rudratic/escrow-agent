import { captureAuthorization, voidAuthorization } from "@/lib/paypal";
import { deriveStatus, getDeal, mutateDeal } from "@/lib/store";

// Human tie-break for a milestone the AI marked "needs_review".
export async function POST(req: Request, ctx: RouteContext<"/api/deals/[id]/resolve">) {
  const { id } = await ctx.params;
  const deal = await getDeal(id);
  const idx = deal ? deal.milestones.findIndex((m) => m.status === "needs_review") : -1;
  if (!deal || idx < 0 || !deal.authorizationId)
    return Response.json({ error: "Nothing to resolve" }, { status: 409 });
  const ms = deal.milestones[idx];
  const isLast = idx === deal.milestones.length - 1;
  const { action } = await req.json();
  try {
    if (action === "release") {
      const { captureId } = await captureAuthorization(deal.authorizationId, ms.amountCents, isLast);
      return Response.json(
        await mutateDeal(id, (d) => {
          Object.assign(d.milestones[idx], { status: "released", captureId });
          d.status = deriveStatus(d);
          return `Buyer approved "${ms.label}" after review; funds released`;
        }),
      );
    }
    if (action === "refund") {
      await voidAuthorization(deal.authorizationId);
      return Response.json(
        await mutateDeal(id, (d) => {
          d.milestones[idx].status = "refunded";
          d.milestones.slice(idx + 1).forEach((m) => (m.status = "refunded"));
          d.status = deriveStatus(d);
          return `Buyer refused "${ms.label}" after review; remaining hold returned`;
        }),
      );
    }
    return Response.json({ error: "action must be release or refund" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

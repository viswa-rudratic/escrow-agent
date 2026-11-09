import { getDeal } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/deals/[id]">) {
  const { id } = await ctx.params;
  const deal = await getDeal(id);
  return deal ? Response.json(deal) : Response.json({ error: "Not found" }, { status: 404 });
}

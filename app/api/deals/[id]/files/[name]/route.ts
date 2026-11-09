import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR, getDeal } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/deals/[id]/files/[name]">) {
  const { id, name } = await ctx.params;
  const deal = await getDeal(id);
  const meta = deal?.milestones.flatMap((m) => m.files ?? []).find((f) => f.stored === name);
  if (!meta) return Response.json({ error: "Not found" }, { status: 404 });
  const buf = await fs.readFile(path.join(UPLOAD_DIR, id, meta.stored));
  return new Response(buf, {
    headers: {
      "Content-Type": meta.mime,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}

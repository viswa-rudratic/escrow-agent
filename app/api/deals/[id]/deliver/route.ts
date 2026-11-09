import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { captureAuthorization, voidAuthorization } from "@/lib/paypal";
import { UPLOAD_DIR, deriveStatus, getDeal, mutateDeal, type FileMeta } from "@/lib/store";
import { verifyDelivery, type Attachment } from "@/lib/verifier";

const MAX_FILES = 3;
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpe?g|webp|gif|svg\+xml)|text\/(plain|markdown|csv))$/;

export async function POST(req: Request, ctx: RouteContext<"/api/deals/[id]/deliver">) {
  const { id } = await ctx.params;
  const deal = await getDeal(id);
  if (!deal) return Response.json({ error: "Not found" }, { status: 404 });
  if (!deal.authorizationId || deal.status !== "funded")
    return Response.json({ error: "Deal is not in a funded state" }, { status: 409 });

  const idx = deal.milestones.findIndex((m) => m.status === "pending");
  if (idx < 0) return Response.json({ error: "No pending milestone" }, { status: 409 });
  const ms = deal.milestones[idx];
  const isLast = idx === deal.milestones.length - 1;

  const form = await req.formData();
  const text = String(form.get("delivery") ?? "").trim().slice(0, 8000);
  const uploads = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!text && !uploads.length) return Response.json({ error: "Add a description or a file" }, { status: 400 });
  if (uploads.length > MAX_FILES) return Response.json({ error: `Max ${MAX_FILES} files` }, { status: 400 });

  const attachments: Attachment[] = [];
  const metas: FileMeta[] = [];
  await fs.mkdir(path.join(UPLOAD_DIR, id), { recursive: true });
  for (const f of uploads) {
    if (!ALLOWED.test(f.type) || f.size > MAX_BYTES)
      return Response.json({ error: `${f.name}: only images/text under 4MB` }, { status: 400 });
    const buf = Buffer.from(await f.arrayBuffer());
    const stored = `${randomUUID().slice(0, 8)}${path.extname(f.name).toLowerCase().replace(/[^.a-z0-9]/g, "")}`;
    await fs.writeFile(path.join(UPLOAD_DIR, id, stored), buf);
    metas.push({ name: f.name.slice(0, 80), mime: f.type, size: f.size, stored });
    attachments.push({ name: f.name, mime: f.type, data: buf.toString("base64") });
  }

  const verdict = await verifyDelivery(deal, ms, text, attachments);
  const auth = deal.authorizationId;
  try {
    if (verdict.decision === "release") {
      const { captureId } = await captureAuthorization(auth, ms.amountCents, isLast);
      const updated = await mutateDeal(id, (d) => {
        Object.assign(d.milestones[idx], { delivery: text, files: metas, verdict, status: "released", captureId });
        d.status = deriveStatus(d);
        return `Milestone "${ms.label}" verified (${Math.round(verdict.score * 100)}%); $${(ms.amountCents / 100).toFixed(2)} released to seller`;
      });
      return Response.json(updated);
    }
    if (verdict.decision === "reject") {
      await voidAuthorization(auth); // returns everything not yet captured
      const updated = await mutateDeal(id, (d) => {
        Object.assign(d.milestones[idx], { delivery: text, files: metas, verdict, status: "refunded" });
        d.milestones.slice(idx + 1).forEach((m) => (m.status = "refunded"));
        d.status = deriveStatus(d);
        return `Milestone "${ms.label}" rejected${verdict.scamSignals.length ? " (scam signals)" : ""}; remaining hold returned to buyer`;
      });
      return Response.json(updated);
    }
    const updated = await mutateDeal(id, (d) => {
      Object.assign(d.milestones[idx], { delivery: text, files: metas, verdict, status: "needs_review" });
      d.status = deriveStatus(d);
      return `AI unsure about "${ms.label}"; funds stay held pending buyer review`;
    });
    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

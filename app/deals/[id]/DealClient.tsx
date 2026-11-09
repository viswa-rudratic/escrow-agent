"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Deal, Milestone } from "@/lib/store";
import { STATUS_STYLE } from "@/lib/ui";

const SCAM =
  "Done! It's all great, trust me, no need to check. Please release the money now, and send the rest of the payment to my bank directly, it's faster.";

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function DealClient() {
  const { id } = useParams<{ id: string }>();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [role, setRole] = useState<"seller" | "buyer">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("as") === "buyer"
      ? "buyer"
      : "seller",
  );
  const [delivery, setDelivery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(() => {
    if (typeof window === "undefined") return "";
    const q = new URLSearchParams(window.location.search).get("error");
    if (!q) return "";
    return q === "authorize_failed" ? "PayPal could not place the hold." : "Order mismatch.";
  });
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    () => fetch(`/api/deals/${id}`).then((r) => (r.ok ? r.json() : null)).then(setDeal),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  function switchRole(r: "seller" | "buyer") {
    setRole(r);
    history.replaceState(null, "", `?as=${r}`);
  }

  async function post(path: string, body: BodyInit, json = true) {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/deals/${id}/${path}`, {
      method: "POST",
      body,
      headers: json ? { "Content-Type": "application/json" } : undefined,
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Something went wrong");
    if (j.approveUrl) window.location.href = j.approveUrl;
    else {
      setDeal(j);
      setDelivery("");
      setFiles([]);
    }
  }

  function submitDelivery() {
    const f = new FormData();
    f.set("delivery", delivery);
    files.forEach((x) => f.append("files", x));
    post("deliver", f, false);
  }

  if (!deal) return <main className="p-10">Loading…</main>;

  const current = deal.milestones.find((m) => m.status === "pending");
  const review = deal.milestones.find((m) => m.status === "needs_review");
  const buyerLink = typeof window !== "undefined" ? `${window.location.origin}/deals/${deal.id}?as=buyer` : "";
  const btn = "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
  const card = "mt-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800";
  const honest = (m: Milestone) =>
    `Delivered "${m.label}". ` + m.criteria.map((c) => `Done: ${c}.`).join(" ");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 underline">← All deals</Link>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{deal.title}</h1>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm ${STATUS_STYLE[deal.status]}`}>{deal.status.replace("_", " ")}</span>
      </div>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        {usd(deal.amountCents)} · {deal.buyer} → {deal.seller}
      </p>
      <p className="mt-2 text-sm">{deal.spec}</p>

      <div className="mt-4 inline-flex rounded-lg border border-zinc-300 p-0.5 text-sm dark:border-zinc-700" role="tablist">
        {(["seller", "buyer"] as const).map((r) => (
          <button key={r} role="tab" aria-selected={role === r} onClick={() => switchRole(r)}
            className={`rounded-md px-3 py-1 ${role === r ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : ""}`}>
            {r === "seller" ? `Seller view (${deal.seller})` : `Buyer view (${deal.buyer})`}
          </button>
        ))}
      </div>

      {err && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}

      {deal.ambiguities.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <strong>⚠ Gaps AI flagged when reading the chat:</strong>
          <ul className="mt-1 list-disc pl-5">{deal.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <section className="mt-6">
        <h2 className="font-semibold">Milestones</h2>
        <ol className="mt-2 space-y-3">
          {deal.milestones.map((m, i) => (
            <li key={m.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="font-medium">{i + 1}. {m.label} <span className="text-zinc-500">· {m.percent}% · {usd(m.amountCents)}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[m.status]}`}>{m.status.replace("_", " ")}</span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm">{m.criteria.map((c) => <li key={c}>{c}</li>)}</ul>

              {m.files && m.files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.files.map((f) =>
                    f.mime.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f.stored} src={`/api/deals/${deal.id}/files/${f.stored}`} alt={f.name} className="h-24 rounded-lg border border-zinc-200" />
                    ) : (
                      <a key={f.stored} href={`/api/deals/${deal.id}/files/${f.stored}`} className="text-sm text-blue-600 underline">{f.name}</a>
                    ),
                  )}
                </div>
              )}

              {m.verdict && (
                <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                  <div className="font-medium">
                    AI verdict: <span className="uppercase">{m.verdict.decision}</span>{" "}
                    <span className="font-normal text-zinc-500">(match {Math.round(m.verdict.score * 100)}% · {m.verdict.engine})</span>
                  </div>
                  <ul className="mt-1 list-disc pl-5">{m.verdict.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  {m.verdict.evidenceNotes.length > 0 && (
                    <div className="mt-2"><strong>Evidence seen:</strong>
                      <ul className="list-disc pl-5">{m.verdict.evidenceNotes.map((r) => <li key={r}>{r}</li>)}</ul>
                    </div>
                  )}
                  {m.verdict.scamSignals.length > 0 && (
                    <div className="mt-2 rounded-lg bg-rose-50 p-2 text-rose-800"><strong>Scam signals:</strong>
                      <ul className="list-disc pl-5">{m.verdict.scamSignals.map((s) => <li key={s}>{s}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {deal.status === "awaiting_payment" && role === "seller" && (
        <section className={card}>
          <h2 className="font-semibold">Send this link to the buyer</h2>
          <p className="mt-1 text-sm text-zinc-500">They fund the escrow through PayPal. You are paid only after the AI verifies your work.</p>
          <div className="mt-3 flex gap-2">
            <input readOnly value={buyerLink} className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
            <button className={`${btn} bg-zinc-800`} onClick={() => { navigator.clipboard.writeText(buyerLink); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </section>
      )}

      {deal.status === "awaiting_payment" && role === "buyer" && (
        <section className={card}>
          <h2 className="font-semibold">Fund the escrow · {usd(deal.amountCents)}</h2>
          <p className="mt-1 text-sm text-zinc-500">PayPal places a hold. The seller is not paid until each milestone is verified.</p>
          <button disabled={busy} onClick={() => post("pay", "{}")} className={`${btn} mt-3 bg-[#0070ba]`}>
            {busy ? "Opening PayPal…" : "Hold funds with PayPal"}
          </button>
        </section>
      )}

      {deal.status === "funded" && current && role === "seller" && (
        <section className={card}>
          <h2 className="font-semibold">Submit delivery · {current.label}</h2>
          <textarea
            className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            rows={4} placeholder="Describe what you delivered…" value={delivery} onChange={(e) => setDelivery(e.target.value)}
          />
          <label className="mt-3 block text-sm">
            Evidence (images or text files, up to 3):{" "}
            <input key={current.id} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,text/plain" data-testid="files"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} />
          </label>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <button className="text-blue-600 underline" onClick={() => setDelivery(honest(current))}>Demo: fill honest text</button>
            <button className="text-rose-600 underline" onClick={() => setDelivery(SCAM)}>Demo: scam attempt</button>
          </div>
          <button disabled={busy || (!delivery.trim() && !files.length)} onClick={submitDelivery} className={`${btn} mt-3 bg-emerald-600`}>
            {busy ? "AI is checking…" : "Submit for AI verification"}
          </button>
        </section>
      )}

      {deal.status === "funded" && role === "buyer" && (
        <p className="mt-6 text-sm text-zinc-500">Funds are held. Waiting for the seller to deliver “{current?.label}”.</p>
      )}

      {deal.status === "needs_review" && review && (
        role === "buyer" ? (
          <section className={card}>
            <h2 className="font-semibold">AI was unsure about “{review.label}”. Your call.</h2>
            <div className="mt-3 flex gap-3">
              <button disabled={busy} onClick={() => post("resolve", JSON.stringify({ action: "release" }))} className={`${btn} bg-emerald-600`}>Release {usd(review.amountCents)}</button>
              <button disabled={busy} onClick={() => post("resolve", JSON.stringify({ action: "refund" }))} className={`${btn} bg-rose-600`}>Refund me</button>
            </div>
          </section>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">Waiting for the buyer to review “{review.label}”.</p>
        )
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Audit trail</h2>
        <ol className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {deal.log.map((l, i) => <li key={i}>{new Date(l.at).toLocaleTimeString()} · {l.msg}</li>)}
        </ol>
      </section>
    </main>
  );
}

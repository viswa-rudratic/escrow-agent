"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Deal } from "@/lib/store";
import { STATUS_STYLE } from "@/lib/ui";

const SAMPLE_CHAT = `Rahul: Hi Priya, I need a logo for my coffee roastery, Bean There
Priya: Sure! I can do 3 concepts for you
Rahul: how much will it cost?
Priya: $90 total. Half when I send the first drafts, the rest when the final files are ready
Rahul: ok. I want it coffee themed, and PNG and SVG both please
Priya: Done. I'll send drafts in 2 days and finals in 4 days
Rahul: great, should look modern, not too cartoonish. Also I may want a few changes`;

interface MS { label: string; percent: number; criteria: string }
interface Draft {
  title: string; spec: string; amount: string; buyer: string; seller: string;
  milestones: MS[]; ambiguities: string[]; engine?: string;
}
const blank: Draft = {
  title: "", spec: "", amount: "", buyer: "Buyer", seller: "Seller", ambiguities: [],
  milestones: [{ label: "Delivery", percent: 100, criteria: "" }],
};

export default function Home() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [chat, setChat] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    fetch("/api/deals").then((r) => r.json()).then(setDeals);
  }, []);

  async function analyze() {
    setBusy("analyze");
    setErr("");
    const r = await fetch("/api/extract", { method: "POST", body: JSON.stringify({ chat }) });
    const j = await r.json();
    setBusy("");
    if (!r.ok) return setErr(j.error);
    setDraft({
      title: j.title, spec: j.spec, amount: String(j.amount), buyer: j.buyer, seller: j.seller,
      ambiguities: j.ambiguities, engine: j.engine,
      milestones: j.milestones.map((m: { label: string; percent: number; criteria: string[] }) => ({
        label: m.label, percent: m.percent, criteria: m.criteria.join("\n"),
      })),
    });
  }

  async function create() {
    if (!draft) return;
    setBusy("create");
    setErr("");
    const r = await fetch("/api/deals", { method: "POST", body: JSON.stringify(draft) });
    const j = await r.json();
    setBusy("");
    if (!r.ok) return setErr(j.error);
    window.location.href = `/deals/${j.id}?as=seller`;
  }

  const setMs = (i: number, patch: Partial<MS>) =>
    setDraft((d) => d && { ...d, milestones: d.milestones.map((m, k) => (k === i ? { ...m, ...patch } : m)) });
  const input = "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";
  const total = draft?.milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0) ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">🛡️ Escrow Agent</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Millions of deals happen in WhatsApp and Instagram chats with zero protection. Paste the chat. AI turns it into a
        protected deal, PayPal holds the money, and AI checks the work before the seller gets paid.
      </p>

      <section className="mt-8 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">1 · Paste the chat</h2>
          <button className="text-sm text-blue-600 underline" onClick={() => setChat(SAMPLE_CHAT)}>Use sample chat</button>
        </div>
        <textarea className={`${input} mt-3`} rows={7} placeholder="Paste a WhatsApp / Instagram / email conversation about the deal…" value={chat} onChange={(e) => setChat(e.target.value)} />
        <div className="mt-3 flex items-center gap-4">
          <button disabled={busy === "analyze" || chat.trim().length < 20} onClick={analyze} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy === "analyze" ? "AI is reading the chat…" : "Turn chat into protected deal"}
          </button>
          <button className="text-sm text-zinc-500 underline" onClick={() => setDraft(blank)}>or fill in manually</button>
        </div>
      </section>

      {draft && (
        <section className="mt-6 space-y-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold">
            2 · Review the contract{" "}
            {draft.engine && <span className="text-xs font-normal text-zinc-500">(drafted by {draft.engine})</span>}
          </h2>
          {draft.ambiguities.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <strong>⚠ AI spotted gaps that could cause a dispute. Fix them below or confirm with the other person:</strong>
              <ul className="mt-1 list-disc pl-5">{draft.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}
          <input className={input} placeholder="What is being bought?" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <textarea className={input} rows={2} placeholder="Agreement summary" value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} />
          <div className="flex gap-3">
            <input className={input} type="number" min="1" step="0.01" placeholder="Total (USD)" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            <input className={input} placeholder="Buyer" value={draft.buyer} onChange={(e) => setDraft({ ...draft, buyer: e.target.value })} />
            <input className={input} placeholder="Seller" value={draft.seller} onChange={(e) => setDraft({ ...draft, seller: e.target.value })} />
          </div>

          {draft.milestones.map((m, i) => (
            <div key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex gap-3">
                <input className={input} placeholder="Milestone name" value={m.label} onChange={(e) => setMs(i, { label: e.target.value })} />
                <input className={`${input} max-w-24`} type="number" min="1" max="100" value={m.percent} onChange={(e) => setMs(i, { percent: Number(e.target.value) })} />
                <span className="self-center text-sm">%</span>
                {draft.milestones.length > 1 && (
                  <button className="text-sm text-rose-600" onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((_, k) => k !== i) })}>✕</button>
                )}
              </div>
              <textarea className={`${input} mt-2`} rows={3} placeholder="Acceptance criteria, one per line" value={m.criteria} onChange={(e) => setMs(i, { criteria: e.target.value })} />
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <button className="text-blue-600 underline" disabled={draft.milestones.length >= 5} onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { label: "", percent: 0, criteria: "" }] })}>+ Add milestone</button>
            <span className={total === 100 ? "text-emerald-600" : "text-rose-600"}>Total {total}%</span>
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <button disabled={busy === "create"} onClick={create} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy === "create" ? "Creating…" : "Create protected deal"}
          </button>
        </section>
      )}
      {!draft && err && <p className="mt-3 text-sm text-rose-600">{err}</p>}

      <h2 className="mt-10 font-semibold">Deals</h2>
      <ul className="mt-3 space-y-2">
        {deals.length === 0 && <li className="text-sm text-zinc-500">No deals yet.</li>}
        {deals.map((d) => (
          <li key={d.id}>
            <Link href={`/deals/${d.id}?as=seller`} className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              <span>{d.title} <span className="text-zinc-500">· ${(d.amountCents / 100).toFixed(2)} · {d.milestones.length} milestone{d.milestones.length > 1 ? "s" : ""}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[d.status]}`}>{d.status.replace("_", " ")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

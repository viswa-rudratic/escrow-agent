"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Deal } from "@/lib/store";

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
  title: "", spec: "", amount: "", buyer: "", seller: "", ambiguities: [],
  milestones: [{ label: "Delivery", percent: 100, criteria: "" }],
};

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function Home() {
  const router = useRouter();
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
    router.push(`/deals/${j.id}?as=seller`);
  }

  const setMs = (i: number, patch: Partial<MS>) =>
    setDraft((d) => d && { ...d, milestones: d.milestones.map((m, k) => (k === i ? { ...m, ...patch } : m)) });
  const total = draft?.milestones.reduce((s, m) => s + (Number(m.percent) || 0), 0) ?? 0;

  return (
    <main className="wrap">
      <header className="masthead">
        <span className="kicker">Escrow Agent</span>
        <span className="kicker">Sandbox edition · no real money moves</span>
      </header>

      <h1 className="display">Settle it in writing before anyone pays.</h1>
      <p className="lede mt-5">
        Most deals are agreed in a chat and paid on trust. Paste the conversation. We write down what was promised,
        PayPal holds the money, and the seller is paid only when the work matches the agreement.
      </p>

      <section className="sec">
        <div className="sec-head">
          <span className="kicker">01</span>
          <h2>The conversation</h2>
          <button className="link kicker ml-auto" onClick={() => setChat(SAMPLE_CHAT)}>Use sample chat</button>
        </div>
        <textarea
          className="field lined"
          rows={7}
          placeholder="Paste the WhatsApp, Instagram or email thread where you agreed the deal."
          value={chat}
          onChange={(e) => setChat(e.target.value)}
        />
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <button className="btn" disabled={busy === "analyze" || chat.trim().length < 20} onClick={analyze}>
            {busy === "analyze" ? "Reading the chat…" : "Turn chat into protected deal"}
          </button>
          <button className="link kicker" onClick={() => setDraft(blank)}>or write it by hand</button>
        </div>
        {!draft && err && <p className="err mono text-sm">{err}</p>}
      </section>

      {draft && (
        <section className="sec">
          <div className="sec-head">
            <span className="kicker">02</span>
            <h2>Review the contract</h2>
            {draft.engine && <span className="kicker ml-auto">drafted by {draft.engine}</span>}
          </div>

          {draft.ambiguities.length > 0 && (
            <div className="warn mb-7">
              <p className="kicker" style={{ color: "var(--ochre)" }}>Read before you sign</p>
              <p className="mt-1">These points were left open in the chat and are the usual cause of disputes:</p>
              <ul className="dash mt-2">{draft.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}

          <div className="space-y-6">
            <label className="block"><span className="kicker label">What is being bought</span>
              <input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className="block"><span className="kicker label">Agreed in one sentence</span>
              <textarea className="field" rows={2} value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} /></label>
            <div className="grid gap-6 sm:grid-cols-3">
              <label className="block"><span className="kicker label">Total (USD)</span>
                <input className="field mono" type="number" min="1" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
              <label className="block"><span className="kicker label">Buyer</span>
                <input className="field" value={draft.buyer} onChange={(e) => setDraft({ ...draft, buyer: e.target.value })} /></label>
              <label className="block"><span className="kicker label">Seller</span>
                <input className="field" value={draft.seller} onChange={(e) => setDraft({ ...draft, seller: e.target.value })} /></label>
            </div>
          </div>

          <p className="kicker mt-10">Payment milestones</p>
          <div className="mt-2">
            {draft.milestones.map((m, i) => (
              <div key={i} className="entry">
                <span className="numeral">{i + 1}</span>
                <div>
                  <div className="flex items-end gap-4">
                    <label className="block flex-1"><span className="kicker label">Name</span>
                      <input className="field" value={m.label} onChange={(e) => setMs(i, { label: e.target.value })} /></label>
                    <label className="block w-20"><span className="kicker label">Share %</span>
                      <input className="field mono" type="number" min="1" max="100" value={m.percent} onChange={(e) => setMs(i, { percent: Number(e.target.value) })} /></label>
                    {draft.milestones.length > 1 && (
                      <button className="link kicker pb-2" onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((_, k) => k !== i) })}>remove</button>
                    )}
                  </div>
                  <label className="mt-4 block"><span className="kicker label">Accepted as done when (one per line)</span>
                    <textarea className="field" rows={3} value={m.criteria} onChange={(e) => setMs(i, { criteria: e.target.value })} /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-[var(--ink)] pt-3">
            <button className="link kicker" disabled={draft.milestones.length >= 5}
              onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { label: "", percent: 0, criteria: "" }] })}>Add milestone</button>
            <span className="mono text-sm" style={{ color: total === 100 ? "var(--green)" : "var(--red)" }}>{total}% of 100%</span>
          </div>

          {err && <p className="err mono text-sm">{err}</p>}
          <div className="mt-8">
            <button className="btn btn-green" disabled={busy === "create"} onClick={create}>
              {busy === "create" ? "Drawing it up…" : "Create protected deal"}
            </button>
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-head"><span className="kicker">Ledger</span><h2>Your deals</h2></div>
        {deals.length === 0 && <p className="text-[var(--ink-2)] italic">Nothing here yet. Your first deal will be listed after you create it.</p>}
        <ul>
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/deals/${d.id}?as=seller`} className="row border-b border-[var(--rule)] py-3 hover:bg-[var(--paper-2)]">
                <span className="font-medium">{d.title}</span>
                <span className="leader" />
                <span className="mono text-sm">{usd(d.amountCents)}</span>
                <span className={`stamp ${d.status}`}>{d.status.replace("_", " ")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

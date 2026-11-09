"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Deal } from "@/lib/store";
import { STATUS_LABEL, usd } from "@/lib/ui";

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
        <span className="brand">Escrow Agent</span>
        <span className="kicker">Test mode: no real money moves</span>
      </header>

      <h1 className="display">Settle it in writing before anyone pays.</h1>
      <p className="lede mt-5">
        Agreed a deal in a chat? Paste it here. We write down what was promised, PayPal holds the money, and the seller
        is paid only when the work matches the agreement.
      </p>

      <ol className="how">
        <li><b>1</b><span>Paste the chat where you agreed the deal</span></li>
        <li><b>2</b><span>Check the written agreement and share the link</span></li>
        <li><b>3</b><span>Buyer pays into PayPal escrow. Seller gets paid after the work is checked</span></li>
      </ol>

      <section className="sec">
        <div className="sec-head">
          <h2>Step 1. Paste the conversation</h2>
          <button className="link ml-auto" onClick={() => setChat(SAMPLE_CHAT)}>Use sample chat</button>
        </div>
        <textarea
          className="field lined"
          rows={7}
          aria-label="Chat conversation"
          placeholder="Paste a WhatsApp, Instagram or email conversation here."
          value={chat}
          onChange={(e) => setChat(e.target.value)}
        />
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <button className="btn" disabled={busy === "analyze" || chat.trim().length < 20} onClick={analyze}>
            {busy === "analyze" ? "Reading the chat…" : "Turn chat into protected deal"}
          </button>
          <button className="link" onClick={() => setDraft(blank)}>or fill it in by hand</button>
        </div>
        {chat.trim().length < 20 && !draft && <p className="hint mt-3">Paste at least a few lines to continue, or load the example from the link above.</p>}
        {busy === "analyze" && <p className="hint mt-3" role="status">This takes a few seconds.</p>}
        {!draft && err && <p className="err" role="alert">{err}</p>}
      </section>

      {draft && (
        <section className="sec">
          <div className="sec-head">
            <h2>Step 2. Review the contract</h2>
            {draft.engine && <span className="kicker ml-auto">written by {draft.engine}</span>}
          </div>
          <p className="hint mb-5">Fix anything that is wrong. This is what the AI will check the work against.</p>

          {draft.ambiguities.length > 0 && (
            <div className="warn mb-7">
              <p className="warn-title">Not clear in the chat</p>
              <p className="mt-1 text-base">These points were left open. They are the usual cause of arguments, so settle them now:</p>
              <ul className="dash mt-2 text-base">{draft.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          )}

          <div className="space-y-6">
            <label className="block"><span className="lbl">What is being bought</span>
              <input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
            <label className="block"><span className="lbl">What was agreed, in one sentence</span>
              <textarea className="field" rows={2} value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} /></label>
            <div className="grid gap-6 sm:grid-cols-3">
              <label className="block"><span className="lbl">Total price (USD)</span>
                <input className="field mono" type="number" min="1" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
              <label className="block"><span className="lbl">Buyer name</span>
                <input className="field" value={draft.buyer} onChange={(e) => setDraft({ ...draft, buyer: e.target.value })} /></label>
              <label className="block"><span className="lbl">Seller name</span>
                <input className="field" value={draft.seller} onChange={(e) => setDraft({ ...draft, seller: e.target.value })} /></label>
            </div>
          </div>

          <h3 className="mt-10 text-lg font-semibold">Payments, in stages</h3>
          <p className="hint">The seller is paid one stage at a time, after that stage is checked.</p>
          <div className="mt-3 border-t border-[var(--ink)] pt-3">
            {draft.milestones.map((m, i) => (
              <div key={i} className="entry">
                <span className="numeral">{i + 1}</span>
                <div>
                  <div className="flex items-end gap-4">
                    <label className="block flex-1"><span className="lbl">Stage name</span>
                      <input className="field" value={m.label} onChange={(e) => setMs(i, { label: e.target.value })} /></label>
                    <label className="block w-24"><span className="lbl">Share (%)</span>
                      <input className="field mono" type="number" min="1" max="100" value={m.percent} onChange={(e) => setMs(i, { percent: Number(e.target.value) })} /></label>
                    {draft.milestones.length > 1 && (
                      <button className="link pb-3" aria-label={`Remove stage ${i + 1}`} onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((_, k) => k !== i) })}>Remove</button>
                    )}
                  </div>
                  <label className="mt-4 block"><span className="lbl">This stage counts as done when… (one per line)</span>
                    <textarea className="field" rows={3} value={m.criteria} onChange={(e) => setMs(i, { criteria: e.target.value })} /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between border-t border-[var(--ink)] pt-3">
            <button className="link" disabled={draft.milestones.length >= 5}
              onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { label: "", percent: 0, criteria: "" }] })}>+ Add another stage</button>
            <span className="mono text-sm font-medium" style={{ color: total === 100 ? "var(--green)" : "var(--red)" }}>
              {total === 100 ? "Shares add up to 100%" : `Shares add up to ${total}%. They must total 100%`}
            </span>
          </div>

          {err && <p className="err" role="alert">{err}</p>}
          <div className="mt-8">
            <button className="btn btn-green" disabled={busy === "create" || total !== 100} onClick={create}>
              {busy === "create" ? "Creating…" : "Create protected deal"}
            </button>
          </div>
        </section>
      )}

      <section className="sec">
        <div className="sec-head"><h2>Your deals</h2></div>
        {deals.length === 0 && <p className="muted">No deals yet. Your first one will appear here.</p>}
        <ul>
          {deals.map((d) => (
            <li key={d.id}>
              <Link href={`/deals/${d.id}?as=seller`} className="row border-b border-[var(--rule)] px-1 py-3.5 hover:bg-[var(--paper-2)]">
                <span className="font-semibold">{d.title}</span>
                <span className="leader" />
                <span className="mono text-sm">{usd(d.amountCents)}</span>
                <span className={`badge ${d.status}`}>{STATUS_LABEL[d.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

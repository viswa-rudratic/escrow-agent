"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import Icon from "@/components/Icon";
import HeroVisual from "@/components/HeroVisual";
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
const SHADES = ["var(--brand)", "#3a9d78", "#7cc3a5", "#a9d9c3", "#cfe9dd"];

export default function Home() {
  const router = useRouter();
  const composer = useRef<HTMLDivElement>(null);
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
  const amount = Number(draft?.amount) || 0;
  const startNow = () => composer.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Nav />

      {/* ---------------- hero ---------------- */}
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="eyebrow">Escrow for deals made in chat</p>
            <h1 className="h1 mt-4">
              Settle it <span className="serif">in writing</span> before anyone pays.
            </h1>
            <p className="lede mt-6">
              Agreed a deal on WhatsApp or Instagram? Paste the chat. We write down what was promised, PayPal holds the
              money, and the seller is paid only when the work matches.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button className="btn btn-lg" onClick={startNow}>Start with a chat <Icon name="arrow" size={18} /></button>
              <a href="#how" className="btn btn-lg btn-secondary">See how it works</a>
            </div>
            <div className="trust">
              <span><Icon name="lock" size={16} /> Money held by PayPal</span>
              <span><Icon name="spark" size={16} /> AI checks every stage</span>
              <span><Icon name="undo" size={16} /> Refund if it is not as agreed</span>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section id="how" className="section">
        <div className="shell">
          <p className="eyebrow">How it works</p>
          <h2 className="h2 mt-3 max-w-xl">Three steps from a messy chat to a protected payment.</h2>
          <div className="how mt-8">
            <div className="card how-card">
              <span className="how-ic"><Icon name="chat" size={22} /></span>
              <p className="how-n">01</p>
              <h3 className="h3">Paste the chat</h3>
              <p className="muted mt-2">AI pulls out the price, the stages and what counts as done, and points out anything left vague.</p>
            </div>
            <div className="card how-card">
              <span className="how-ic"><Icon name="lock" size={22} /></span>
              <p className="how-n">02</p>
              <h3 className="h3">Buyer pays into escrow</h3>
              <p className="muted mt-2">PayPal holds the money. The seller can see it is there, but cannot touch it yet.</p>
            </div>
            <div className="card how-card">
              <span className="how-ic"><Icon name="shield" size={22} /></span>
              <p className="how-n">03</p>
              <h3 className="h3">AI checks, then pays</h3>
              <p className="muted mt-2">Each stage is paid after the AI inspects the proof, including images. Bad work gets refunded.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- composer ---------------- */}
      <section id="start" ref={composer} className="section" style={{ scrollMarginTop: "4rem" }}>
        <div className="shell">
          <div className="narrow">
            <div className="stepper mb-5">
              <span className={draft ? "done" : "on"} style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                <span className="dot">{draft ? <Icon name="check" size={13} /> : "1"}</span> Paste the chat
              </span>
              <span className="bar" />
              <span className={draft ? "on" : ""} style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                <span className="dot">2</span> Check the agreement
              </span>
            </div>

            <div className="card pad-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="h2">Paste the conversation</h2>
                  <p className="muted mt-1">WhatsApp, Instagram, email: anything where you agreed the deal.</p>
                </div>
                <button className="link shrink-0" onClick={() => setChat(SAMPLE_CHAT)}>Use sample chat</button>
              </div>
              <textarea
                className="input chatbox mt-5"
                rows={8}
                aria-label="Chat conversation"
                placeholder={"Rahul: Hi, can you design a logo for my shop?\nPriya: Sure, $90 total..."}
                value={chat}
                onChange={(e) => setChat(e.target.value)}
              />
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button className="btn btn-lg" disabled={busy === "analyze" || chat.trim().length < 20} onClick={analyze}>
                  {busy === "analyze" ? "Reading the chat…" : <>Turn chat into protected deal <Icon name="arrow" size={18} /></>}
                </button>
                <button className="link-quiet" onClick={() => setDraft(blank)}>or fill it in by hand</button>
              </div>
              {busy === "analyze" && <p className="help" role="status">This takes a few seconds.</p>}
              {!draft && err && <div className="callout bad mt-5" role="alert"><Icon name="alert" /><span>{err}</span></div>}
            </div>

            {draft && (
              <div className="card pad-lg mt-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="h2">Review the contract</h2>
                    <p className="muted mt-1">Fix anything that is wrong. The AI will check the work against this.</p>
                  </div>
                  {draft.engine && <span className="pill released shrink-0"><Icon name="spark" size={13} /> {draft.engine}</span>}
                </div>

                {draft.ambiguities.length > 0 && (
                  <div className="callout warn mt-6">
                    <Icon name="alert" className="mt-0.5" />
                    <div>
                      <b>Not clear in the chat</b>
                      These points were left open. They are the usual cause of arguments, so settle them now.
                      <ul>{draft.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-5">
                  <label><span className="lbl">What is being bought</span>
                    <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                  <label><span className="lbl">What was agreed, in one sentence</span>
                    <textarea className="input" rows={2} value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} /></label>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <label><span className="lbl">Total price (USD)</span>
                      <input className="input mono" type="number" min="1" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></label>
                    <label><span className="lbl">Buyer</span>
                      <input className="input" value={draft.buyer} onChange={(e) => setDraft({ ...draft, buyer: e.target.value })} /></label>
                    <label><span className="lbl">Seller</span>
                      <input className="input" value={draft.seller} onChange={(e) => setDraft({ ...draft, seller: e.target.value })} /></label>
                  </div>
                </div>

                <div className="mt-9">
                  <h3 className="h3">Payment stages</h3>
                  <p className="muted text-sm">The seller is paid one stage at a time, after that stage is checked.</p>
                  <div className="seg mt-4" role="img" aria-label="Payment split">
                    {draft.milestones.map((m, i) => <i key={i} style={{ flex: Math.max(Number(m.percent) || 0, 0.5), background: SHADES[i % SHADES.length] }} />)}
                  </div>
                  <div className="legend">
                    {draft.milestones.map((m, i) => (
                      <span key={i}><i style={{ background: SHADES[i % SHADES.length] }} />{m.label || `Stage ${i + 1}`}: {m.percent}% {amount > 0 && <span className="mono">({usd(Math.round(amount * 100 * (Number(m.percent) || 0) / 100))})</span>}</span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4">
                    {draft.milestones.map((m, i) => (
                      <div key={i} className="stage">
                        <div className="flex items-center justify-between">
                          <span className="eyebrow" style={{ color: "var(--ink-3)" }}>Stage {i + 1}</span>
                          {draft.milestones.length > 1 && (
                            <button className="iconbtn" aria-label={`Remove stage ${i + 1}`}
                              onClick={() => setDraft({ ...draft, milestones: draft.milestones.filter((_, k) => k !== i) })}><Icon name="x" size={16} /></button>
                          )}
                        </div>
                        <div className="mt-2 grid gap-4 sm:grid-cols-[1fr_7rem]">
                          <label><span className="lbl">Stage name</span>
                            <input className="input" value={m.label} onChange={(e) => setMs(i, { label: e.target.value })} /></label>
                          <label><span className="lbl">Share (%)</span>
                            <input className="input mono" type="number" min="1" max="100" value={m.percent} onChange={(e) => setMs(i, { percent: Number(e.target.value) })} /></label>
                        </div>
                        <label className="mt-4 block"><span className="lbl">This stage counts as done when…</span>
                          <textarea className="input" rows={3} value={m.criteria} onChange={(e) => setMs(i, { criteria: e.target.value })} />
                          <span className="help">One condition per line. Be specific: the AI checks each one.</span></label>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button className="link inline-flex items-center gap-1.5" disabled={draft.milestones.length >= 5}
                      onClick={() => setDraft({ ...draft, milestones: [...draft.milestones, { label: "", percent: 0, criteria: "" }] })}>
                      <Icon name="plus" size={16} /> Add another stage</button>
                    <span className={`pill ${total === 100 ? "released" : "refunded"}`}>
                      {total === 100 ? "Shares add up to 100%" : `Shares add up to ${total}%. They must total 100%`}
                    </span>
                  </div>
                </div>

                {err && <div className="callout bad mt-6" role="alert"><Icon name="alert" /><span>{err}</span></div>}
                <div className="mt-8 flex items-center gap-4 border-t pt-6" style={{ borderColor: "var(--line)" }}>
                  <button className="btn btn-lg" disabled={busy === "create" || total !== 100} onClick={create}>
                    {busy === "create" ? "Creating…" : <>Create protected deal <Icon name="arrow" size={18} /></>}
                  </button>
                  <span className="help" style={{ margin: 0 }}>Next you get a link to send to the buyer.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- deals ---------------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="shell">
          <div className="narrow">
            <h2 className="h2">Your deals</h2>
            <div className="card mt-5 divide overflow-hidden">
              {deals.length === 0 && (
                <div className="pad text-center">
                  <p className="font-semibold">No deals yet</p>
                  <p className="muted text-sm mt-1">Paste a chat above and your first protected deal will show up here.</p>
                </div>
              )}
              {deals.map((d) => (
                <Link key={d.id} href={`/deals/${d.id}?as=seller`} className="deal-row">
                  <span className="avatar">{d.seller.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{d.title}</span>
                    <span className="faint block text-sm">{d.buyer} to {d.seller} · {d.milestones.length} stage{d.milestones.length > 1 ? "s" : ""}</span>
                  </span>
                  <span className="mono font-medium">{usd(d.amountCents)}</span>
                  <span className={`pill ${d.status}`}>{STATUS_LABEL[d.status]}</span>
                  <Icon name="chevron" size={18} className="faint" />
                </Link>
              ))}
            </div>
          </div>
          <footer className="foot">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Built for the PayPal AI Hackathon. Runs on the PayPal sandbox: no real money moves.</span>
              <a className="link-quiet" href="https://github.com/viswa-rudratic/escrow-agent">Source on GitHub</a>
            </div>
          </footer>
        </div>
      </section>
    </>
  );
}

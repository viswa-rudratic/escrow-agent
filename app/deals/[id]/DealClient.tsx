"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Deal, Milestone } from "@/lib/store";

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

  if (!deal) return <main className="wrap"><p className="kicker pt-16">Loading the agreement…</p></main>;

  const current = deal.milestones.find((m) => m.status === "pending");
  const review = deal.milestones.find((m) => m.status === "needs_review");
  const buyerLink = typeof window !== "undefined" ? `${window.location.origin}/deals/${deal.id}?as=buyer` : "";
  const honest = (m: Milestone) =>
    `Delivered "${m.label}". ` + m.criteria.map((c) => `Done: ${c}.`).join(" ");
  const settled = deal.milestones.filter((m) => m.status === "released").reduce((s, m) => s + m.amountCents, 0);

  return (
    <main className="wrap">
      <header className="masthead">
        <Link href="/" className="kicker link">&larr; All deals</Link>
        <span className="kicker">Agreement no. {deal.id}</span>
      </header>

      <div className="flex items-start justify-between gap-4">
        <h1 className="title">{deal.title}</h1>
        <span className={`stamp mt-2 ${deal.status}`}>{deal.status.replace("_", " ")}</span>
      </div>
      <p className="mt-3 text-[var(--ink-2)]">{deal.spec}</p>

      <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-[var(--ink)] py-4">
        <div><dt className="kicker">Buyer</dt><dd className="mt-1">{deal.buyer}</dd></div>
        <div><dt className="kicker">Seller</dt><dd className="mt-1">{deal.seller}</dd></div>
        <div className="text-right"><dt className="kicker">In escrow</dt>
          <dd className="mono mt-1 text-xl">{usd(deal.amountCents)}</dd>
          {settled > 0 && <dd className="kicker mt-1" style={{ color: "var(--green)" }}>{usd(settled)} paid out</dd>}
        </div>
      </dl>

      <div className="tabs mt-8" role="tablist">
        {(["seller", "buyer"] as const).map((r) => (
          <button key={r} role="tab" aria-selected={role === r} className="tab" onClick={() => switchRole(r)}>
            {r === "seller" ? `Seller view (${deal.seller})` : `Buyer view (${deal.buyer})`}
          </button>
        ))}
      </div>

      {err && <p className="err mono text-sm">{err}</p>}

      {deal.ambiguities.length > 0 && (
        <div className="warn mt-7">
          <p className="kicker" style={{ color: "var(--ochre)" }}>Left open in the chat</p>
          <ul className="dash mt-1">{deal.ambiguities.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <section className="sec">
        <div className="sec-head"><span className="kicker">Terms</span><h2>Milestones</h2></div>
        <ol>
          {deal.milestones.map((m, i) => (
            <li key={m.id} className="entry">
              <span className="numeral">{i + 1}</span>
              <div>
                <div className="row">
                  <span className="text-lg font-semibold">{m.label}</span>
                  <span className="leader" />
                  <span className="mono text-sm">{m.percent}% · {usd(m.amountCents)}</span>
                  <span className={`stamp ${m.status}`}>{m.status.replace("_", " ")}</span>
                </div>
                <ul className="dash mt-2 text-[var(--ink-2)]">{m.criteria.map((c) => <li key={c}>{c}</li>)}</ul>

                {m.files && m.files.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-end gap-3">
                    {m.files.map((f) =>
                      f.mime.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={f.stored} src={`/api/deals/${deal.id}/files/${f.stored}`} alt={f.name}
                          className="max-h-28 border border-[var(--ink)] bg-white p-1" />
                      ) : (
                        <a key={f.stored} href={`/api/deals/${deal.id}/files/${f.stored}`} className="link mono text-sm">{f.name}</a>
                      ),
                    )}
                  </div>
                )}

                {m.verdict && (
                  <div className="note">
                    <p className="kicker" style={{ color: "var(--ink)" }}>
                      AI verdict: {m.verdict.decision} · {Math.round(m.verdict.score * 100)}% match · {m.verdict.engine}
                    </p>
                    <ul className="dash mt-2">{m.verdict.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                    {m.verdict.evidenceNotes.length > 0 && (
                      <>
                        <p className="kicker mt-3">What the arbiter saw in the files</p>
                        <ul className="dash mt-1 italic">{m.verdict.evidenceNotes.map((r) => <li key={r}>{r}</li>)}</ul>
                      </>
                    )}
                    {m.verdict.scamSignals.length > 0 && (
                      <div className="flag">
                        <p className="kicker" style={{ color: "var(--red)" }}>Flags raised</p>
                        <ul className="dash mt-1">{m.verdict.scamSignals.map((s) => <li key={s}>{s}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {deal.status === "awaiting_payment" && role === "seller" && (
        <section className="sec">
          <div className="sec-head"><span className="kicker">Next</span><h2>Send this link to the buyer</h2></div>
          <p className="text-[var(--ink-2)]">They put the money in escrow through PayPal. You are paid milestone by milestone, only after the work is checked.</p>
          <div className="mt-4 flex items-end gap-4">
            <input readOnly value={buyerLink} className="field mono text-sm" />
            <button className="btn btn-ghost" onClick={() => { navigator.clipboard.writeText(buyerLink); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </section>
      )}

      {deal.status === "awaiting_payment" && role === "buyer" && (
        <section className="sec">
          <div className="sec-head"><span className="kicker">Next</span><h2>Put {usd(deal.amountCents)} in escrow</h2></div>
          <p className="text-[var(--ink-2)]">PayPal places a hold on your account. Nothing reaches the seller until each milestone is checked against the terms above.</p>
          <div className="mt-5">
            <button disabled={busy} onClick={() => post("pay", "{}")} className="btn">
              {busy ? "Opening PayPal…" : "Hold funds with PayPal"}
            </button>
          </div>
        </section>
      )}

      {deal.status === "funded" && current && role === "seller" && (
        <section className="sec">
          <div className="sec-head"><span className="kicker">Next</span><h2>Hand over the work: {current.label}</h2></div>
          <textarea className="field lined" rows={4} placeholder="Describe what you delivered…" value={delivery} onChange={(e) => setDelivery(e.target.value)} />
          <label className="mt-5 block">
            <span className="kicker label">Evidence: images, SVG or text files, up to three</span>
            <input key={current.id} type="file" multiple data-testid="files" className="mono text-sm"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,text/plain"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))} />
          </label>
          <div className="mt-4 flex gap-5">
            <button className="link kicker" onClick={() => setDelivery(honest(current))}>Demo: fill honest text</button>
            <button className="link kicker" style={{ color: "var(--red)" }} onClick={() => setDelivery(SCAM)}>Demo: scam attempt</button>
          </div>
          <div className="mt-6">
            <button disabled={busy || (!delivery.trim() && !files.length)} onClick={submitDelivery} className="btn btn-green">
              {busy ? "Checking the work…" : "Submit for AI verification"}
            </button>
          </div>
        </section>
      )}

      {deal.status === "funded" && role === "buyer" && (
        <p className="sec italic text-[var(--ink-2)]">The money is held. Waiting for the seller to deliver &ldquo;{current?.label}&rdquo;.</p>
      )}

      {deal.status === "needs_review" && review && (
        role === "buyer" ? (
          <section className="sec">
            <div className="sec-head"><span className="kicker">Your call</span><h2>The arbiter was unsure about &ldquo;{review.label}&rdquo;</h2></div>
            <div className="flex gap-4">
              <button disabled={busy} onClick={() => post("resolve", JSON.stringify({ action: "release" }))} className="btn btn-green">Release {usd(review.amountCents)}</button>
              <button disabled={busy} onClick={() => post("resolve", JSON.stringify({ action: "refund" }))} className="btn btn-red">Refund me</button>
            </div>
          </section>
        ) : (
          <p className="sec italic text-[var(--ink-2)]">Waiting for the buyer to review &ldquo;{review.label}&rdquo;.</p>
        )
      )}

      <section className="sec">
        <div className="sec-head"><span className="kicker">Record</span><h2>Audit trail</h2></div>
        <ol className="log">
          {deal.log.map((l, i) => (
            <li key={i}><span>{new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><span>{l.msg}</span></li>
          ))}
        </ol>
      </section>
    </main>
  );
}

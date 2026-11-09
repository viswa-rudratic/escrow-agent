# Devpost submission text (copy/paste)

## Project name
Escrow Agent

## Tagline
Paste the chat. Protect the deal. AI checks the work, PayPal holds the money.

## Inspiration
Most small deals (freelance gigs, custom orders, resale) are agreed in WhatsApp or Instagram chats with no protection. Buyers fear paying first; sellers fear working first. Traditional escrow is slow, manual and made for big transactions.

## What it does
- **Chat → contract:** paste a messy deal chat; AI extracts price, milestones and objective acceptance criteria, and warns about gaps that cause disputes (subjective wording, undefined revisions, fees).
- **PayPal holds the money:** the buyer approves an AUTHORIZE order; funds are held, not captured.
- **Milestone payouts:** each verified milestone triggers a PayPal *partial capture*; the final one closes the authorization.
- **AI evidence check:** vision AI inspects uploaded images/files against the criteria and flags scam patterns (off-platform payment, pressure to release, mismatched evidence).
- **Safe by design:** rejected work voids the remaining hold back to the buyer; unsure cases go to the buyer; AI failure never auto-releases money.
- **Shareable links** with separate buyer and seller views, plus a full audit trail.

## How we built it
Next.js 16 (App Router, TypeScript, Tailwind). PayPal Orders v2 (authorize, partial capture, void) in the sandbox. Gemini (vision + JSON mode) with a provider-agnostic layer and a deterministic fallback. Uploaded files are served sandboxed; all user and image text is treated as untrusted to resist prompt injection.

## Challenges
Making partial captures and voids line up with milestone state; getting the AI to reason over *evidence* rather than claims; keeping money movement fail-safe when a model call is slow or fails.

## Accomplishments
A complete end-to-end flow verified against the live PayPal sandbox, including a rejected "scam" delivery whose hold was voided and a two-milestone deal that captured twice.

## What we learned
Trust products need an explainable audit trail as much as a correct verdict.

## What's next
Real identity (PayPal Login), captured-funds escrow with Payouts for long deals, dispute appeal with both parties' evidence, WhatsApp bot integration, multi-currency.

## Why it fits the prize categories
- **Best Use of PayPal + AI / Agentic Commerce:** an AI agent that reads the deal, inspects the evidence and autonomously decides whether PayPal releases, partially captures or voids the money, with a human override and a full audit trail.

## Built with
PayPal Orders API, Next.js, TypeScript, Tailwind CSS, Gemini API, Playwright (E2E testing)

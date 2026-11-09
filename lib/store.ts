import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type MilestoneStatus = "pending" | "released" | "refunded" | "needs_review";
export type Status =
  | "awaiting_payment"
  | "funded"
  | "released"
  | "refunded"
  | "partial"
  | "needs_review";

export interface Verdict {
  decision: "release" | "reject" | "review";
  score: number;
  reasons: string[];
  scamSignals: string[];
  evidenceNotes: string[];
  engine: "claude" | "gemini" | "mock";
}

export interface FileMeta {
  name: string;
  mime: string;
  size: number;
  stored: string; // file name on disk
}

export interface Milestone {
  id: string;
  label: string;
  percent: number;
  amountCents: number;
  criteria: string[];
  status: MilestoneStatus;
  delivery?: string;
  files?: FileMeta[];
  verdict?: Verdict;
  captureId?: string;
}

export interface Deal {
  id: string;
  title: string;
  spec: string;
  amountCents: number;
  buyer: string;
  seller: string;
  ambiguities: string[];
  milestones: Milestone[];
  status: Status;
  orderId?: string;
  authorizationId?: string;
  createdAt: string;
  log: { at: string; msg: string }[];
}

const DIR = path.join(process.cwd(), "data");
const FILE = path.join(DIR, "deals.json");
export const UPLOAD_DIR = path.join(DIR, "uploads");

async function readAll(): Promise<Deal[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeAll(deals: Deal[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(deals, null, 2));
}

export const listDeals = async () =>
  (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getDeal = async (id: string) =>
  (await readAll()).find((d) => d.id === id) ?? null;

/** Split total into milestone amounts; the last one absorbs rounding. */
export function splitAmounts(totalCents: number, percents: number[]) {
  let used = 0;
  return percents.map((p, i) => {
    if (i === percents.length - 1) return totalCents - used;
    const c = Math.round((totalCents * p) / 100);
    used += c;
    return c;
  });
}

export async function createDeal(input: {
  title: string;
  spec: string;
  amountCents: number;
  buyer: string;
  seller: string;
  ambiguities: string[];
  milestones: { label: string; percent: number; criteria: string[] }[];
}) {
  const deals = await readAll();
  const now = new Date().toISOString();
  const amounts = splitAmounts(input.amountCents, input.milestones.map((m) => m.percent));
  const deal: Deal = {
    id: randomUUID().slice(0, 8),
    title: input.title,
    spec: input.spec,
    amountCents: input.amountCents,
    buyer: input.buyer,
    seller: input.seller,
    ambiguities: input.ambiguities,
    milestones: input.milestones.map((m, i) => ({
      id: `m${i + 1}`,
      label: m.label,
      percent: m.percent,
      amountCents: amounts[i],
      criteria: m.criteria,
      status: "pending",
    })),
    status: "awaiting_payment",
    createdAt: now,
    log: [{ at: now, msg: "Deal created from agreement" }],
  };
  deals.push(deal);
  await writeAll(deals);
  return deal;
}

/** Derive the deal-level status from its milestones. */
export function deriveStatus(d: Deal): Status {
  if (d.milestones.some((m) => m.status === "needs_review")) return "needs_review";
  if (d.milestones.some((m) => m.status === "pending")) return "funded";
  if (d.milestones.every((m) => m.status === "released")) return "released";
  if (d.milestones.every((m) => m.status === "refunded")) return "refunded";
  return "partial";
}

export async function mutateDeal(id: string, fn: (d: Deal) => void | string) {
  const deals = await readAll();
  const i = deals.findIndex((d) => d.id === id);
  if (i < 0) throw new Error("Deal not found");
  const msg = fn(deals[i]);
  if (typeof msg === "string")
    deals[i].log.push({ at: new Date().toISOString(), msg });
  await writeAll(deals);
  return deals[i];
}

import { randomUUID } from "node:crypto";

const base = () => process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com";

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials missing in .env.local");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return (await res.json()).access_token;
}

async function call(path: string, body?: unknown) {
  const token = await accessToken();
  const res = await fetch(`${base()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": randomUUID(),
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`PayPal ${path} failed (${res.status}): ${json.message ?? text}`);
  }
  return json;
}

export const toValue = (cents: number) => (cents / 100).toFixed(2);

/** Create an order with intent AUTHORIZE so funds are held, not captured. */
export async function createHoldOrder(opts: {
  dealId: string;
  title: string;
  amountCents: number;
  returnUrl: string;
  cancelUrl: string;
}) {
  const order = await call("/v2/checkout/orders", {
    intent: "AUTHORIZE",
    purchase_units: [
      {
        reference_id: opts.dealId,
        custom_id: opts.dealId,
        description: `Escrow: ${opts.title}`.slice(0, 120),
        amount: { currency_code: "USD", value: toValue(opts.amountCents) },
        ...(process.env.PAYPAL_MERCHANT_EMAIL
          ? { payee: { email_address: process.env.PAYPAL_MERCHANT_EMAIL } }
          : {}),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: opts.returnUrl,
          cancel_url: opts.cancelUrl,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
          brand_name: "Escrow Agent",
        },
      },
    },
  });
  const link = (order.links as { rel: string; href: string }[]).find(
    (l) => l.rel === "payer-action" || l.rel === "approve",
  );
  if (!link) throw new Error("PayPal did not return an approval link");
  return { orderId: order.id as string, approveUrl: link.href };
}

/** After buyer approval: place the hold. Returns the authorization id. */
export async function authorizeOrder(orderId: string) {
  const res = await call(`/v2/checkout/orders/${orderId}/authorize`);
  const auth = res.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!auth?.id) throw new Error("Authorization missing in PayPal response");
  return { authorizationId: auth.id as string, status: auth.status as string };
}

/** Release (part of) the held funds to the seller. final=true closes the authorization. */
export async function captureAuthorization(authId: string, amountCents: number, final: boolean) {
  const res = await call(`/v2/payments/authorizations/${authId}/capture`, {
    amount: { currency_code: "USD", value: toValue(amountCents) },
    final_capture: final,
  });
  return { captureId: res.id as string, status: res.status as string };
}

/** Return the hold to the buyer. */
export async function voidAuthorization(authId: string) {
  await call(`/v2/payments/authorizations/${authId}/void`);
}

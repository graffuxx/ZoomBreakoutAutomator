import {
  createSessionToken,
  decryptZoomAppContext,
  verifySessionToken,
  verifyStripeSignature
} from "./billing-core.js";

const ALLOWED_TLS_VERSIONS = new Set(["TLSv1.2", "TLSv1.3"]);
const SESSION_COOKIE = "zba_session";
const ACTIVE_SUBSCRIPTION_STATES = new Set(["active", "trialing"]);

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://appssdk.zoom.us https://*.zoom.us; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self' https://zoom.us https://*.zoom.us",
};

function responseWithSecurityHeaders(response) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload, status = 200) {
  return responseWithSecurityHeaders(new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  }));
}

function getCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const [cookieName, ...value] = part.trim().split("=");
    if (cookieName === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function billingEnabled(env) {
  return env.BILLING_ENABLED === "true";
}

async function getSession(request, env) {
  return verifySessionToken(getCookie(request, SESSION_COOKIE), env.SESSION_SECRET);
}

async function stripeRequest(env, path, options = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: options.body
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || "Stripe request failed.");
  return payload;
}

async function findSubscription(env, subject) {
  const params = new URLSearchParams({
    query: `metadata['zoom_user_key']:'${subject}'`,
    limit: "10"
  });
  const result = await stripeRequest(env, `subscriptions/search?${params}`);
  return result.data?.find((subscription) => ACTIVE_SUBSCRIPTION_STATES.has(subscription.status)) || null;
}

function freeStatus(provider, checkoutAvailable = false) {
  return {
    plan: "free",
    active: false,
    checkoutAvailable,
    portalAvailable: false,
    provider
  };
}

async function handleBillingStatus(request, env) {
  const session = await getSession(request, env);
  if (!session) return jsonResponse(freeStatus("zoom-session-required"));
  if (!billingEnabled(env)) return jsonResponse(freeStatus("pending-zoom-approval"));
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRO_PRICE_ID) {
    return jsonResponse(freeStatus("stripe-unconfigured"));
  }

  try {
    const subscription = await findSubscription(env, session.sub);
    return jsonResponse(subscription ? {
      plan: "pro",
      active: true,
      checkoutAvailable: true,
      portalAvailable: true,
      provider: "stripe"
    } : freeStatus("stripe", true));
  } catch {
    return jsonResponse(freeStatus("stripe-temporarily-unavailable"), 503);
  }
}

async function handleCheckout(request, env) {
  if (!billingEnabled(env)) {
    return jsonResponse({ error: "Checkout is disabled until Zoom approves the external billing flow." }, 503);
  }
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: "Open the app inside Zoom before starting checkout." }, 401);
  if (!env.STRIPE_PRO_PRICE_ID) return jsonResponse({ error: "The Pro price is not configured." }, 503);

  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": env.STRIPE_PRO_PRICE_ID,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
    client_reference_id: session.sub,
    "metadata[zoom_user_key]": session.sub,
    "subscription_data[metadata][zoom_user_key]": session.sub,
    billing_address_collection: "required",
    "tax_id_collection[enabled]": "true",
    allow_promotion_codes: "true",
    locale: "auto"
  });

  try {
    const checkout = await stripeRequest(env, "checkout/sessions", { method: "POST", body });
    return jsonResponse({ url: checkout.url });
  } catch (error) {
    return jsonResponse({ error: error.message }, 502);
  }
}

async function handlePortal(request, env) {
  if (!billingEnabled(env)) return jsonResponse({ error: "Billing is not enabled." }, 503);
  const session = await getSession(request, env);
  if (!session) return jsonResponse({ error: "Zoom session required." }, 401);
  const subscription = await findSubscription(env, session.sub);
  if (!subscription?.customer) return jsonResponse({ error: "No active subscription found." }, 404);

  const origin = new URL(request.url).origin;
  const body = new URLSearchParams({ customer: subscription.customer, return_url: `${origin}/` });
  const portal = await stripeRequest(env, "billing_portal/sessions", { method: "POST", body });
  return jsonResponse({ url: portal.url });
}

async function handleWebhook(request, env) {
  const rawBody = await request.text();
  const valid = await verifyStripeSignature(
    rawBody,
    request.headers.get("Stripe-Signature"),
    env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) return jsonResponse({ error: "Invalid webhook signature." }, 400);
  return jsonResponse({ received: true });
}

async function sessionCookieForRequest(request, env) {
  const encryptedContext = request.headers.get("X-Zoom-App-Context");
  if (!encryptedContext || !env.ZOOM_CLIENT_SECRET || !env.SESSION_SECRET) return null;
  try {
    const context = await decryptZoomAppContext(encryptedContext, env.ZOOM_CLIENT_SECRET);
    const token = await createSessionToken(context.uid, env.SESSION_SECRET);
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; HttpOnly; Secure; SameSite=Lax`;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return responseWithSecurityHeaders(Response.redirect(url.href, 308));
    }

    const tlsVersion = request.cf?.tlsVersion;

    if (tlsVersion && !ALLOWED_TLS_VERSIONS.has(tlsVersion)) {
      return new Response("TLS 1.2 or higher is required.", {
        status: 403,
        headers: SECURITY_HEADERS,
      });
    }

    if (url.pathname === "/api/billing/status" && request.method === "GET") {
      return handleBillingStatus(request, env);
    }

    if (url.pathname === "/api/billing/checkout" && request.method === "POST") {
      return handleCheckout(request, env);
    }

    if (url.pathname === "/api/billing/portal" && request.method === "POST") {
      try {
        return await handlePortal(request, env);
      } catch (error) {
        return jsonResponse({ error: error.message }, 502);
      }
    }

    if (url.pathname === "/api/billing/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    const secured = responseWithSecurityHeaders(response);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      const cookie = await sessionCookieForRequest(request, env);
      if (cookie) {
        const headers = new Headers(secured.headers);
        headers.set("Set-Cookie", cookie);
        headers.set("Cache-Control", "no-store");
        headers.set("Vary", "X-Zoom-App-Context");
        return new Response(secured.body, { status: secured.status, headers });
      }
    }
    return secured;
  },
};

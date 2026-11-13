import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createSessionToken,
  verifySessionToken,
  verifyStripeSignature
} from "../src/billing-core.js";

const now = Date.UTC(2026, 10, 13, 20, 0, 0);
const token = await createSessionToken("zoom-user-123", "session-secret", 3600, now);
const session = await verifySessionToken(token, "session-secret", now + 1000);
assert.ok(session?.sub);
assert.equal(await verifySessionToken(token, "wrong-secret", now + 1000), null);
assert.equal(await verifySessionToken(token, "session-secret", now + 3601_000), null);

const body = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
const timestamp = Math.floor(now / 1000);
const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${body}`).digest("hex");
assert.equal(await verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, "whsec_test", now), true);
assert.equal(await verifyStripeSignature(body, `t=${timestamp},v1=invalid`, "whsec_test", now), false);

console.log("Billing security tests passed.");

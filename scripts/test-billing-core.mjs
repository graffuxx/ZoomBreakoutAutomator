import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createSessionToken,
  decryptZoomAppContext,
  verifySessionToken,
  verifyStripeSignature
} from "../src/billing-core.js";

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function littleEndian(value, length) {
  const bytes = Buffer.alloc(length);
  bytes.writeUIntLE(value, 0, length);
  return bytes;
}

async function encryptZoomContext(context, clientSecret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode("zoom-app-context");
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientSecret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
    key,
    new TextEncoder().encode(JSON.stringify(context))
  ));
  const cipherLength = encrypted.length - 16;
  return base64Url(Buffer.concat([
    Buffer.from([iv.length]),
    Buffer.from(iv),
    littleEndian(aad.length, 2),
    Buffer.from(aad),
    littleEndian(cipherLength, 4),
    Buffer.from(encrypted)
  ]));
}

const now = Date.UTC(2026, 10, 13, 20, 0, 0);
const token = await createSessionToken("zoom-user-123", "session-secret", 3600, now);
const session = await verifySessionToken(token, "session-secret", now + 1000);
assert.ok(session?.sub);
assert.equal(await verifySessionToken(token, "wrong-secret", now + 1000), null);
assert.equal(await verifySessionToken(token, "session-secret", now + 3601_000), null);

const zoomContext = {
  uid: "verified-zoom-user-123",
  exp: Math.floor((now + 60_000) / 1000)
};
const encryptedContext = await encryptZoomContext(zoomContext, "zoom-client-secret");
assert.deepEqual(
  await decryptZoomAppContext(encryptedContext, "zoom-client-secret", now),
  zoomContext
);
await assert.rejects(
  decryptZoomAppContext(encryptedContext, "wrong-client-secret", now)
);
await assert.rejects(
  decryptZoomAppContext(encryptedContext, "zoom-client-secret", now + 61_000)
);

const body = JSON.stringify({ id: "evt_test", type: "checkout.session.completed" });
const timestamp = Math.floor(now / 1000);
const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${body}`).digest("hex");
assert.equal(await verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, "whsec_test", now), true);
assert.equal(await verifyStripeSignature(body, `t=${timestamp},v1=invalid`, "whsec_test", now), false);

console.log("Billing security tests passed.");

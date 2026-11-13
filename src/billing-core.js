const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function readLittleEndian(bytes, offset, length) {
  let result = 0;
  for (let index = 0; index < length; index += 1) {
    result += bytes[offset + index] * (2 ** (8 * index));
  }
  return result;
}

export async function decryptZoomAppContext(value, clientSecret, now = Date.now()) {
  if (!value || !clientSecret) throw new Error("Zoom app context is not configured.");

  const bytes = base64UrlToBytes(value);
  let offset = 0;
  const ivLength = bytes[offset];
  offset += 1;
  const iv = bytes.slice(offset, offset + ivLength);
  offset += ivLength;
  const aadLength = readLittleEndian(bytes, offset, 2);
  offset += 2;
  const aad = bytes.slice(offset, offset + aadLength);
  offset += aadLength;
  const cipherLength = readLittleEndian(bytes, offset, 4);
  offset += 4;
  const encrypted = bytes.slice(offset, offset + cipherLength + 16);

  if (!iv.length || encrypted.length !== cipherLength + 16) {
    throw new Error("Zoom app context is malformed.");
  }

  const keyBytes = await crypto.subtle.digest("SHA-256", encoder.encode(clientSecret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plainText = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: aad, tagLength: 128 },
    key,
    encrypted
  );
  const context = JSON.parse(decoder.decode(plainText));
  const expiration = Number(context.exp);
  const expirationMs = expiration > 1e12 ? expiration : expiration * 1000;

  if (!context.uid || !Number.isFinite(expirationMs) || expirationMs <= now) {
    throw new Error("Zoom app context is expired or incomplete.");
  }

  return context;
}

export async function createSessionToken(uid, secret, ttlSeconds = 3600, now = Date.now()) {
  const subject = bytesToBase64Url(await hmac(secret, `zoom-user:${uid}`));
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({
    sub: subject,
    exp: Math.floor(now / 1000) + ttlSeconds
  })));
  const signature = bytesToBase64Url(await hmac(secret, `session:${payload}`));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = bytesToBase64Url(await hmac(secret, `session:${payload}`));
  if (!safeEqual(signature, expected)) return null;

  try {
    const session = JSON.parse(decoder.decode(base64UrlToBytes(payload)));
    if (!session.sub || Number(session.exp) <= Math.floor(now / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function verifyStripeSignature(rawBody, signatureHeader, secret, now = Date.now()) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",").map((part) => part.trim().split("="));
  const timestamp = parts.find(([name]) => name === "t")?.[1];
  const signatures = parts.filter(([name]) => name === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;

  const expectedBytes = await hmac(secret, `${timestamp}.${rawBody}`);
  const expected = Array.from(expectedBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some((signature) => safeEqual(signature, expected));
}

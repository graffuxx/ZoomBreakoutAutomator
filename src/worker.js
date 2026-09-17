const ALLOWED_TLS_VERSIONS = new Set(["TLSv1.2", "TLSv1.3"]);

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

    const response = await env.ASSETS.fetch(request);
    return responseWithSecurityHeaders(response);
  },
};

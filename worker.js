const ALLOWED_TLS_VERSIONS = new Set(["TLSv1.2", "TLSv1.3"]);

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' https://appssdk.zoom.us; style-src 'self'; img-src 'self' data:; connect-src 'self' https://appssdk.zoom.us https://*.zoom.us",
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

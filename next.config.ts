import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const securityHeaders = [
  // SAMEORIGIN: blocks third-party sites from framing you; allows this origin to iframe
  // static PDFs and /vendor/pdf-viewer (DENY breaks PaperViewer for /YEAR*/…/*.pdf).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // CSP: restrict resource origins; unsafe-inline needed for Tailwind/shadcn inline styles
  // and KaTeX; frame-src allows same-origin PDF viewer iframes.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // React's development stack traces use eval. Production keeps it blocked.
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://cdn.seline.so https://cdn.seline.com https://*.posthog.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://api.seline.com https://api.seline.so https://ai.hackclub.com https://*.posthog.com",
      "worker-src 'self' blob:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Question records remain local. Binary scans live in Convex and are
  // served through the public CDN-cached archive route.
  outputFileTracingExcludes: {
    "/midsem/**": [
      "./public/**/*.pdf",
      "./public/**/*.zip",
      "./public/repeat-v2/assets/**/*",
    ],
    "/repeat": [
      "./public/**/*.pdf",
      "./public/**/*.zip",
      "./public/repeat-v2/assets/**/*",
    ],
    "/api/repeat/**": ["./public/**/*.pdf", "./public/repeat-v2/assets/**/*"],
    "/api/repeat/v2/**": ["./public/**/*.{png,jpg,jpeg,webp,gif,svg,ico}"],
  },
  outputFileTracingIncludes: {
    "/api/archive/**": ["./lib/convex-asset-map.json"],
    "/midsem/**": ["./public/midsem/papers/*.json"],
    "/repeat": ["./public/midsem/papers/*.json"],
    "/api/repeat/v2/**": [
      "./public/repeat-v2/index.json",
      "./public/repeat-v2/papers/*.json",
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/repeat-v2/assets/:path*",
          destination: "/api/archive/repeat-v2/assets/:path*",
        },
        {
          source: "/midsem/figures/:path*",
          destination: "/api/archive/midsem/figures/:path*",
        },
        {
          source: "/midsem/:path*.pdf",
          destination: "/api/archive/midsem/:path*.pdf",
        },
        {
          source: "/midsem/:path*.zip",
          destination: "/api/archive/midsem/:path*.zip",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

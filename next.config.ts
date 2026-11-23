import type { NextConfig } from "next";

import withBundleAnalyzer from "@next/bundle-analyzer";

const isDev = process.env.NODE_ENV === "development";
const isAnalyzing = process.env.ANALYZE === "true";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://lh*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: isAnalyzing
    ? false
    : {
        compilationMode: "infer",
        environment: {
          enablePreserveExistingMemoizationGuarantees: true,
        },
        // A component the compiler cannot handle is skipped, not a build failure.
        panicThreshold: "none",
      },
  experimental: {
    // Turbopack is the default builder in Next 16, so the Rust port of the
    // compiler runs without installing babel-plugin-react-compiler. The bundle
    // analyzer needs webpack, where that flag is rejected and the compiler is off.
    turbopackRustReactCompiler: !isAnalyzing,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: isAnalyzing,
  openAnalyzer: false,
});

export default withAnalyzer(nextConfig);

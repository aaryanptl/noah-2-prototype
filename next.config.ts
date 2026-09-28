import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // These files are read at runtime via fs.readFileSync (not imported), so Next's
  // file tracer won't bundle them into the serverless functions automatically.
  // On Vercel that causes ENOENT. Explicitly include them for the generator routes.
  outputFileTracingIncludes: {
    "/api/admin/generator/generate": [
      "./data/skills/htmlcode.md",
      "./Question Bank Plan - 13 ap.xlsx",
    ],
    "/api/admin/generator/ideas": ["./Question Bank Plan - 13 ap.xlsx"],
    "/api/admin/generator/list": ["./Question Bank Plan - 13 ap.xlsx"],
    "/api/fitb/questions": ["./data/fitb/fitb-demo.csv"],
    "/api/fitb/check": ["./data/fitb/fitb-demo.csv"],
  },
};

export default nextConfig;

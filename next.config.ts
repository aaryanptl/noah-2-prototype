import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin the workspace root to this project. Without this, Turbopack infers the
  // root from the nearest lockfile and picks up D:\BuildFastWithAI\package-lock.json
  // one level up, which breaks module resolution (e.g. tailwindcss).
  turbopack: {
    root: path.resolve(__dirname),
  },
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
  },
};

export default nextConfig;

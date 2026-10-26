"use client";

import { use, useEffect, useState } from "react";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

function compileDoc(html: string, css: string, js: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; background-color: #ffffff; color: #1a1a2e; }
          ${css || ""}
        </style>
      </head>
      <body>
        ${html || ""}
        <script>
          try {
            ${js || ""}
          } catch (e) {
            document.body.insertAdjacentHTML('beforeend', '<pre style="color:#f46853;font:12px monospace;background:#fef2f2;padding:10px;border-radius:8px;border:1px solid #fee2e2;margin-top:15px;">' + e + '</pre>');
          }
        </script>
      </body>
    </html>
  `;
}

export default function SandboxPreviewPage({ params }: PreviewPageProps) {
  const { id } = use(params);
  const [doc, setDoc] = useState("");
  const [status, setStatus] = useState("Connecting...");

  useEffect(() => {
    const key = `weblab_buffers_ch${id}`;

    // Load initial code
    const loadInitial = () => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setDoc(
            compileDoc(parsed.html || "", parsed.css || "", parsed.js || ""),
          );
          setStatus("Synced");
        } catch {
          setStatus("Error loading code");
        }
      } else {
        setStatus(
          "No active code found in editor. Try writing some code first!",
        );
      }
    };

    loadInitial();

    // Listen for storage events (updates in the main workspace tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const parsed = JSON.parse(e.newValue || "{}");
          setDoc(
            compileDoc(parsed.html || "", parsed.css || "", parsed.js || ""),
          );
          setStatus("Synced");
        } catch {
          setStatus("Sync error");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [id]);

  return (
    <div className="flex h-screen flex-col bg-[#f8f7f4] font-sans text-[#1a1a2e]">
      {/* Mini chrome header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-black/5 bg-white px-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-base">🦊</span>
          <span className="text-xs font-bold tracking-tight text-[#1a1a2e]">
            Noah 2.0{" "}
            <span className="text-[#3a5ccc] font-medium">Sandbox Preview</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${status === "Synced" ? "bg-[#2ecc87] shadow-[0_0_8px_#2ecc87]" : "bg-yellow-400"}`}
          />
          <span className="text-[0.7rem] font-bold text-[#5a5a72]">
            {status}
          </span>
        </div>
      </header>

      {/* Sandboxed full-size iframe */}
      <div className="flex-1 bg-white">
        {doc ? (
          <iframe
            srcDoc={doc}
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full border-none bg-white"
            title="Sandbox Live Preview"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <span className="mb-3 text-4xl">💻</span>
            <div className="text-sm font-bold text-[#5a5a72]">
              Waiting for editor buffers...
            </div>
            <div className="text-xs text-[#9898b0] mt-1">
              Start writing code in your Web Lab workspace to see it synced
              here.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

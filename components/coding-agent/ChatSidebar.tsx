"use client";

import { Bot, Loader2, Send, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  context?: {
    codeSnapshot?: string;
    selectedCode?: string;
  };
};

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  html: string;
  css: string;
  js: string;
  selectedCode: string;
  challengeInfo: { title: string; description: string; hintContext: string };
}

export function ChatSidebar({
  isOpen,
  onClose,
  messages,
  setMessages,
  html,
  css,
  js,
  selectedCode,
  challengeInfo,
}: ChatSidebarProps) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom without scrolling the whole page
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
      context: {
        codeSnapshot: html + "\n" + css + "\n" + js,
        selectedCode: selectedCode,
      },
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/coding-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].slice(-6), // Send last 6 messages
          html,
          css,
          js,
          selectedCode,
          challengeInfo,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I had trouble thinking of an answer. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 ease-in-out md:sticky md:top-20 md:h-[calc(100vh-100px)] ${
        isOpen
          ? "w-full max-w-full border border-black/5 opacity-100 shadow-sm md:ml-5 md:max-w-[360px] pointer-events-auto"
          : "w-0 max-w-0 border-none opacity-0 md:ml-0 pointer-events-none"
      }`}
    >
      <div className="flex h-full w-full flex-col md:w-[360px]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#3a5ccc] text-white">
              <Bot size={14} />
            </div>
            <span className="text-[0.9rem] font-bold text-[#1a1a2e]">
              Ask Noah
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#5a5a72] transition-colors hover:bg-black/5 hover:text-[#1a1a2e]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-[#5a5a72]">
              <span className="mb-2 text-3xl">🦊</span>
              <p className="text-[0.85rem] font-medium">
                I'm here to help! Select some code or ask me a question about
                the challenge.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${
                      msg.role === "user" ? "bg-[#2ecc87]" : "bg-[#7c5cfc]"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User size={13} />
                    ) : (
                      <span className="text-xs">🦊</span>
                    )}
                  </div>
                  <div
                    className={`flex flex-col gap-1 rounded-2xl px-4 py-2.5 text-[0.85rem] ${
                      msg.role === "user"
                        ? "bg-[#2ecc87]/10 text-[#1a1a2e]"
                        : "bg-[#f8f7f4] text-[#1a1a2e]"
                    }`}
                  >
                    {msg.role === "user" && msg.context?.selectedCode && (
                      <div className="mb-1 max-w-[200px] truncate rounded bg-white/50 px-1.5 py-0.5 text-[0.7rem] font-mono text-[#5a5a72]">
                        {msg.context.selectedCode}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#7c5cfc] text-xs text-white">
                    🦊
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-[#f8f7f4] px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c5cfc]/50" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c5cfc]/50 [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c5cfc]/50 [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-black/5 p-3">
          {selectedCode && (
            <div className="mb-2 flex items-center gap-1.5 px-1">
              <span className="text-[0.75rem] font-medium text-[#7c5cfc]">
                Selection included:
              </span>
              <span className="max-w-[150px] truncate rounded bg-[#7c5cfc]/10 px-1.5 py-0.5 font-mono text-[0.7rem] text-[#7c5cfc]">
                {selectedCode}
              </span>
            </div>
          )}
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Noah a question..."
              className="w-full resize-none rounded-xl border border-black/10 bg-[#f8f7f4] py-2.5 pl-4 pr-12 text-[0.85rem] placeholder-[#9898b0] outline-none transition-colors focus:border-[#7c5cfc] focus:bg-white"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#3a5ccc] text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isTyping ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Send size={13} className="mr-[2px]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

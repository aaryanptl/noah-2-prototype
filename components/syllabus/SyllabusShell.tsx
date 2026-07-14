"use client";

import {
  BarChart3,
  Bell,
  CircleHelp,
  ClipboardCheck,
  LibraryBig,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const formatCount = new Intl.NumberFormat("en-IN");

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function NoahMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative size-10 overflow-hidden rounded-xl bg-[#1f5855] shadow-sm">
        <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full bg-[#f8bf4b]" />
        <span className="absolute bottom-2 left-2 size-2.5 rotate-12 rounded-sm bg-[#f47a62]" />
      </div>
      {!compact && (
        <div>
          <div className="text-lg font-extrabold tracking-[-0.03em] text-[#183d3b]">
            Noah 2.0
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Teacher space
          </div>
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const navigation = [
    { label: "Overview", icon: BarChart3 },
    { label: "My classes", icon: Users },
    { label: "Curriculum", icon: LibraryBig, active: true },
    { label: "Assessments", icon: ClipboardCheck },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#e6e6df] bg-[#fffdfa] px-4 py-5 lg:flex">
      <div className="px-2">
        <NoahMark />
      </div>
      <nav
        className="mt-10 flex flex-col gap-1"
        aria-label="Teacher navigation"
      >
        {navigation.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
              active ? "bg-[#e8f3f1] text-[#1f5855]" : "text-[#697270]",
            )}
          >
            <Icon />
            {label}
          </div>
        ))}
      </nav>
      <div className="mt-auto rounded-2xl bg-[#f5f0e8] p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#314845]">
          <CircleHelp /> Need help?
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Learn how the curriculum is organised across grades and assessments.
        </p>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-[#ece8e1] px-2 pt-4">
        <div className="grid size-9 place-items-center rounded-full bg-[#dceeea] text-xs font-extrabold text-[#1f5855]">
          AP
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#243735]">
            Ananya Patel
          </div>
          <div className="text-xs text-muted-foreground">
            Mathematics teacher
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SyllabusShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f7f5f0] text-[#243735]">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e8e5de] bg-[#fffdfa]/90 px-5 backdrop-blur-xl md:px-8">
              <div className="lg:hidden">
                <NoahMark compact />
              </div>
              <div className="hidden text-sm font-semibold text-muted-foreground lg:block">
                Teacher workspace <span className="mx-2 text-[#c4c0b8]">/</span>{" "}
                {breadcrumb}
              </div>
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <div className="grid size-9 place-items-center rounded-full border border-[#e6e2da] bg-white text-muted-foreground" />
                    }
                  >
                    <Bell />
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                <div className="grid size-9 place-items-center rounded-full bg-[#1f5855] text-xs font-extrabold text-white lg:hidden">
                  AP
                </div>
              </div>
            </header>
            {children}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

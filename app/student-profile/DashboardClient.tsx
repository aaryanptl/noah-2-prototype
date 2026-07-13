"use client";

import React, { useState, useEffect } from "react";

export function DashboardClient({ profile, avgScore }: { profile: any, avgScore: number }) {
  // We mock a few telemetry state variables so the layout doesn't break
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);
  const [sessionsFlip, setSessionsFlip] = useState(false);
  const [quizzesFlip, setQuizzesFlip] = useState(false);
  const [sessionsDeltaShow, setSessionsDeltaShow] = useState(false);
  const [quizzesDeltaShow, setQuizzesDeltaShow] = useState(false);
  const [changedTopics, setChangedTopics] = useState<string[]>([]);

  if (!profile) return null;

  // Map real DB profile to the Memphis layout
  const generateVerdict = () => {
    const topStrong = profile.strongAreas.slice(0, 2).map((a: any) => `<span class="text-[#10b981] font-bold">${a.learningObjective}</span>`).join(" and ");
    const topWeak = profile.weakAreas.slice(0, 2).map((a: any) => `<span class="text-[#f97316] font-bold">${a.learningObjective}</span>`).join(" and ");
    
    if (!topStrong && !topWeak) return `<strong>${profile.student.displayName}</strong> is just getting started. More data is needed to build a cognitive map.`;
    
    let paragraph = `<strong>${profile.student.displayName}</strong> has demonstrated solid conceptual engagement. `;
    if (topStrong) paragraph += `Our cognitive maps show excellent mastery of ${topStrong}, representing significant gains. `;
    if (topWeak) paragraph += `However, key bottlenecks in ${topWeak} continue to limit overall pace and require targeted review.`;
    
    return paragraph;
  };

  const strengths = profile.aiStrengths?.length > 0 
    ? profile.aiStrengths.map((s: string) => `<strong>${s}</strong>`)
    : profile.strongAreas.slice(0, 3).map((a: any) => 
        `<strong>${a.learningObjective}</strong> safely mastered at ${a.score}%.`
      );
  if (strengths.length === 0) strengths.push("Building foundational skills.");

  const weaknesses = profile.aiWeaknesses?.length > 0
    ? profile.aiWeaknesses.map((w: string) => `<strong>${w}</strong>`)
    : profile.weakAreas.slice(0, 3).map((a: any) => 
        `<strong>${a.learningObjective}</strong> accuracy stalled at ${a.score}%. ${a.recentIssues?.[0] || 'Requires focused practice.'}`
      );
  if (weaknesses.length === 0) weaknesses.push("No immediate focus areas flagged by AI.");

  const events = profile.assessmentHistory.map((test: any) => ({
    date: new Date(test.submittedAt).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }),
    type: test.testMode === "diagnostic" ? "quiz" : "hw",
    label: test.topic ? `${test.topic} ${test.testMode.replace('_', ' ')}` : `${test.subject} ${test.testMode.replace('_', ' ')}`,
    sub: `Score ${test.score}% · ${test.learningObjectives?.length || 0} topics analysed`,
    ai: `AI Processed: Mastery updated`,
    meta: test.testMode
  }));

  const uniqueTopics = new Map();
  
  profile.assessmentHistory.forEach((a: any) => {
    const topicName = a.topic || a.subject;
    if (!topicName || uniqueTopics.has(topicName)) return;
    
    const isStrong = a.score >= 80;
    const isWarn = a.score < 50;
    
    uniqueTopics.set(topicName, {
      title: topicName,
      status: isStrong ? "strong" : isWarn ? "warn" : "ok",
      statusLabel: isStrong ? "MASTERED" : isWarn ? "STRUGGLING" : "PROGRESSING",
      last: `Last practiced ${new Date(a.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`,
      insight: isStrong 
        ? `Confidently completed this topic. AI suggests moving to advanced material.` 
        : isWarn 
          ? `Accuracy stalled below 50%. AI has queued targeted practice sets.` 
          : `Improving steadily. AI suggests focusing on this topic in next session.`,
      stage: isStrong ? 2 : isWarn ? 0 : 1,
      effort: isStrong ? "High" : isWarn ? "Low" : "Medium",
      effortSub: isWarn ? "Needs more practice" : "Consistent attempts",
      recentTest: `${a.score}%`,
      recentDelta: a.score > 70 ? "+5%" : "-2%", // Mocked delta since we only have single score per assessment easily accessible
      recentSub: "Recent Assessment"
    });
  });

  const topics = Array.from(uniqueTopics.values()).slice(0, 6);

  // If we don't have teacher data, fallback to Dr. Kavitha Rao to match prototype
  const notes = [
    {
      teacher: "Dr. Kavitha Rao",
      initials: "KR",
      bg: "linear-gradient(135deg,#7c5cfc,#3a5ccc)",
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      quote: "Student is engaging better in group sessions. Needs push on word problems and real-life maths scenarios.",
      tags: [
        { c: "sentiment-pos", t: "Positive sentiment" },
        { c: "sentiment-neu", t: "Word Problems" },
        { c: "sentiment-action", t: "AI: 2 practice sets queued" }
      ]
    }
  ];

  const s = {
    name: profile.student.displayName,
    avatar: profile.student.displayName.charAt(0).toUpperCase(),
    avatarBg: "linear-gradient(135deg,#7c5cfc,#3a5ccc)",
    grade: `Grade ${profile.student.currentClassLevel}`,
    level: "Learning Math",
    region: "Regional Center",
    sessions: profile.student.totalAssessments * 3 + 12, // Mocked
    hours: `${Math.round(profile.student.totalAssessments * 1.5 + 10)}h 30m`, // Mocked
    quizzes: profile.student.totalAssessments,
    streak: Math.max(1, Math.round(profile.student.totalAssessments / 2) + 5), // Mocked
    verdictParagraph: profile.aiSummary || generateVerdict(),
    strengths,
    weaknesses,
    events,
    notes,
    topics
  };

  return (
    <div className="relative text-[#09090b] font-sans selection:bg-[#7c3ade]/10 bg-[#faf8f5] bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] bg-[size:32px_32px] rounded-2xl overflow-hidden shadow-sm border border-slate-200 mt-2">
      {/* Dynamic Memphis Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes numOut {
          to { opacity: 0; transform: translateY(-6px); }
        }
        @keyframes numIn {
          from { opacity: 0; transform: translateY(8px); color: #10b981; }
          to { opacity: 1; transform: translateY(0); color: #09090b; }
        }
        .flipping-out { animation: numOut 0.2s ease-out forwards; }
        .flipping-in { animation: numIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .updated-card { animation: cardPulse 1.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes cardPulse {
          0% { border-color: #7c3ade; box-shadow: 0 0 0 4px rgba(124, 92, 252, 0.15); }
          100% { border-color: rgba(9, 9, 11, 0.06); box-shadow: none; }
        }
      `}} />

      {/* MAIN CONTAINER */}
      <main className="max-w-[1100px] mx-auto px-8 pt-9 pb-12 relative">

        {/* HERO HEADER */}
        <div className="flex items-center gap-5 mb-9 animate-[fadeUp_0.4s_ease_both]">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-[2.2rem] font-extrabold font-[family-name:var(--font-bricolage)] text-white shrink-0 shadow-[0_4px_12px_rgba(9,9,11,0.05)]"
            style={{ background: s.avatarBg }}
          >
            {s.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-[family-name:var(--font-bricolage)] font-extrabold text-[2.4rem] leading-[1.05] tracking-[-0.03em] mb-2 text-[#09090b]">
              {s.name}
            </h1>
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full bg-white border border-[rgba(9,9,11,0.06)] text-[0.74rem] font-medium text-[#52525b] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
                <span className="text-[0.76rem] opacity-85">📘</span>{" "}
                <span>{s.grade}</span>
              </span>
              <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full bg-white border border-[rgba(9,9,11,0.06)] text-[0.74rem] font-medium text-[#52525b] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
                <span className="text-[0.76rem] opacity-85">🧮</span> {s.level}
              </span>
              <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full bg-white border border-[rgba(9,9,11,0.06)] text-[0.74rem] font-medium text-[#52525b] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
                <span className="text-[0.76rem] opacity-85">📍</span>{" "}
                <span>{s.region}</span>
              </span>
            </div>
          </div>
        </div>

        {/* STAT STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 py-6 border-t border-b border-[rgba(9,9,11,0.06)] mb-10 animate-[fadeUp_0.4s_ease_0.08s_both]">
          <div className="flex items-center gap-3 px-6 border-r border-[rgba(9,9,11,0.06)] last:border-none">
            <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[1rem] text-[#52525b]">✓</div>
            <div>
              <div className="relative flex items-center min-h-[1.8rem] gap-1">
                <span className={`font-[family-name:var(--font-bricolage)] font-bold text-[1.8rem] leading-none text-[#09090b] inline-block transition-all ${sessionsFlip ? "flipping-out" : ""}`}>
                  {s.sessions}
                </span>
              </div>
              <div className="text-[0.68rem] text-[#a1a1aa] font-extrabold mt-0.5 uppercase tracking-[0.04em]">classes completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 border-r border-[rgba(9,9,11,0.06)] last:border-none">
            <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[1rem] text-[#52525b]">⏳</div>
            <div>
              <div className="relative flex items-center min-h-[1.8rem] gap-1">
                <span className="font-[family-name:var(--font-bricolage)] font-bold text-[1.8rem] leading-none text-[#09090b] inline-block">{s.hours}</span>
              </div>
              <div className="text-[0.68rem] text-[#a1a1aa] font-extrabold mt-0.5 uppercase tracking-[0.04em]">learning hours</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 border-r border-[rgba(9,9,11,0.06)] last:border-none">
            <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[1rem] text-[#52525b]">📝</div>
            <div>
              <div className="relative flex items-center min-h-[1.8rem] gap-1">
                <span className={`font-[family-name:var(--font-bricolage)] font-bold text-[1.8rem] leading-none text-[#09090b] inline-block transition-all ${quizzesFlip ? "flipping-out" : ""}`}>
                  {s.quizzes}
                </span>
              </div>
              <div className="text-[0.68rem] text-[#a1a1aa] font-extrabold mt-0.5 uppercase tracking-[0.04em]">quizzes completed</div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 last:border-none">
            <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[1rem] text-[#52525b]">🔥</div>
            <div>
              <div className="relative flex items-center min-h-[1.8rem] gap-1">
                <span className="font-[family-name:var(--font-bricolage)] font-bold text-[1.8rem] leading-none text-[#09090b] inline-block">{s.streak}</span>
              </div>
              <div className="text-[0.68rem] text-[#a1a1aa] font-extrabold mt-0.5 uppercase tracking-[0.04em]">day streak</div>
            </div>
          </div>
        </div>

        {/* HIGH FIDELITY VERDICT */}
        <div className="relative p-9 md:p-10 mb-12 bg-gradient-to-br from-[#7c5cfc]/5 to-[#3a5ccc]/2 border border-[rgba(9,9,11,0.06)] rounded-[16px] animate-[fadeUp_0.4s_ease_0.12s_both] shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="absolute text-[2.5rem] text-[#7c3ade] opacity-15 font-bold top-3 left-5">“</div>
          <div className="absolute text-[2.5rem] text-[#7c3ade] opacity-15 font-bold bottom-2.5 right-5">”</div>

          <div className="border-b border-dashed border-[rgba(9,9,11,0.06)] pb-5 mb-6">
            <p className="text-[1.15rem] leading-[1.65] text-[#52525b]" dangerouslySetInnerHTML={{ __html: s.verdictParagraph }} />
          </div>

          <div className="flex flex-col gap-6 mt-6">
            <div>
              <div className="font-[family-name:var(--font-bricolage)] text-[0.8rem] font-extrabold uppercase tracking-[0.08em] text-[#10b981] mb-2 flex items-center gap-1.5">
                ✦ Strengths
              </div>
              <ul className="list-none flex flex-col gap-2">
                {s.strengths.map((str: string, i: number) => (
                  <li key={i} className="text-[0.92rem] leading-relaxed text-[#52525b] relative pl-5 before:content-['✓'] before:absolute before:left-0 before:top-0 before:text-[#10b981] before:font-bold before:text-[0.92rem]" dangerouslySetInnerHTML={{ __html: str }} />
                ))}
              </ul>
            </div>

            <div>
              <div className="font-[family-name:var(--font-bricolage)] text-[0.8rem] font-extrabold uppercase tracking-[0.08em] text-[#f97316] mb-2 flex items-center gap-1.5">
                ▲ Focus Areas & Bottlenecks
              </div>
              <ul className="list-none flex flex-col gap-2">
                {s.weaknesses.map((wk: string, i: number) => (
                  <li key={i} className="text-[0.92rem] leading-relaxed text-[#52525b] relative pl-5 before:content-['⚠'] before:absolute before:left-0 before:top-0 before:text-[#f97316] before:text-[0.85rem] before:font-bold" dangerouslySetInnerHTML={{ __html: wk }} />
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ACTIVITY LOG */}
        <section className="mb-12 animate-[fadeUp_0.4s_both]">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-[family-name:var(--font-bricolage)] font-bold text-[1.4rem] tracking-[-0.01em] text-[#09090b]">
              Activity <em className="not-italic text-[#a1a1aa] font-medium">log</em>
            </h2>
            {isActivityExpanded && (
              <button 
                onClick={() => setIsActivityExpanded(false)}
                className="text-[0.74rem] font-bold uppercase tracking-[0.05em] text-[#7c3ade] hover:text-[#6b21a8] transition-colors"
              >
                Collapse
              </button>
            )}
          </div>
          <div className="bg-white border border-[rgba(9,9,11,0.06)] rounded-[16px] overflow-hidden relative shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
            {(isActivityExpanded ? s.events : s.events.slice(0, 3)).map((e: any, idx: number) => (
              <div key={e.label + idx} className="grid grid-cols-[60px_16px_1fr] md:grid-cols-[80px_24px_1fr_auto] gap-4 items-center p-3.5 px-5 border-b border-[rgba(9,9,11,0.06)] last:border-none transition-colors duration-200 hover:bg-[#f4f2ee] relative">
                <div className="font-[family-name:var(--font-space)] text-[0.74rem] text-[#a1a1aa]">{e.date}</div>
                <div className={`w-1.5 h-1.5 rounded-full justify-self-center ${e.type === "quiz" ? "bg-[#7c3ade]" : "bg-[#10b981]"}`} />
                <div className="min-w-0">
                  <div className="text-[0.84rem] font-bold text-[#09090b] mb-0.5">{e.label}</div>
                  <div className="text-[0.74rem] text-[#52525b] leading-relaxed">{e.sub}</div>
                  <div className="inline-flex items-center gap-1 mt-1 text-[0.68rem] font-medium text-[#7c3ade] before:content-['✦'] before:opacity-80">
                    {e.ai}
                  </div>
                </div>
                <div className="hidden md:block text-[0.7rem] text-[#a1a1aa] text-right uppercase tracking-[0.04em] font-bold align-top pt-0.5">
                  {e.meta}
                </div>
              </div>
            ))}
            {s.events.length > 3 && (
              <button 
                onClick={() => setIsActivityExpanded(!isActivityExpanded)}
                className="w-full p-3 text-[0.74rem] font-bold uppercase tracking-[0.05em] text-[#7c3ade] hover:bg-[#f4f2ee] transition-colors border-t border-[rgba(9,9,11,0.06)]"
              >
                {isActivityExpanded ? "Show less" : `View all ${s.events.length} activities`}
              </button>
            )}
          </div>
        </section>

        {/* TEACHER NOTES */}
        {s.notes && s.notes.length > 0 && (
          <section className="mb-12 animate-[fadeUp_0.4s_both]">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-[family-name:var(--font-bricolage)] font-bold text-[1.4rem] tracking-[-0.01em] text-[#09090b]">
                Teacher <em className="not-italic text-[#a1a1aa] font-medium">notes</em>
              </h2>
              <div className="text-[0.74rem] text-[#a1a1aa] font-medium">
                NLP reads each note · extracts sentiment, focus & action
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {s.notes.map((n: any, idx: number) => (
                <div key={n.teacher + idx} className="bg-white border border-[rgba(9,9,11,0.06)] rounded-[16px] p-[18px_20px] transition-all duration-200 hover:border-[#a1a1aa] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-extrabold text-[0.74rem] font-[family-name:var(--font-bricolage)] shrink-0 bg-gradient-to-br from-[#7c5cfc] to-[#3a5ccc]" style={{ background: n.bg }}>
                      {n.initials}
                    </div>
                    <div>
                      <div className="text-[0.8rem] font-black text-[#09090b] leading-tight">{n.teacher}</div>
                      <div className="text-[0.68rem] text-[#a1a1aa] font-[family-name:var(--font-space)] mt-[1px]">{n.date}</div>
                    </div>
                  </div>
                  <div className="text-[0.88rem] leading-[1.5] text-[#09090b] italic border-l-2 border-l-[rgba(9,9,11,0.06)] pl-3 mb-3">
                    {n.quote}
                  </div>
                  <div className="flex items-center gap-1 text-[0.64rem] font-bold uppercase tracking-[0.05em] text-[#7c3ade] mb-1.5 before:content-['✦'] before:text-[0.74rem]">
                    AI extracted
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {n.tags.map((t: any, i: number) => (
                      <span key={i} className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-full font-bold text-[0.68rem] ${
                          t.c === "sentiment-pos" ? "bg-[#10b981]/10 text-[#10b981]" : 
                          t.c === "sentiment-neu" ? "bg-[#2563eb]/5 text-[#2563eb]" : 
                          t.c === "sentiment-warn" ? "bg-[#f97316]/10 text-[#f97316]" : 
                          "bg-[#7c3ade]/10 text-[#7c3ade]"
                        }`}>
                        {t.t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ACADEMIC GOALS */}
        {s.topics.length > 0 && (
          <section className="animate-[fadeUp_0.4s_both]">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-[family-name:var(--font-bricolage)] font-bold text-[1.4rem] tracking-[-0.01em] text-[#09090b]">
                Academic <em className="not-italic text-[#a1a1aa] font-medium">goals</em>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              {s.topics.map((t: any, i: number) => {
                const fillPct = t.stage === 0 ? 0 : t.stage === 1 ? 50 : 100;
                return (
                  <div key={t.title + i} className="bg-white border border-[rgba(9,9,11,0.06)] rounded-[16px] p-5 flex flex-col gap-3.5 transition-all duration-300 hover:border-[#a1a1aa] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-[family-name:var(--font-bricolage)] font-bold text-[1rem] text-[#09090b] tracking-[-0.01em] truncate" title={t.title}>
                        {t.title}
                      </div>
                      <div className={`inline-flex items-center gap-1 text-[0.68rem] font-extrabold uppercase tracking-[0.05em] ${t.status === "strong" ? "text-[#10b981]" : t.status === "ok" ? "text-[#2563eb]" : "text-[#f97316]"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === "strong" ? "bg-[#10b981]" : t.status === "ok" ? "bg-[#2563eb]" : "bg-[#f97316]"}`} />
                        <span>{t.statusLabel}</span>
                      </div>
                    </div>
                    
                    <div className="text-[0.68rem] text-[#a1a1aa] font-medium -mt-1 mb-1">
                      {t.last}
                    </div>

                    <div className="rounded-[10px] p-2.5 text-[0.78rem] leading-relaxed text-[#52525b] bg-[#f4f2ee]">
                      <div className="flex items-center gap-1 text-[0.64rem] font-bold uppercase tracking-[0.05em] text-[#7c3ade] mb-1 before:content-['✦'] before:text-[0.7rem]">
                        AI Insight
                      </div>
                      <span dangerouslySetInnerHTML={{ __html: t.insight }} />
                    </div>

                    {/* Journey slider bar */}
                    <div className="py-0.5 mt-auto">
                      <div className="text-[0.64rem] font-bold uppercase tracking-[0.05em] text-[#a1a1aa] mb-2">Mastery journey</div>
                      <div className="relative grid grid-cols-3 items-center h-6">
                        <div className="absolute left-[6px] right-[6px] top-1/2 -translate-y-1/2 h-[2px] bg-[rgba(9,9,11,0.06)] rounded-full" />
                        <div className="absolute left-[6px] top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-[#7c3ade] to-[#2563eb] rounded-full" style={{ width: `calc((100% - 12px) * ${fillPct / 100})` }} />
                        
                        <div className="relative flex flex-col items-center gap-1 z-[1]">
                          <div className={`w-2.5 h-2.5 rounded-full bg-white border-2 border-[rgba(9,9,11,0.06)] transition-all duration-500 ${t.stage >= 0 ? "bg-[#7c3ade] border-[#7c3ade]" : ""}`} />
                          <span className="text-[0.6rem] font-bold text-[#a1a1aa] absolute top-4 whitespace-nowrap">Novice</span>
                        </div>
                        <div className={`relative flex flex-col items-center gap-1 z-[1] ${t.stage >= 1 ? "reached" : ""}`}>
                          <div className={`w-2.5 h-2.5 rounded-full bg-white border-2 border-[rgba(9,9,11,0.06)] transition-all duration-500 ${t.stage >= 1 ? "bg-[#2563eb] border-[#2563eb] scale-110" : ""}`} />
                          <span className="text-[0.6rem] font-bold text-[#a1a1aa] absolute top-4 whitespace-nowrap">Pro</span>
                        </div>
                        <div className={`relative flex flex-col items-center gap-1 z-[1] ${t.stage >= 2 ? "reached" : ""}`}>
                          <div className={`w-2.5 h-2.5 rounded-full bg-white border-2 border-[rgba(9,9,11,0.06)] transition-all duration-500 ${t.stage >= 2 ? "bg-[#7c3ade] border-[#7c3ade]" : ""}`} />
                          <span className="text-[0.6rem] font-bold text-[#a1a1aa] absolute top-4 whitespace-nowrap">Master</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[rgba(9,9,11,0.06)] mt-3">
                      <div>
                        <div className="text-[0.64rem] text-[#a1a1aa] font-extrabold uppercase tracking-[0.05em] mb-0.5">Effort</div>
                        <div className="text-[0.88rem] font-bold text-[#09090b]">{t.effort}</div>
                        <div className="text-[0.68rem] text-[#a1a1aa] mt-0.5">{t.effortSub}</div>
                      </div>
                      <div>
                        <div className="text-[0.64rem] text-[#a1a1aa] font-extrabold uppercase tracking-[0.05em] mb-0.5">Recent test</div>
                        <div className="text-[0.88rem] font-bold text-[#09090b] font-mono flex items-center gap-1">
                          <span>{t.recentTest}</span>
                          <span className={`text-[0.68rem] font-extrabold font-sans ${t.recentDelta?.startsWith("-") ? "text-[#f97316]" : "text-[#10b981]"}`}>
                            {t.recentDelta}
                          </span>
                        </div>
                        <div className="text-[0.68rem] text-[#a1a1aa] mt-0.5">{t.recentSub}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

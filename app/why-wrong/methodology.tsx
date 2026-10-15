"use client";

import { Dialog } from "@base-ui/react/dialog";
import { BookOpen, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_POLICY,
  PROMOTE_STREAK,
  REASON_BLURB,
  REASON_LABEL,
  REASON_POLICY,
  SEED_COUNT,
  WRONG_REASONS,
} from "@/lib/why-wrong/ladder";

import { REASON_CLASS, SIGNAL_LABEL } from "./shared";

/**
 * What this page is proposing, in plain words. Every number is read from
 * `lib/why-wrong/ladder.ts`, so it cannot drift from the replay.
 */
export function MethodologyButton() {
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="How this works"
        className="fixed right-6 bottom-6 z-40 flex size-13 items-center justify-center rounded-full bg-[var(--heading)] text-white shadow-lg transition hover:scale-105 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--heading)]"
      >
        <BookOpen className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(820px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0">
          <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-7 py-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
                Methodology
              </p>
              <Dialog.Title className="mt-1 text-xl font-semibold tracking-tight text-[var(--heading)]">
                How this works
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-md p-1.5 text-[var(--text-dim)] transition hover:bg-neutral-100 hover:text-[var(--text)]"
            >
              <X className="size-5" />
            </Dialog.Close>
          </header>

          <div className="overflow-y-auto px-7 py-6">
            <Section title="The problem">
              <p>
                Noah already changes difficulty as a student works. It keeps a
                ladder with three rungs — Easy, Medium, Hard. Two right answers
                in a row and the student moves up a rung. One wrong answer and
                they move down.
              </p>
              <p>
                The ladder only ever sees one word about each answer:{" "}
                <em>wrong</em>. So a child who understands the method perfectly
                and slipped on one carry is treated exactly like a child who has
                no idea what the question is asking. Both get pushed down to
                easier questions.
              </p>
              <p>
                For the first child that is the wrong move. Easier questions
                teach them nothing — they already know the method. They just
                lost a mark to arithmetic.
              </p>
            </Section>

            <Section title="What we changed">
              <p>
                Nothing about the ladder. The rungs, the two-in-a-row rule, the
                first {SEED_COUNT} questions sitting at Medium — all identical.
              </p>
              <p>
                The only change is <strong>what each answer is worth</strong>.
                Before it reaches the ladder, Jev reads the actual question, the
                actual wrong answer the student gave, the worked solution, and
                how long they took, and answers one plain question:{" "}
                <em>
                  is this error because the method is missing, or because a
                  method they do have went wrong along the way?
                </em>
              </p>
              <p>
                Only the first one makes the next questions easier. That is the
                whole change — one number, feeding the rung the ladder was
                already going to use.
              </p>
              <p>
                Jev also gives the error a plain-English label, so a teacher can
                see <em>why</em> at a glance. The label explains the decision.
                It does not make it.
              </p>
              <ul className="mt-3 space-y-1.5">
                {WRONG_REASONS.map((reason) => (
                  <li key={reason} className="flex items-start gap-3 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 w-44 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                        REASON_CLASS[reason],
                      )}
                    >
                      {REASON_LABEL[reason]}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 w-24 shrink-0 font-mono text-xs",
                        REASON_POLICY[reason] === "incorrect"
                          ? "text-[#b8432c]"
                          : "text-[var(--heading)]",
                      )}
                    >
                      {SIGNAL_LABEL[REASON_POLICY[reason]]}
                    </span>
                    <span className="text-[var(--text-dim)]">
                      {REASON_BLURB[reason]}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                Only a genuine missing method makes the questions easier.
                Everything else holds the difficulty where it is — and holding
                still breaks the student&rsquo;s run of correct answers, so they
                do not move up either. It is a pause, not a free pass.
              </p>
            </Section>

            <Section title="Right answers get read too">
              <p>
                A student who picks the right option in four seconds on a
                question that needs real working has not shown you anything. Jev
                is asked about those separately, and a right answer that looks
                like a guess stops counting toward the {PROMOTE_STREAK}-in-a-row
                rule that moves a student up.
              </p>
              <p>
                So the change cuts both ways. It stops unfair demotions, and it
                stops unearned promotions.
              </p>
            </Section>

            <Section title="What happens when Jev isn't sure">
              <p>
                Jev does not answer yes or no. It answers with a probability,
                and on this data it is genuinely unsure a lot of the time —
                which is the honest answer, not a defect.
              </p>
              <p>
                So the page keeps one dial: how sure Jev has to be before the
                questions get easier. The default is{" "}
                <span className="font-mono">
                  {DEFAULT_POLICY.gapThreshold.toFixed(2)}
                </span>{" "}
                — more likely than not. Drag it to zero and the two lines on the
                chart merge back into one, because that is exactly today&rsquo;s
                behaviour.
              </p>
              <p>
                If a wrong answer cannot be judged at all, it falls back to
                today&rsquo;s rule. The system can only ever become more careful
                than it is now, never less.
              </p>
              <p className="text-[var(--text-dim)]">
                That default is a starting point, not a validated number. The
                right way to set it is to check it against what actually
                happened to these students in their next session.
              </p>
            </Section>

            <Section title="Who decides what">
              <p>
                Jev only ever names a reason and gives a confidence. It does not
                choose a difficulty, touch a score, or decide anything a parent
                would see.
              </p>
              <p>
                The table above — which reason holds and which one steps down —
                is ordinary code. Change a row and the whole page recomputes
                without asking Jev anything again, because the judgements are
                evidence and the policy is just a setting. If a parent ever asks
                why their child&rsquo;s work got easier, the answer is a rule
                you can point at.
              </p>
            </Section>

            <Section title="What's real and what's simulated">
              <p>
                <strong>Real:</strong> the students, the sessions, the
                questions, the answers they gave and the time they took, all
                read from the production replica. The ladder rules are ported
                from the live engine. The Jev calls are live.
              </p>
              <p>
                <strong>Simulated:</strong> the difficulty path. Both lines are
                replays — we take the real answers and run them through the
                ladder, once the way it works today and once the proposed way.
                The live engine also materialises two questions ahead, so a real
                band change lands about two questions later than shown. That
                offset applies to both lines equally, so it is left out to keep
                the comparison clean.
              </p>
            </Section>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <h3 className="text-sm font-semibold text-[var(--heading)]">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--text)] [&_p]:text-[var(--text)]">
        {children}
      </div>
    </section>
  );
}

# Mastery loop — decisions from production data

Decided 21 Sep 2026 from the read-only production replica (`MAIN_DATABASE_READ_ONLY_URL`).
Dataset: every completed maths session 15 Jun – 21 Sep 2026 — 12,564 sessions, 5,953 students,
175,636 served questions, 9,200 student×LO series with two or more measurements.
Reproduce with `node scripts/mastery-analysis/pull-dataset.mjs` then `analyze-1/2/3.mjs`.

All numbers are first-response accuracy (earliest attempt per question, non-attempts excluded)
unless stated. "Later accuracy" = pooled accuracy of every subsequent first response on the same LO.

## What the data says

| Question | Finding |
|---|---|
| Is one topic test enough to certify? | No. Topic test 80–89 → retest mean 78, only 58% score ≥80 again. 90–100 → 77%. |
| Does a perfect 3-question LO score hold? | 46% of LOs read 100 on their first 3–4 questions; only 69% of those stay ≥80 later. |
| What predicts later performance? | Volume of evidence, not the score. At ≥9 measured questions and score ≥90: 88% later accuracy (baseline 75%). At 3 questions, T=70 and T=100 give the same 83–85%. |
| Recency-weighted score (EMA / learning rate) vs cumulative? | Cumulative accuracy predicts best (MAE 19.8 vs 20.8–21.8 for every EMA/last-only variant). |
| Is homework a weaker signal than a test? | Barely. Homework → next test MAE 23.9 (test → test 25.1); homework reads +2 points high. |
| Is practice a signal? | Final response: no (100%, retries). First response: yes — 69% accuracy, MAE 24.7 vs next test, and hints never fire before the first answer (0 of 1,273). |
| Are difficulty bands real? | No. Accuracy easy 71%, medium 71%, hard 76%. |
| Does a score decay over time? | Not within 45 days: P(≥80 holds) is 66% at 1 day, 66% at 3 weeks, 65% at 22–45 days. (46+ days: n=37, unusable.) |
| Does practice between two tests help? | Not measurably: +2.4 with practice/homework between vs +1.9 without. |
| Guessing? | 13% of wrong answers are submitted in under 4 seconds. |
| Partial credit? | 2–3% of answers outside placement (12% there). |
| Platform's stored `progress_student_lo.score`? | Already ≈ cumulative first-response accuracy (mean diff 0.6). |

## Decisions

### D1. Score = evidence-weighted first-response accuracy (recent window — see D14)
`score = Σ w·correct / Σ w·answered` over the most recent 12 weighted questions, every question equal weight, partial = 0, non-attempt excluded.
No EMA, no learning rate `k(n)`, no floor, no decay, no difficulty modifier.
*Why:* cumulative beat every recency scheme; difficulty bands are uncalibrated; no decay is visible
inside 45 days. Revisit decay when the data spans more than one term.

### D2. Activity weights `w`
| Activity | w | Certifies | Note |
|---|---|---|---|
| Topic survey | 1.0 | No | fires before teaching |
| LO check | 1.0 | Yes | only certifier |
| Homework | 0.8 | No | reads ~2 pts high, predicts as well as a test |
| Practice (first response only) | 0.5 | No | retries and hinted attempts ignored |
| Placement | — | No | seeds topic row only, discarded at survey |
| Class | — | No | dispatch, no measurement |

Practice moving the score (at half weight, first response only) is a change from the flow doc's
`w = 0`. It removes the "practice writes nothing so the router loops" failure without inflating scores.

### D3. Confidence = measured question count; locked at ≥ 9
Weighted count `n = Σ w·answered`. An LO is **locked** at `n ≥ 9`. Nothing certifies, flags or
re-teaches an LO below that. A 3-question survey alone can never lock an LO.

### D4. Certification (sign-off) rule
An LO is signed off when **all** hold:
1. locked (`n ≥ 9`),
2. cumulative score ≥ 80 (revised from 90 — see D13),
3. the LO check passed: ≥ 4 of 5 fresh questions correct.
Expected: ~86% later accuracy vs 75% baseline. Dropped: the 12/16-points rule and the
"one hard question right" clause — difficulty bands don't measure difficulty.

### D5. LO states (derived, never stored)
| State | Condition |
|---|---|
| untested | n = 0 |
| needs_help | score < 60 and n ≥ 3 |
| working | 60 ≤ score < 80, or not locked |
| ready | score ≥ 80 and n ≥ 6 |
| blocked | LO check failed twice |
| signed_off | D4 |

*Why 60:* below it, P(next ≥ 80) ≤ 20%. *Why ready needs n ≥ 6:* a score of 80+ on 3 questions
holds only 69% of the time; 6+ gets to 75% before the check adds its own 5.

### D6. Stall / flag to teacher
R2 fires when an LO has **3 consecutive measurements under 60** (after its last mentor class), or
three failed LO checks. The "no improvement" clause was dropped in D13: with 3–5 question samples the
accuracy bounces too much for it to ever hold. The flow doc's "4 rounds" was arbitrary.

### D7. Topic survey
3 questions per LO, cap 18 (Grade 5 topics carry 4–6 LOs). Not split across sessions. Cannot certify.

### D8. Homework mix
60% gap (needs_help / lowest score), 25% probe (working, not locked), 15% maintain (ready / signed
off). ~12 questions. Kept from the flow doc; the data shows homework is the highest-volume, best-
predicting signal, so it stays the default (R7).

### D9. Guessing flag
A first response under 4 s that is wrong is counted normally in the score but raised as a teacher
alert when it is ≥ 30% of a session's wrong answers. Not excluded from evidence (13% is too much to
drop silently).

### D10. Display levels
Novice = not locked or score < 60 · Pro = locked, not signed off · Master = every LO in the topic
signed off and topic score ≥ 80 (D16). Raw score stays internal.

### D11. Plan Builder trigger
Plan is built after placement and before the first paid class; for existing students, from their
current class. Stated as an assumption in the methodology doc.

### D13. Revisions from the sandbox simulation (21 Sep 2026, later the same day)
Running the loop forward on simulated students of fixed ability (`scripts/mastery-analysis/sim-loop.ts`)
showed three failures the back-test could not, because no loop had ever run:
- **Certify at cumulative ≥ 90 was unreachable.** A genuinely-82% student sat at 82 on 160 questions
  and cycled check → check → class forever. The bar is now 80, equal to the ready bar; the LO check
  (4/5 fresh) is the real gate. Back-test cost: 86% instead of 88% later accuracy.
- **Weak students were never flagged.** "3 in a row under 60 *and non-improving*" almost never
  held with noisy 3–5 question samples. Now: 3 in a row under 60.
- **A 60–79 student got homework forever.** New plateau clause on R4: a locked objective at 60–79
  whose last 4 sessions are all under 80 goes to a mentor class.
Mentor classes now have defined effects: no score; reset stall and block counts; **discount evidence
gathered before the class by 0.5** (so the results that caused the class stop anchoring the score);
the loop measures 3 sessions before it may re-teach, and never checks an objective straight after a
class. Result on simulated students: 95% ability closes a 5-LO topic in ~10 rounds, 85% in ~25 with
about one class, 35% is escalated repeatedly and never certified.

### D14. Score reads a recent window, not the whole history (22 Sep 2026)
Sandbox run: a student weak for 12 rounds, then acing homework, was handed **six more homeworks at
11–12/12** before the loop asked for an LO check — the cumulative score was anchored by the weak
rounds. Back-test (`analyze-4.mjs`): a window over the most recent 12 weighted questions predicts
next-session accuracy as well as cumulative (MAE 18.66 vs 18.63 at 20+ questions; certification
precision 85.5% vs 86.0%), and the real data could not show the window's advantage because no
teaching loop existed. **Score = weighted first-response accuracy over the last 12 weighted
questions.** Evidence (the lock at 9) still counts the whole history. Simulated lag from "student
becomes strong" to "first LO check": ~6 rounds, down from 7–8; two strong sessions are the floor.
D1's "no EMA / learning rate" stands — a hard window, not a decaying average.

### D15. The topic re-test is back in the loop (22 Sep 2026)
The implementation plan (§05 "Learn loop → Topic test, scored per LO, gap analysis vs previous map")
and Rohit's flow ("two homeworks, then a hello check weighted toward weak LOs") both have a periodic
whole-topic test. The loop had dropped it: only the survey (once) and the LO check (per objective).
The sandbox showed the cost — a student acing homework waited six rounds for the loop to notice,
because homework is weight 0.8 and gives strong objectives two questions each.

**R7 — Time to measure.** After 2 homework/practice sessions with no test-condition session, a
topic re-test: 15 questions, timed, no hints, weight 1.0, every open objective gets at least 2,
the rest go to the weakest (untested counts as weakest); objectives already 90+ get no top-up;
signed-off objectives are excluded. It measures; it does not certify — the LO check (R5) still
does. Homework becomes R8. Real-data replay maps a student's second and later topic tests to
this rule. Simulated lag from "student becomes strong" to first LO check: ~5.7 rounds.

**Out of the loop, by design:** grade test and multi-topic test decide *which topic* — that is the
Plan Builder's job (the sequencer). The loop takes the topic as given.

### D16. Topic mastery = every objective signed off AND topic score ≥ 80 (22 Sep 2026)
Decided by Aaryan. The topic score is now the evidence-weighted mean of the objectives' window
scores (previously it pooled the whole history, so a topic could read 74 while all four objectives
sat at 92–100 and signed off). `MASTER_SCORE = 80`. Certification stays per objective (D4); the
topic bar is the display gate for the Master level, and R1 (whole-topic class under 60) reads the
same number.

### D12. Content follow-up (not a loop change)
Difficulty bands need recalibrating from empirical accuracy — the analysis can emit the per-question
table. Multi-skill tagging stays a future field; the loop does not wait for it.

## Where this lives in the code
- `lib/mastery/rules.ts` — the decided loop, pure: scorecard from real measurements, states, router
  R0–R7, homework split, replay. Every constant above is a named export here.
- `lib/mastery/evidence.ts` — reads a student's sessions on a topic from the production replica.
- `app/api/mastery/{candidates,topics,decide}` + `app/mastery` — the live page: pick a real student,
  see the scorecard, the next activity, the rule that chose it, and what the loop would have said
  before every past session.

Still on the old (flow-doc) numbers and to be aligned: `lib/learning-plan/mastery.ts` (the builder's
simulated Personalisation tab), `public/mastery-loop.html`, the methodology dialog/sidebar text, and
the even-spread selection in `app/api/prototype/homework/`.

## Caveats
- Three months of data, no live mastery loop yet — every "later accuracy" is under today's
  even-spread homework, not the prescribed mix.
- Measurements are 3–4 questions per LO, so per-measurement noise is ±25 points; the certification
  precision numbers are honest but coarse.
- Audited questions were not yet live on the platform as of 17 Sep; some accuracy is depressed by
  bad questions, which the content audit is fixing separately.

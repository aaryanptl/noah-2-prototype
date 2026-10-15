# Gap vs slip — does Jev's read of the wrong answers predict anything?

Run 15 Oct 2026. Reproduce with
`npx tsx scripts/mastery-analysis/backtest-gap-share.ts --n=812 --seed=1`
(needs `output/analysis/dataset.json` from `pull-dataset.mjs`, the read-only
replica, and `TYPESAFE_API_KEY`; judgements are cached in `output/jev-cache/wrong`).
Raw output: `output/analysis/gap-backtest.json` (gitignored).

## Question

The mastery loop only sees right/wrong counts. When an objective sits at 40–79 the
loop has to choose between more practice and a mentor class. The idea being tested:
if the wrong answers are mostly **missing the method** (a real gap), the student
needs a class; if they are mostly **slips** (has the method, executed badly), more
practice will do. If that were true, the gap share should predict what happens next
better than the score alone.

## Method

- **Unit:** one student × objective, snapshotted after the first session where the
  window score (as `rules.ts` computes it) is 40–79 on 6+ weighted questions, with
  3+ wrong first responses so far and 6+ answered questions afterwards.
  **812 snapshots**, all of them used (no sampling).
- **Jev read:** the last 8 wrong first responses before the snapshot (3,324 answers),
  each asked the why-wrong questions (`lib/why-wrong/classify.ts`): `realGap` (Noul),
  `reason` (Choice), `severity` (Score), `tooFast` (Noul). Per objective:
  gap share = mean `realGap`; guess share = share labelled a guess or too fast (≥ 0.5).
- **Outcomes:** later accuracy (pooled first-response accuracy on everything after the
  snapshot); **stuck** = later accuracy under 60; **later stall/plateau** = the loop's
  own `isStalled` / `isPlateaued` fires at a later session.
- **Control with no AI:** share of the same wrong answers submitted in under 4 seconds.
- **Comparison:** 5-fold cross-validated logistic regression, score alone vs score plus
  each signal; and later accuracy minus what the score predicts (the residual), by group,
  with 95% bootstrap intervals.

Cost: 3,324 Jev calls, 3.84M input / 0.38M output tokens, 137 s at 8 in flight.

## Results

| Read (last 8 errors) | n | Mean score | Later accuracy | Stuck | Later stall/plateau | Residual vs score (95% CI) |
|---|---|---|---|---|---|---|
| Missing the method (gap share ≥ 0.43) | 210 | 62.1 | 74.0 | 24% | 19% | **+4.0** (+1.3 to +6.6) |
| Mixed | 208 | 61.8 | 69.5 | 28% | 25% | −0.4 (−2.9 to +2.3) |
| Has it, slipping (≤ 0.31) | 231 | 60.9 | 69.8 | 27% | 24% | +0.5 (−2.3 to +3.1) |
| Guessing (≥ 40% guesses) | 163 | 57.0 | 61.8 | **42%** | **33%** | **−5.3** (−8.7 to −2.0) |

| Predicting "stuck" (241 of 812) | AUC | Log loss |
|---|---|---|
| Score alone | 0.647 | 0.580 |
| + gap share | 0.642 | 0.582 |
| + severity | 0.645 | 0.582 |
| + under-4-second share (no AI) | 0.659 | 0.572 |
| + Jev guess share | **0.666** | 0.572 |
| + guess share + under-4-second share | 0.666 | 0.571 |

Predicting a later stall/plateau (199 of 812): score alone AUC 0.546; no signal moves it
beyond 0.557 (under-4-second share). Nothing here predicts the loop's own stall/plateau well.

Correlations: score ↔ later accuracy r = 0.29. Gap share ↔ residual r = +0.06;
guess share ↔ residual r = −0.18; under-4-second share ↔ residual r = −0.17.
Guess share and the under-4-second share correlate at r = 0.75.

## What this means

1. **Gap vs slip should not choose between a class and practice.** It adds nothing to the
   score (AUC 0.647 → 0.642), and where it does separate, it points the other way:
   objectives read as "missing the method" did *better* afterwards (+4 points over what
   the score predicted). One possible explanation, not tested here: a missing method is what
   the regular classes teach, while slip habits persist. Either way, it is not a basis for routing.
2. **Guessing is the one read that matters.** Objectives where 40%+ of recent errors are
   guesses stayed under 60 afterwards 42% of the time against 26% for the rest, and the
   score did not see it (−5.3 points residual).
3. **Most of the guessing signal needs no AI.** The share of wrong answers under 4 seconds
   gets most of the way (AUC 0.659); Jev's guess read adds +0.007 on top. Answer time is
   free and deterministic; Jev's contribution here is the explanation shown to a person,
   not the prediction.

## Decision

- `rules.ts` unchanged. Gap share is not adopted as a rule input.
- `/mastery` shows the read beside the decision as explanation, with this result stated
  on the page; the cut-offs in `lib/mastery/gap.ts` are the tertiles of gap share over
  these 812 snapshots and are descriptive only.
- Worth testing next, without AI: a guessing flag from answer times as an input to the
  needs-help / stall rules, back-tested with `sim-loop.ts` before adoption.

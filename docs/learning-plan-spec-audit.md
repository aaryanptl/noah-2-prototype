# Learning Plan Builder — Spec Audit & Gap Analysis Report

## Executive Summary
This document provides a thorough audit of the **Learning Plan Builder Prototype** against the official product specification. It highlights implemented features, identifies subtle logic gaps, and outlines concrete recommendations for complete alignment.

---

## 1. Compliance Matrix

| Specification Module | Requirement | Prototype Implementation Status | Status |
| :--- | :--- | :--- | :--- |
| **Core Components** | Topic, Learning Objective, Classes, Activities, Questions Framework | Implemented in `types.ts`, `data.ts`, `page.tsx`, and `engine.ts`. | ✅ Fully Aligned |
| **Prefixed Data** | Topic/LO ideal classes, ideal activities, starter/master question guidelines | Loaded via `curriculum_plan_defaults` DB table and `data.ts` fallback. | ✅ Fully Aligned |
| **New Student (Placement Test)** | `Placement test + Package classes + Priority` $\rightarrow$ 1st plan | Implemented as Scenario A (Aarav Shah). High/Low score scaling active. | ✅ Fully Aligned |
| **New Student (No Placement)** | `Package classes + Priority` $\rightarrow$ Default plan | Implemented as Scenario B (Mia Zhang). | ✅ Fully Aligned |
| **Returning Student (Plan Refit)** | Baseline plan + completed work + evidence $\rightarrow$ Refit plan | Implemented as Scenario C (Leo Vance). Returns saved classes to pool. | ✅ Fully Aligned |
| **Parent Requested Start** | Requested starting topic + compressed prerequisite refreshers | Implemented as Scenario D (Sofia Martinez). Interactive dropdown + OpenAI call. | ✅ Fully Aligned |
| **Max Fit Rule (Surplus)** | Reserve excess capacity ($>2\times$ plan) as "Revision / School Help" | Implemented in `engine.ts` (Rule B3). | ✅ Fully Aligned |
| **Workload Cap (Rule G1)** | Grade 5 weekly activity cap (max 7/week $\approx$ 3.5/class) | Implemented in `engine.ts` (Rule G1). | ✅ Fully Aligned |
| **Structural Classes** | Checkpoints, RDPs, PTMs count | Removed as per user directive ($0$ structural classes). | ⚠️ Modified per directive |

---

## 2. Identified Gaps & Differences

### 1. Last Modification State Machine (CRITICAL)
- **Spec Rule**:
  - 3 types of modifications: **Manual**, **Class**, **Auto**.
  - If **Manual** update was the last to happen, **Auto updates are blocked** from modifying the plan (only **Class** updates can modify).
  - If **Auto** or **Class** update was last, any update type can modify.
- **Current Prototype Status**: We track manual adjustments per topic, but we do NOT maintain an explicit `lastModificationType: "manual" | "class" | "auto"` state machine tag.

### 2. Auto-Update Scaling Cap (+2 Max Increase Rule)
- **Spec Rule**:
  - Auto-updates for struggling students ($<2$ classes remaining and low mastery) can increase classes by **at most +2 classes** to avoid major schedule disruption.
  - Decreasing classes can happen as soon as 75%+ mastery is achieved (e.g. 6 classes $\rightarrow$ 1 class if early mastery).
- **Current Prototype Status**: The scaling logic in `engine.ts` scales topic classes based on score ratios, but does not strictly cap auto-increases at $\le +2$ classes.

### 3. Student Progress Report (SPR) — "Next 2 Weeks Plan" Section
- **Spec Rule**:
  - SPR should feature two distinct sections: **Plan for Next 2 Weeks** (descriptive topic + LOs) and **Future Plan** (classes $>5$).
  - **Test Warning Rule**: If $<2$ classes remain for a planned topic, the Next 2 Weeks plan MUST state: *"A test will be conducted for this topic in the next 2 weeks."*
- **Current Prototype Status**: We render the overall Class-by-Class plan and Topic allocations, but do not separate the explicit **Next 2 Weeks Plan** tab/card on SPR with the $<2$ class test notice.

### 4. Glimpse Form 2-Step Workflow
- **Spec Rule**:
  - Glimpse form has 2 steps: Step 1 (Class details & homework completed), Step 2 (Auto-generated future plan with mentor edits & submission).
- **Current Prototype Status**: Implemented as the single-step "Record Class Outcome" modal. It can be upgraded into a formal 2-step modal flow.

---

## 3. Recommended Action Plan

1. **Add `lastModificationType` State Machine**:
   - Store `lastModificationType: "manual" | "class" | "auto"` in `GeneratedPlan`.
   - Prevent `runAutoUpdate()` from mutating topics if `lastModificationType === "manual"`.

2. **Add "Next 2 Weeks Plan" Tab on Final Plan**:
   - Split the final plan view to include a dedicated **Next 2 Weeks Plan** tab.
   - Display topic + LOs + test notice whenever remaining classes for a topic is $<2$.

3. **Cap Auto-Increase at Max +2 Classes**:
   - Enforce `Math.min(baseClasses + 2, newClasses)` during auto-increases in `engine.ts`.

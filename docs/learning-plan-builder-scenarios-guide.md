# Learning Plan Builder — 4 Scenarios & Logic Guide

> **Overview**: The Learning Plan Builder automatically transforms student diagnostic evidence, package constraints, and curriculum priorities into a custom, class-by-class math schedule without hiding the underlying rules.

---

## 🌟 The 4 Demo Student Scenarios Explained

### 1️⃣ Demo A: Maya Thompson — *"The Test Taker"*
* **Student Profile**: New student who completed a Placement Diagnostic Test.
* **Package**: Full-Year (79 classes).
* **The Problem**: How to prevent a new student from wasting time on topics she has already mastered, while giving her extra reinforcement on topics where she is weak.
* **What the Engine Does**:
  * **High Placement Score ($\ge 75\%$)**: Cuts topic duration by ~30% (never below the topic minimum threshold). For example, a 5-class topic reduces to 4 classes.
  * **Low Placement Score ($< 40\%$)**: Keeps the full ideal class allocation, but shifts 15% of the activity mix away from easy activities and toward **extra practice & support** (e.g., 60:40 easy:practice becomes 45:55).
  * **Mid-Range Score ($40\% - 74\%$)**: Applies standard ideal class allocations without adjustment.
* **Key Presenter Takeaway**:
  > *"Diagnostic test scores shape the first plan — saving time on mastered skills and boosting practice on weak areas."*

---

### 2️⃣ Demo B: Ethan Carter — *"The Capacity Puzzle"*
* **Student Profile**: New student with **no test score** and a **short package**.
* **Package**: Half-Year (40 classes).
* **The Problem**: The full Grade 5 curriculum requires ~50+ classes, but the parent only purchased 40 classes.
* **What the Engine Does**:
  1. **Compresses Classes**: Squeezes topics down from ideal classes toward their minimum required threshold (starting with lowest-priority & latest-sequence topics).
  2. **Auto-Drops Non-Essentials**: If capacity is still exceeded after compression, it automatically drops **Low-priority** topics first, followed by **Medium-priority** topics (starting from the latest sequence first).
  3. **Protects High-Priority**: **High-priority core topics are NEVER auto-dropped by the system.**
* **Key Presenter Takeaway**:
  > *"Smart budget fitting — when class count is limited, the engine compresses topics and trims non-essentials while protecting high-priority core math."*

---

### 3️⃣ Demo C: Aarav Shah — *"The Mid-Course Tune-Up"*
* **Student Profile**: Returning student midway through his learning plan.
* **Package**: 24 classes remaining (Plan Update).
* **The Problem**: He finished previous topics faster than planned. How do we recycle saved class hours and target his current learning gaps?
* **What the Engine Does**:
  1. **Recycles Saved Time**: If he finished 5 planned classes in 4 classes, 1 saved class is returned to his pool for future topics.
  2. **Mentor View Diagnosis**: Evaluates question-level evidence for his current active topic, tagging each Learning Objective (LO) as *Master ✓*, *Stuck after Starter*, or *Not Attempted*.
  3. **Safety Warning**: If capacity remains over budget even after compression, a prominent red warning requires a manual teacher decision (preventing silent dropping of core topics).
* **Key Presenter Takeaway**:
  > *"Live progress updates — recycles saved class hours and generates exact question-level diagnosis for the mentor."*

---

### 4️⃣ Demo D: Sofia Martinez — *"The Jump-Ahead Request"*
* **Student Profile**: Parent requested to start with a specific topic (*Fraction Arithmetic*).
* **Package**: Full-Year (79 classes).
* **The Problem**: A parent wants to start directly on Fractions, but Fractions requires foundational skills in Number Sense, Multiplication, and Primes.
* **What the Engine Does**:
  1. **Prerequisite Lookup**: Traces all required prerequisite topics transitively (Number Sense, Multi-Digit Operations, Factors & Primes).
  2. **Inserts Refreshers**: Automatically schedules short **Prerequisite Refreshers** (at $\lceil \text{ideal} / 2 \rceil$ duration) *before* the requested topic. Refreshers are exempt from capacity compression.
  3. **Teaches Target Topic**: Teaches *Fraction Arithmetic* in full depth, followed by the remaining curriculum topics in normal order.
* **Key Presenter Takeaway**:
  > *"Safe fast-tracking — honors parent requests while inserting short refresher foundation classes so the student succeeds."*

---

## 📊 Quick Scenario Summary Matrix

| Demo Student | Scenario | Main Engine Rule Applied | Resulting Plan |
| :--- | :--- | :--- | :--- |
| **A. Maya Thompson** | Placement Test Evidence | $\ge 75\%$ cuts time ~30%; $< 40\%$ shifts mix to practice | Custom duration & activity mix per score |
| **B. Ethan Carter** | No Test + Half-Year Package | Compress to minimums $\rightarrow$ Drop Low then Medium | Fits 40 classes cleanly without dropping High priority |
| **C. Aarav Shah** | Returning Student Progress | Saved classes return to pool + Mentor LO diagnosis | Recycles saved hours & outputs "what to fix" notes |
| **D. Sofia Martinez** | Parent Requested Starting Topic | Transitive prerequisite search $\rightarrow$ Insert 50% Refreshers | Refreshers $\rightarrow$ Target Topic $\rightarrow$ Rest of Curriculum |

---

## 🛠️ Engine Order of Operations (Core Logic Spec)

1. **Candidate Selection**: `candidates = grade_topics - completed - manual_removals` in curriculum order (default classes = ideal).
2. **Returning Student Handling**: `current_topic.cls = max(min, ideal - used)`. Saved classes (`ideal - used`) return to the pool.
3. **Placement Adjustments**: Score $\ge 75 \rightarrow \text{cls} = \max(\text{min}, \lceil \text{ideal} \times 0.7 \rceil)$; Score $< 40 \rightarrow$ shift easy:practice ratio 15 points toward practice.
4. **Parent Request Reordering**: Insert prerequisite refreshers ($\lceil \text{ideal} / 2 \rceil$ classes, minimum 1) $\rightarrow$ requested topic $\rightarrow$ remaining topics in curriculum order. Refreshers are exempt from capacity compression.
5. **Structural Calculations**: `structural = checkpoints(min 2, max 5, ≈ topics/2.5) × 2 + PTM(3 for full year / 1 for half year)`.
6. **Capacity Compression**: While total planned > available, compress topic classes down to `min` (lowest priority & latest sequence first; skip refreshers).
7. **Capacity Dropping**: If still over capacity, drop Low-priority topics first, then Medium-priority topics (latest sequence first). Recompute structural classes as topic count falls.
8. **Safety Overflow Guard**: If still over capacity after dropping Low/Medium topics, preserve High-priority topics and display a red warning banner. **High priority topics are never auto-dropped.**

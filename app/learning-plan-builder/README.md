# Learning Plan Builder Summary

The Learning Plan Builder creates and continuously updates a class-by-class Grade 5 Maths plan for an individual student.

### Inputs

- Student profile, package and remaining classes
- Classes per week (default 2) — sizes the two-week plan window
- Placement-test results
- Topic and learning-objective mastery
- Completed and current topics
- Parent-requested starting topic
- Curriculum priorities, prerequisites, ideal **and minimum** classes, activities

### Teacher workflow

1. Select a student scenario.
2. Review available student evidence.
3. Choose the topic scope:
   - **Plan manually**
   - **Plan from evidence** (rules over placement, mastery, capacity)
4. Review capacity, structural classes and topic allocations.
5. Build the class-by-class learning plan (AI writes mentor teaching guides).

### Planning rules

- High-priority topics are always included and cannot be unselected.
- Strong performance can reduce a High topic’s classes and activities, but never remove it.
- Medium topics are added after High topics when capacity remains.
- Low topics are added last.
- Evidence rules can recommend skipping only Medium or Low topics.
- Prerequisites are placed before dependent topics.
- Checkpoints, revision classes, practice classes and PTMs count toward capacity.
- Over-capacity plans remain editable but show a persistent warning.

**Fitting a plan into the package (Rules B2, F3, H1)**

When the selected scope does not fit the remaining classes, the builder works in this order:

1. **Compress toward Minimum Classes** — lowest priority first, latest sequence first. Every topic carries a minimum (the fewest classes in which it can still be taught soundly); no automatic rule may go below it. Prerequisite refreshers are never compressed.
2. **Scale structural classes down** — PTMs first, then checkpoint + RDP pairs, keeping at least two checkpoints and one PTM.
3. **Drop topics** — Low first, then Medium (latest sequence first). A topic another selected topic depends on is never dropped.
4. **Warn** — if High-priority topics still do not fit, the plan shows a warning for manual decision instead of dropping anything silently.

A teacher override is the only way a topic can go below its minimum, and the plan flags it when that happens.

**Spare capacity (Rule B3)**

With 10 or more classes spare, only the required classes are planned and the surplus is reserved as “Revision / School Help”.

### Generated output

- Ordered class-by-class teaching sequence
- Learning objectives for every class
- Easy and Practice activity allocation
- Explanation for every recommendation
- Structural classes such as checkpoints, RDP and PTM
- Topics not scheduled and the reason why
- Starter-to-Master question examples

### Updating the plan

After a class, the teacher records whether the student:

- Completed it faster
- Stayed on track
- Needed more time

The builder previews the updated allocation and creates a new plan version only after teacher approval. A “faster” outcome never takes a topic below its minimum classes.

### AI in the prototype

AI recommendations are currently simulated locally from the dummy placement and mastery data. No external AI model is connected yet. The workflow, design and exact production output are still prototype decisions rather than finalized specifications.

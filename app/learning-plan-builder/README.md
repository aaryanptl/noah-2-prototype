# Learning Plan Builder Summary

The Learning Plan Builder creates and continuously updates a class-by-class Grade 5 Maths plan for an individual student.

### Inputs

- Student profile and remaining classes
- Placement-test results
- Topic and learning-objective mastery
- Completed and current topics
- Parent-requested starting topic
- Curriculum priorities, prerequisites, ideal classes and activities

### Teacher workflow

1. Select a student scenario.
2. Review available student evidence.
3. Choose the topic scope:
   - **Plan manually**
   - **Plan with AI**
4. Review capacity, structural classes and topic allocations.
5. Build the class-by-class learning plan.

### Planning rules

- High-priority topics are always included and cannot be unselected.
- Strong performance can reduce a High topic’s classes and activities, but never remove it.
- Medium topics are added after High topics when capacity remains.
- Low topics are added last.
- AI can suggest skipping only Medium or Low topics.
- Prerequisites are placed before dependent topics.
- Checkpoints, revision classes, practice classes and PTMs count toward capacity.
- Over-capacity plans remain editable but show a persistent warning.

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

The builder previews the updated allocation and creates a new plan version only after teacher approval.

### AI in the prototype

AI recommendations are currently simulated locally from the dummy placement and mastery data. No external AI model is connected yet. The workflow, design and exact production output are still prototype decisions rather than finalized specifications.

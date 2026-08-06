export type ChallengeExample = {
  input: string;
  output: string;
  explain?: string;
};

export type WebLabFileContent = {
  html: string;
  css: string;
  js: string;
};

// Self-describing grading rule carried by a generated goal. When present, the
// runtime evaluates it generically instead of looking the goal id up in the
// hardcoded checks dictionary — this is what lets AI-generated challenges grade
// themselves without a code change per new goal.
export type WebLabGoalCheck = {
  target: "html" | "css" | "js";
  kind: "regex" | "css_declaration" | "js_includes";
  rule: string; // regex source tested against the target buffer
  flags?: string; // default "i"
  minCount?: number; // default 1 — e.g. ≥2 <p> tags
};

export type WebLabGoal = {
  id: string;
  label: string;
  check?: WebLabGoalCheck;
};

export type WebLabDemoStep = {
  file: "html" | "css" | "js";
  code: string;
  prog: {
    pct: number;
    icon: string;
    l: string;
    s: string;
  };
  run?: boolean;
};

export type WebLabReview = {
  type: "good" | "tip";
  text: string;
};

export type WebLabHint = {
  tier: "nudge" | "approach";
  label: string;
  text: string;
};

export type CodingChallenge = {
  id: number;
  topic: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  lesson: string;
  desc: string;
  goals: WebLabGoal[];
  targetHtml: string;
  targetSub: string;
  startFile?: "html" | "css" | "js";
  files: {
    guide: WebLabFileContent;
    pair: WebLabFileContent;
    solo: WebLabFileContent;
  };
  review: WebLabReview[];
  hints: WebLabHint[];
  // Demo step choreography is hand-authored for the seed challenges. Generated
  // (CSV-sourced) challenges omit it — guide mode then just loads the full
  // commented `files.guide` buffer.
  demo?: {
    guide: WebLabDemoStep[];
    pair: WebLabDemoStep[];
    solo: WebLabDemoStep[];
  };
};

export const codingChallenges: CodingChallenge[] = [
  /* ───────────── 1. HTML structure ───────────── */
  {
    id: 1,
    topic: "HTML",
    title: "Your First Web Page",
    difficulty: "easy",
    lesson: "L1 · Lesson 1–2 · HTML Foundations",
    desc: "Build a minimal page with a <code>&lt;h1&gt;</code> heading and a <code>&lt;p&gt;</code> paragraph. This is the skeleton every website starts from.",
    goals: [
      { id: "h1", label: "Has an <h1> heading" },
      { id: "p", label: "Has a <p> paragraph" },
    ],
    targetHtml: `<h1>Hello, Web!</h1>\n<p>This is my very first web page. 🎉</p>`,
    targetSub: "A page with one heading and one paragraph.",
    files: {
      guide: {
        html: `<!-- The h1 is the main title of the page.
     Every page should have exactly one. -->
<h1>Hello, Web!</h1>

<!-- The p tag is a paragraph of text.
     Browsers add space above and below it. -->
<p>This is my very first web page. 🎉</p>`,
        css: `/* No styles needed yet —
   HTML has sensible defaults. */`,
        js: `// No JavaScript for this one.`,
      },
      pair: {
        html: `<!-- 👈 YOUR CODE:
     Add an <h1> with the page title,
     then a <p> with a sentence. -->

`,
        css: `/* Leave empty for now */`,
        js: `// Empty`,
      },
      solo: { html: ``, css: ``, js: `` },
    },
    review: [
      {
        type: "good",
        text: "Clean structure — one <code>h1</code>, one <code>p</code>. That's the foundation of every page! 🎉",
      },
      {
        type: "tip",
        text: "Try adding a second paragraph and notice the browser spaces them automatically.",
      },
    ],
    hints: [
      { tier: "nudge", label: "💡", text: "The big title uses <h1>...</h1>." },
      {
        tier: "approach",
        label: "🔍",
        text: "Wrap your sentence in <p>...</p> below the heading.",
      },
    ],
    demo: {
      guide: [
        {
          file: "html",
          code: `<!-- Noah is building your page... -->`,
          prog: {
            pct: 10,
            icon: "🧭",
            l: "Guide Mode",
            s: "Setting up the page",
          },
        },
        {
          file: "html",
          code: `<!-- The h1 is the main title of the page. -->
<h1>Hello, Web!</h1>`,
          prog: {
            pct: 50,
            icon: "📝",
            l: "Heading added",
            s: "The <h1> renders big & bold",
          },
        },
        {
          file: "html",
          code: `<!-- The h1 is the main title of the page. -->
<h1>Hello, Web!</h1>

<!-- The p tag is a paragraph of text. -->
<p>This is my very first web page. 🎉</p>`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Complete!",
            s: "Heading + paragraph render",
          },
          run: true,
        },
      ],
      pair: [
        {
          file: "html",
          code: `<!-- 👈 YOUR CODE:
     Add an <h1> and a <p> -->`,
          prog: {
            pct: 20,
            icon: "🤝",
            l: "Pair Mode",
            s: "Your turn to add tags",
          },
        },
        {
          file: "html",
          code: `<!-- ✅ Student wrote: -->
<h1>Hello, Web!</h1>
<p>This is my very first web page. 🎉</p>`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Solved!",
            s: "You wrote the markup",
          },
          run: true,
        },
      ],
      solo: [
        {
          file: "html",
          code: ``,
          prog: {
            pct: 5,
            icon: "🧗",
            l: "Solo Mode",
            s: "Build it from scratch",
          },
        },
        {
          file: "html",
          code: `<h1>Hello, Web!</h1>
<p>This is my very first web page. 🎉</p>`,
          prog: { pct: 100, icon: "🏆", l: "Solo win!", s: "+35 XP" },
          run: true,
        },
      ],
    },
  },

  /* ───────────── 2. Lists & images ───────────── */
  {
    id: 2,
    topic: "HTML",
    title: "A Shopping List",
    difficulty: "easy",
    lesson: "L1 · Lesson 5 · Images & Lists",
    desc: "Create an unordered list <code>&lt;ul&gt;</code> with three items <code>&lt;li&gt;</code>, under a heading. Lists structure related items.",
    goals: [
      { id: "ul", label: "Has a <ul> list" },
      { id: "li3", label: "Has at least 3 <li> items" },
    ],
    targetHtml: `<h2>Shopping List 🛒</h2>\n<ul>\n  <li>Apples</li>\n  <li>Bread</li>\n  <li>Coffee</li>\n</ul>`,
    targetSub: "A heading above a bulleted list of three items.",
    files: {
      guide: {
        html: `<!-- A subheading for the section -->
<h2>Shopping List 🛒</h2>

<!-- ul = unordered (bulleted) list.
     Each item goes in its own li. -->
<ul>
  <li>Apples</li>
  <li>Bread</li>
  <li>Coffee</li>
</ul>`,
        css: `/* Defaults give bullets automatically */`,
        js: `// Empty`,
      },
      pair: {
        html: `<h2>Shopping List 🛒</h2>

<ul>
  <!-- 👈 YOUR CODE:
       Add three <li> items here -->

</ul>`,
        css: `/* Empty */`,
        js: `// Empty`,
      },
      solo: { html: ``, css: ``, js: `` },
    },
    review: [
      {
        type: "good",
        text: "Each item in its own <code>&lt;li&gt;</code> — exactly right. Bullets come free with <code>&lt;ul&gt;</code>!",
      },
      {
        type: "tip",
        text: "Swap <code>&lt;ul&gt;</code> for <code>&lt;ol&gt;</code> to get a numbered list instead.",
      },
    ],
    hints: [
      {
        tier: "nudge",
        label: "💡",
        text: "A bulleted list is <ul>, each line is an <li>.",
      },
      {
        tier: "approach",
        label: "🔍",
        text: "Put three <li>...</li> lines between the <ul> tags.",
      },
    ],
    demo: {
      guide: [
        {
          file: "html",
          code: `<h2>Shopping List 🛒</h2>`,
          prog: { pct: 25, icon: "🧭", l: "Heading", s: "Section title added" },
        },
        {
          file: "html",
          code: `<h2>Shopping List 🛒</h2>\n\n<ul>\n\n</ul>`,
          prog: {
            pct: 55,
            icon: "📝",
            l: "List container",
            s: "Empty <ul> ready",
          },
        },
        {
          file: "html",
          code: `<h2>Shopping List 🛒</h2>\n\n<ul>\n  <li>Apples</li>\n  <li>Bread</li>\n  <li>Coffee</li>\n</ul>`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Complete!",
            s: "Three items bulleted",
          },
          run: true,
        },
      ],
      pair: [
        {
          file: "html",
          code: `<h2>Shopping List 🛒</h2>\n<ul>\n  <!-- 👈 YOUR CODE: add 3 <li> -->\n</ul>`,
          prog: { pct: 30, icon: "🤝", l: "Pair Mode", s: "Fill in the items" },
        },
        {
          file: "html",
          code: `<h2>Shopping List 🛒</h2>\n<ul>\n  <li>Apples</li>\n  <li>Bread</li>\n  <li>Coffee</li>\n</ul>`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Solved!",
            s: "You added the items",
          },
          run: true,
        },
      ],
      solo: [
        {
          file: "html",
          code: ``,
          prog: { pct: 5, icon: "🧗", l: "Solo Mode", s: "Match the target" },
        },
        {
          file: "html",
          code: `<h2>Shopping List 🛒</h2>\n<ul>\n  <li>Apples</li>\n  <li>Bread</li>\n  <li>Coffee</li>\n</ul>`,
          prog: { pct: 100, icon: "🏆", l: "Solo win!", s: "+35 XP" },
          run: true,
        },
      ],
    },
  },

  /* ───────────── 3. CSS basics — color & font ───────────── */
  {
    id: 3,
    topic: "CSS",
    title: "Style a Headline",
    difficulty: "easy",
    lesson: "L1 · Lesson 8 · Intro to CSS",
    desc: "The HTML is done. Switch to <code>style.css</code> and make the heading <code>blue</code> and centered. Watch the preview change live.",
    goals: [
      { id: "color", label: "Heading color is blue" },
      { id: "center", label: "Heading is centered" },
    ],
    targetHtml: `<h1 style="color:#3a5ccc;text-align:center;font-family:sans-serif">Welcome!</h1>`,
    targetSub: "A blue, centered welcome heading.",
    startFile: "css",
    files: {
      guide: {
        html: `<h1>Welcome!</h1>`,
        css: `/* Target the h1 element by name */
h1 {
  /* Set the text colour */
  color: #3a5ccc;

  /* Center it horizontally */
  text-align: center;
}`,
        js: `// Empty`,
      },
      pair: {
        html: `<h1>Welcome!</h1>`,
        css: `h1 {
  /* 👈 YOUR CODE:
     make the color blue (#3a5ccc)
     and text-align center */

}`,
        js: `// Empty`,
      },
      solo: { html: `<h1>Welcome!</h1>`, css: ``, js: `` },
    },
    review: [
      {
        type: "good",
        text: "You styled by element selector <code>h1 { }</code> — the cleanest way to start.",
      },
      {
        type: "tip",
        text: "Later you'll target with <code>.class</code> and <code>#id</code> selectors for finer control.",
      },
    ],
    hints: [
      {
        tier: "nudge",
        label: "💡",
        text: "Use color: and text-align: inside h1 { }.",
      },
      {
        tier: "approach",
        label: "🔍",
        text: "color: #3a5ccc; and text-align: center;",
      },
    ],
    demo: {
      guide: [
        {
          file: "css",
          code: `h1 {\n\n}`,
          prog: {
            pct: 20,
            icon: "🧭",
            l: "Guide Mode",
            s: "Selector targets h1",
          },
        },
        {
          file: "css",
          code: `h1 {\n  color: #3a5ccc;\n}`,
          prog: {
            pct: 60,
            icon: "🎨",
            l: "Colour set",
            s: "Heading turns blue",
          },
        },
        {
          file: "css",
          code: `h1 {\n  color: #3a5ccc;\n  text-align: center;\n}`,
          prog: { pct: 100, icon: "🎉", l: "Complete!", s: "Blue & centered" },
          run: true,
        },
      ],
      pair: [
        {
          file: "css",
          code: `h1 {\n  /* 👈 YOUR CODE: blue + centered */\n}`,
          prog: {
            pct: 30,
            icon: "🤝",
            l: "Pair Mode",
            s: "Write the two rules",
          },
        },
        {
          file: "css",
          code: `h1 {\n  color: #3a5ccc;\n  text-align: center;\n}`,
          prog: { pct: 100, icon: "🎉", l: "Solved!", s: "You styled it" },
          run: true,
        },
      ],
      solo: [
        {
          file: "css",
          code: ``,
          prog: {
            pct: 5,
            icon: "🧗",
            l: "Solo Mode",
            s: "Write the CSS yourself",
          },
        },
        {
          file: "css",
          code: `h1 {\n  color: #3a5ccc;\n  text-align: center;\n}`,
          prog: { pct: 100, icon: "🏆", l: "Solo win!", s: "+20 XP" },
          run: true,
        },
      ],
    },
  },

  /* ───────────── 4. The box model — a card ───────────── */
  {
    id: 4,
    topic: "CSS",
    title: "Build a Card",
    difficulty: "medium",
    lesson: "L1 · Lesson 9–10 · The Box Model",
    desc: "Style a <code>div.card</code> with padding, a rounded border, and a subtle shadow — the building block of every modern UI.",
    goals: [
      { id: "pad", label: "Card has padding" },
      { id: "radius", label: "Corners are rounded" },
      { id: "shadow", label: "Has a box-shadow" },
    ],
    targetHtml: `<div style="max-width:240px;margin:24px auto;padding:24px;background:#fff;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.12);font-family:sans-serif"><h3 style="margin:0 0 8px">Noah 2.0</h3><p style="margin:0;color:#5a5a72">Your AI coding tutor.</p></div>`,
    targetSub: "A white card with padding, rounded corners and a soft shadow.",
    startFile: "css",
    files: {
      guide: {
        html: `<div class="card">
  <h3>Noah 2.0</h3>
  <p>Your AI coding tutor.</p>
</div>`,
        css: `.card {
  /* The box model: content + padding + border */
  max-width: 240px;
  margin: 24px auto;     /* center the card */
  padding: 24px;         /* space inside */
  background: #fff;
  border-radius: 16px;   /* round the corners */
  /* offset-x  offset-y  blur  colour */
  box-shadow: 0 6px 24px rgba(0,0,0,.12);
  font-family: sans-serif;
}`,
        js: `// Empty`,
      },
      pair: {
        html: `<div class="card">
  <h3>Noah 2.0</h3>
  <p>Your AI coding tutor.</p>
</div>`,
        css: `.card {
  max-width: 240px;
  margin: 24px auto;
  background: #fff;
  font-family: sans-serif;

  /* 👈 YOUR CODE: add padding,
     border-radius, and box-shadow */

}`,
        js: `// Empty`,
      },
      solo: {
        html: `<div class="card">
  <h3>Noah 2.0</h3>
  <p>Your AI coding tutor.</p>
</div>`,
        css: ``,
        js: ``,
      },
    },
    review: [
      {
        type: "good",
        text: "<code>padding</code> + <code>border-radius</code> + <code>box-shadow</code> is the card recipe you'll reuse forever. 🃏",
      },
      {
        type: "tip",
        text: "Increase the shadow blur on <code>:hover</code> later to make the card 'lift'.",
      },
    ],
    hints: [
      {
        tier: "nudge",
        label: "💡",
        text: "Padding makes space inside; border-radius rounds corners.",
      },
      {
        tier: "approach",
        label: "🔍",
        text: "padding:24px; border-radius:16px; box-shadow:0 6px 24px rgba(0,0,0,.12);",
      },
    ],
    demo: {
      guide: [
        {
          file: "css",
          code: `.card {\n  max-width: 240px;\n  margin: 24px auto;\n  background: #fff;\n}`,
          prog: {
            pct: 30,
            icon: "🧭",
            l: "Guide Mode",
            s: "Base box centered",
          },
        },
        {
          file: "css",
          code: `.card {\n  max-width: 240px;\n  margin: 24px auto;\n  background: #fff;\n  padding: 24px;\n  border-radius: 16px;\n}`,
          prog: { pct: 65, icon: "📦", l: "Box model", s: "Padding + rounded" },
        },
        {
          file: "css",
          code: `.card {\n  max-width: 240px;\n  margin: 24px auto;\n  background: #fff;\n  padding: 24px;\n  border-radius: 16px;\n  box-shadow: 0 6px 24px rgba(0,0,0,.12);\n  font-family: sans-serif;\n}`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Complete!",
            s: "Card lifts off the page",
          },
          run: true,
        },
      ],
      pair: [
        {
          file: "css",
          code: `.card {\n  max-width: 240px;\n  margin: 24px auto;\n  background: #fff;\n  /* 👈 YOUR CODE */\n}`,
          prog: {
            pct: 30,
            icon: "🤝",
            l: "Pair Mode",
            s: "Add the 3 properties",
          },
        },
        {
          file: "css",
          code: `.card {\n  max-width: 240px;\n  margin: 24px auto;\n  background: #fff;\n  padding: 24px;\n  border-radius: 16px;\n  box-shadow: 0 6px 24px rgba(0,0,0,.12);\n  font-family: sans-serif;\n}`,
          prog: { pct: 100, icon: "🎉", l: "Solved!", s: "You built the card" },
          run: true,
        },
      ],
      solo: [
        {
          file: "css",
          code: ``,
          prog: { pct: 5, icon: "🧗", l: "Solo Mode", s: "Recreate the card" },
        },
        {
          file: "css",
          code: `.card {\n  max-width: 240px;\n  margin: 24px auto;\n  padding: 24px;\n  background: #fff;\n  border-radius: 16px;\n  box-shadow: 0 6px 24px rgba(0,0,0,.12);\n  font-family: sans-serif;\n}`,
          prog: { pct: 100, icon: "🏆", l: "Solo win!", s: "+50 XP" },
          run: true,
        },
      ],
    },
  },

  /* ───────────── 5. Flexbox layout ───────────── */
  {
    id: 5,
    topic: "Layout",
    title: "A Flexbox Navbar",
    difficulty: "hard",
    lesson: "L1 · Lesson 17 · Flexbox",
    desc: "Use <code>display:flex</code> to lay out a nav bar: brand on the left, links pushed to the right with <code>justify-content:space-between</code>.",
    goals: [
      { id: "flex", label: "nav uses display:flex" },
      { id: "between", label: "Uses justify-content" },
      { id: "align", label: "Items vertically centered" },
    ],
    targetHtml: `<nav style="display:flex;justify-content:space-between;align-items:center;padding:14px 22px;background:#1a1a2e;font-family:sans-serif"><span style="color:#fff;font-weight:800">Noah</span><span style="color:#c0c8e8;display:flex;gap:18px"><a style="color:#c0c8e8;text-decoration:none">Home</a><a style="color:#c0c8e8;text-decoration:none">Docs</a><a style="color:#c0c8e8;text-decoration:none">Login</a></span></nav>`,
    targetSub:
      "A dark navbar: brand left, links right, all vertically centered.",
    startFile: "css",
    files: {
      guide: {
        html: `<nav class="nav">
  <span class="brand">Noah</span>
  <span class="links">
    <a href="#">Home</a>
    <a href="#">Docs</a>
    <a href="#">Login</a>
  </span>
</nav>`,
        css: `.nav {
  /* flex turns children into a row */
  display: flex;
  /* push brand & links to opposite ends */
  justify-content: space-between;
  /* center them on the cross-axis */
  align-items: center;
  padding: 14px 22px;
  background: #1a1a2e;
  font-family: sans-serif;
}
.brand { color: #fff; font-weight: 800; }
.links { display: flex; gap: 18px; }
.links a { color: #c0c8e8; text-decoration: none; }`,
        js: `// Empty`,
      },
      pair: {
        html: `<nav class="nav">
  <span class="brand">Noah</span>
  <span class="links">
    <a href="#">Home</a>
    <a href="#">Docs</a>
    <a href="#">Login</a>
  </span>
</nav>`,
        css: `.nav {
  /* 👈 YOUR CODE: make it a flex row,
     space-between, vertically centered */

  padding: 14px 22px;
  background: #1a1a2e;
  font-family: sans-serif;
}
.brand { color: #fff; font-weight: 800; }
.links { display: flex; gap: 18px; }
.links a { color: #c0c8e8; text-decoration: none; }`,
        js: `// Empty`,
      },
      solo: {
        html: `<nav class="nav">
  <span class="brand">Noah</span>
  <span class="links">
    <a href="#">Home</a>
    <a href="#">Docs</a>
    <a href="#">Login</a>
  </span>
</nav>`,
        css: `.brand { color: #fff; font-weight: 800; }
.links { display: flex; gap: 18px; }
.links a { color: #c0c8e8; text-decoration: none; }`,
        js: `// Empty`,
      },
    },
    review: [
      {
        type: "good",
        text: "<code>display:flex</code> + <code>justify-content:space-between</code> is the #1 layout pattern on the web. 🧭",
      },
      {
        type: "tip",
        text: "Try the mobile viewport toggle — then add <code>flex-direction:column</code> in a media query.",
      },
    ],
    hints: [
      {
        tier: "nudge",
        label: "💡",
        text: "display:flex makes a row; justify-content spaces them out.",
      },
      {
        tier: "approach",
        label: "🔍",
        text: "display:flex; justify-content:space-between; align-items:center;",
      },
    ],
    demo: {
      guide: [
        {
          file: "css",
          code: `.nav {\n  display: flex;\n  padding: 14px 22px;\n  background: #1a1a2e;\n}`,
          prog: { pct: 30, icon: "🧭", l: "Guide Mode", s: "flex makes a row" },
        },
        {
          file: "css",
          code: `.nav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 14px 22px;\n  background: #1a1a2e;\n}`,
          prog: {
            pct: 70,
            icon: "🧭",
            l: "Spaced out",
            s: "Brand left, links right",
          },
        },
        {
          file: "css",
          code: `.nav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 14px 22px;\n  background: #1a1a2e;\n  font-family: sans-serif;\n}\n.brand { color: #fff; font-weight: 800; }\n.links { display: flex; gap: 18px; }\n.links a { color: #c0c8e8; text-decoration: none; }`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Complete!",
            s: "Full navbar laid out",
          },
          run: true,
        },
      ],
      pair: [
        {
          file: "css",
          code: `.nav {\n  /* 👈 YOUR CODE */\n  padding: 14px 22px;\n  background: #1a1a2e;\n}`,
          prog: {
            pct: 30,
            icon: "🤝",
            l: "Pair Mode",
            s: "Add the flex rules",
          },
        },
        {
          file: "css",
          code: `.nav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 14px 22px;\n  background: #1a1a2e;\n  font-family: sans-serif;\n}\n.brand { color: #fff; font-weight: 800; }\n.links { display: flex; gap: 18px; }\n.links a { color: #c0c8e8; text-decoration: none; }`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Solved!",
            s: "You laid out the nav",
          },
          run: true,
        },
      ],
      solo: [
        {
          file: "css",
          code: `.brand { color:#fff; font-weight:800; }\n.links { display:flex; gap:18px; }\n.links a { color:#c0c8e8; text-decoration:none; }`,
          prog: {
            pct: 10,
            icon: "🧗",
            l: "Solo Mode",
            s: "Write the .nav rules",
          },
        },
        {
          file: "css",
          code: `.nav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 14px 22px;\n  background: #1a1a2e;\n  font-family: sans-serif;\n}\n.brand { color:#fff; font-weight:800; }\n.links { display:flex; gap:18px; }\n.links a { color:#c0c8e8; text-decoration:none; }`,
          prog: { pct: 100, icon: "🏆", l: "Solo win!", s: "Plus 65 XP" },
          run: true,
        },
      ],
    },
  },

  /* ───────────── 6. JS interactivity ───────────── */
  {
    id: 6,
    topic: "JS",
    title: "A Click Counter",
    difficulty: "medium",
    lesson: "L1 · Lesson 32 · JS Functions & Events",
    desc: "Wire up <code>script.js</code> so clicking the button increases the count shown on the page. Your first taste of interactivity.",
    goals: [
      { id: "listener", label: "Adds a click listener" },
      { id: "update", label: "Updates the count text" },
    ],
    targetHtml: `<div style="text-align:center;font-family:sans-serif;padding:30px"><h2 id="c" style="font-size:2.4rem;margin:0 0 14px">0</h2><button style="padding:10px 22px;border:none;border-radius:50px;background:#3a5ccc;color:#fff;font-weight:700;cursor:pointer">Click me</button></div>`,
    targetSub: "A number that goes up each time the button is clicked.",
    startFile: "js",
    files: {
      guide: {
        html: `<div class="wrap">
  <h2 id="count">0</h2>
  <button id="btn">Click me</button>
</div>`,
        css: `.wrap { text-align:center; font-family:sans-serif; padding:30px; }
h2 { font-size:2.4rem; margin:0 0 14px; }
button { padding:10px 22px; border:none; border-radius:50px;
  background:#3a5ccc; color:#fff; font-weight:700; cursor:pointer; }`,
        js: `// Grab the elements from the page
let count = 0;
const btn = document.getElementById('btn');
const label = document.getElementById('count');

// Run this function every time the button is clicked
btn.addEventListener('click', function () {
  count = count + 1;          // increase the number
  label.textContent = count;  // show it on the page
});`,
      },
      pair: {
        html: `<div class="wrap">
  <h2 id="count">0</h2>
  <button id="btn">Click me</button>
</div>`,
        css: `.wrap { text-align:center; font-family:sans-serif; padding:30px; }
h2 { font-size:2.4rem; margin:0 0 14px; }
button { padding:10px 22px; border:none; border-radius:50px;
  background:#3a5ccc; color:#fff; font-weight:700; cursor:pointer; }`,
        js: `let count = 0;
const btn = document.getElementById('btn');
const label = document.getElementById('count');

btn.addEventListener('click', function () {
  // 👈 YOUR CODE: add 1 to count,
  // then put it in label.textContent

});`,
      },
      solo: {
        html: `<div class="wrap">
  <h2 id="count">0</h2>
  <button id="btn">Click me</button>
</div>`,
        css: `.wrap { text-align:center; font-family:sans-serif; padding:30px; }
h2 { font-size:2.4rem; margin:0 0 14px; }
button { padding:10px 22px; border:none; border-radius:50px;
  background:#3a5ccc; color:#fff; font-weight:700; cursor:pointer; }`,
        js: ``,
      },
    },
    review: [
      {
        type: "good",
        text: "<code>addEventListener</code> + <code>textContent</code> — that's the core of every interactive page!",
      },
      {
        type: "tip",
        text: "Right now the preview is live — try clicking the button in the panel.",
      },
    ],
    hints: [
      {
        tier: "nudge",
        label: "💡",
        text: "Inside the click function, count++ then set label.textContent.",
      },
      {
        tier: "approach",
        label: "🔍",
        text: "count = count + 1; label.textContent = count;",
      },
    ],
    demo: {
      guide: [
        {
          file: "js",
          code: `let count = 0;\nconst btn = document.getElementById('btn');\nconst label = document.getElementById('count');`,
          prog: {
            pct: 35,
            icon: "🧭",
            l: "Guide Mode",
            s: "Grab the elements",
          },
        },
        {
          file: "js",
          code: `let count = 0;\nconst btn = document.getElementById('btn');\nconst label = document.getElementById('count');\n\nbtn.addEventListener('click', function () {\n\n});`,
          prog: {
            pct: 65,
            icon: "🖱️",
            l: "Listener wired",
            s: "Reacts to clicks",
          },
        },
        {
          file: "js",
          code: `let count = 0;\nconst btn = document.getElementById('btn');\nconst label = document.getElementById('count');\n\nbtn.addEventListener('click', function () {\n  count = count + 1;\n  label.textContent = count;\n});`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Complete!",
            s: "Click the button →",
          },
          run: true,
        },
      ],
      pair: [
        {
          file: "js",
          code: `btn.addEventListener('click', function () {\n  // 👈 YOUR CODE\n});`,
          prog: {
            pct: 30,
            icon: "🤝",
            l: "Pair Mode",
            s: "Write the two lines",
          },
        },
        {
          file: "js",
          code: `let count = 0;\nconst btn = document.getElementById('btn');\nconst label = document.getElementById('count');\n\nbtn.addEventListener('click', function () {\n  count = count + 1;\n  label.textContent = count;\n});`,
          prog: {
            pct: 100,
            icon: "🎉",
            l: "Solved!",
            s: "You made it interactive",
          },
          run: true,
        },
      ],
      solo: [
        {
          file: "js",
          code: ``,
          prog: {
            pct: 5,
            icon: "🧗",
            l: "Solo Mode",
            s: "Wire it up yourself",
          },
        },
        {
          file: "js",
          code: `let count = 0;\nconst btn = document.getElementById('btn');\nconst label = document.getElementById('count');\nbtn.addEventListener('click', () => {\n  count++;\n  label.textContent = count;\n});`,
          prog: { pct: 100, icon: "🏆", l: "Solo win!", s: "Plus 50 XP" },
          run: true,
        },
      ],
    },
  },
];

export function getCodingChallengeById(challengeId: number) {
  return (
    codingChallenges.find((challenge) => challenge.id === challengeId) ?? null
  );
}

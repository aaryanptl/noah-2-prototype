import { NextResponse } from "next/server";
import { getDemoStudent } from "@/lib/demo-students";
import { generateAIPlan, getAvailablePlanTopics } from "@/lib/plan-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Structured generation over a full curriculum can take 20–60s.
export const maxDuration = 300;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSION_DATES = 31;
const MAX_INSTRUCTIONS = 2000;

export async function POST(request: Request) {
  let body: {
    studentId?: string;
    dates?: unknown;
    topics?: unknown;
    instructions?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profile = getDemoStudent(body.studentId ?? "");
  if (!profile) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const dates = Array.isArray(body.dates)
    ? body.dates.filter((date): date is string => typeof date === "string")
    : [];
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one session date." },
      { status: 400 },
    );
  }
  if (dates.length > MAX_SESSION_DATES) {
    return NextResponse.json(
      { error: `At most ${MAX_SESSION_DATES} session dates are supported.` },
      { status: 400 },
    );
  }
  if (dates.some((date) => !DATE_PATTERN.test(date))) {
    return NextResponse.json(
      { error: "Dates must be formatted YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const requestedTopics = Array.isArray(body.topics)
    ? Array.from(
        new Set(
          body.topics.filter(
            (topic): topic is string =>
              typeof topic === "string" && topic.trim().length > 0,
          ),
        ),
      )
    : [];
  if (requestedTopics.length === 0) {
    return NextResponse.json(
      { error: "Choose at least one topic for this plan." },
      { status: 400 },
    );
  }

  const availableTopics = await getAvailablePlanTopics(profile);
  const topics = requestedTopics.filter((topic) =>
    availableTopics.includes(topic),
  );
  if (topics.length !== requestedTopics.length) {
    return NextResponse.json(
      {
        error:
          "One or more selected topics are not available for this student.",
      },
      { status: 400 },
    );
  }

  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  if (instructions.length > MAX_INSTRUCTIONS) {
    return NextResponse.json(
      { error: `Instructions must be under ${MAX_INSTRUCTIONS} characters.` },
      { status: 400 },
    );
  }

  const topicInstruction = `Only include these selected topics in this plan: ${topics.join(", ")}. Do not include any other topics.`;
  const suggestion = await generateAIPlan(
    profile,
    dates,
    instructions ? `${topicInstruction}\n\n${instructions}` : topicInstruction,
  );
  return NextResponse.json(suggestion);
}

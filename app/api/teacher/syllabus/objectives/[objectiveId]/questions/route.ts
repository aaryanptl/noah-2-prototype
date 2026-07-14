import { NextResponse } from "next/server";
import { getObjectiveQuestions } from "@/lib/syllabus";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ objectiveId: string }> },
) {
  const { objectiveId } = await params;
  if (!/^\d+$/.test(objectiveId)) {
    return NextResponse.json(
      { error: "Invalid learning objective id" },
      { status: 400 },
    );
  }

  const pageParam = new URL(request.url).searchParams.get("page") ?? "1";
  const page = Number.parseInt(pageParam, 10);
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  return NextResponse.json(await getObjectiveQuestions(objectiveId, page));
}

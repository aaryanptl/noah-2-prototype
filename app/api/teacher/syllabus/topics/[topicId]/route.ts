import { NextResponse } from "next/server";
import { getTopicDetail } from "@/lib/syllabus";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> },
) {
  const { topicId } = await params;
  if (!/^\d+$/.test(topicId)) {
    return NextResponse.json({ error: "Invalid topic id" }, { status: 400 });
  }

  const topic = await getTopicDetail(topicId);
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  return NextResponse.json(topic);
}

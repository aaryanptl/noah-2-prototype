import { notFound } from "next/navigation";
import { TopicDetailScreen } from "@/components/syllabus/TopicDetailScreen";
import { getTopicDetail } from "@/lib/syllabus";

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const { topicId } = await params;
  if (!/^\d+$/.test(topicId)) notFound();
  const topic = await getTopicDetail(topicId);
  if (!topic) notFound();
  return <TopicDetailScreen topic={topic} />;
}

import { CodingRoadmap } from "../../components/coding-agent/CodingRoadmap";
import { getCodingRoadmap } from "../../lib/coding-challenges";

// Read the CSV content bank fresh on each request so newly generated challenges
// appear without a server restart and the list matches the detail routes.
export const dynamic = "force-dynamic";

export default async function CodingDebuggerPage() {
  // The full syllabus laid out as a gamified path, with generated questions
  // slotted under their level → module → topic.
  const roadmap = await getCodingRoadmap();
  return <CodingRoadmap roadmap={roadmap} />;
}

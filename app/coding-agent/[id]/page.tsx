import { notFound } from "next/navigation";
import { ChallengeWorkspace } from "../../../components/coding-agent/ChallengeWorkspace";
import { getCodingChallenge } from "../../../lib/coding-challenges";

// The content bank is read from CSV files on disk at request time, so render
// dynamically and allow ids not present at build to resolve on demand.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChallengePage({ params }: Props) {
  const { id } = await params;
  const challenge = await getCodingChallenge(Number(id));

  if (!challenge) {
    notFound();
  }

  return <ChallengeWorkspace challenge={challenge} />;
}

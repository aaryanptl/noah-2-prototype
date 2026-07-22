import type { Metadata } from "next";
import { SpeakingStudio } from "./speaking-studio";
import "./speaking-studio.css";
import "./speaking-studio-clean.css";

export const metadata: Metadata = {
  title: "Speak with Noah | English Public Speaking",
  description:
    "A friendly realtime English speaking studio for young learners.",
};
export default function SpeakEnglishPage() {
  return <SpeakingStudio />;
}

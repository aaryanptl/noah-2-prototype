"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Flame,
  Mic,
  MicOff,
  Play,
  Sparkles,
  Square,
  Star,
  Volume2,
  VolumeX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type RoomState =
  | "idle"
  | "connecting"
  | "ready"
  | "listening"
  | "thinking"
  | "speaking"
  | "complete"
  | "error";
type MouthPose = "closed" | "soft" | "narrow" | "round" | "open";
type ResponsePhase = "idle" | "model" | "awaiting-child" | "tip" | "complete";

const PRACTICES = [
  {
    id: "story",
    kind: "Story",
    icon: "📖",
    color: "#5b7cfa",
    title: "The Lion and the Mouse",
    duration: "3 min",
    level: "Starter",
    text: "One sunny afternoon, a mighty lion was sleeping peacefully in the forest.",
    tip: "Pause after “afternoon” to help your listener picture the scene.",
  },
  {
    id: "poem",
    kind: "Poem",
    icon: "🌈",
    color: "#f06a8a",
    title: "My Shadow",
    duration: "2 min",
    level: "Playful",
    text: "I have a little shadow that goes in and out with me.",
    tip: "Give “little shadow” a light, curious voice.",
  },
  {
    id: "speech",
    kind: "Speech",
    icon: "🎤",
    color: "#f29b38",
    title: "My Favourite Hobby",
    duration: "4 min",
    level: "Confident",
    text: "Good morning everyone. Today, I would love to tell you about my favourite hobby.",
    tip: "Look up and smile after your greeting before you continue.",
  },
] as const;
const POSE_INTERVAL = 96;
const POSES: MouthPose[] = ["closed", "soft", "narrow", "round", "open"];

function statusCopy(state: RoomState) {
  if (state === "connecting")
    return ["Warming up the studio…", "Noah is getting the microphone ready"];
  if (state === "listening")
    return [
      "Your turn — I’m listening",
      "Take your time and finish the whole line",
    ];
  if (state === "thinking")
    return ["Nice! Let me think…", "Noah is finding one helpful tip"];
  if (state === "speaking")
    return ["Noah is coaching", "Listen for expression and pauses"];
  if (state === "complete")
    return ["Your tip is ready", "One practice, one clear next step"];
  if (state === "error")
    return ["Let’s try that again", "The voice room needs a quick reset"];
  if (state === "ready")
    return ["Your stage is ready", "Read the line aloud when you’re ready"];
  return [
    "Meet Noah, your speaking buddy",
    "Connect once, then practise out loud",
  ];
}

export function SpeakingStudio() {
  const [practiceId, setPracticeId] = useState("story");
  const [roomState, setRoomState] = useState<RoomState>("idle");
  const [error, setError] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [streak] = useState(2);
  const [coachingTip, setCoachingTip] = useState("");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const avatarRef = useRef<HTMLDivElement | null>(null);
  const assistantDraftRef = useRef("");
  const responsePhaseRef = useRef<ResponsePhase>("idle");
  const tipRequestedRef = useRef(false);
  const childTranscriptRecordedRef = useRef(false);
  const practice =
    PRACTICES.find((item) => item.id === practiceId) ?? PRACTICES[0];
  const [statusTitle, statusSub] = statusCopy(roomState);
  const connected = !["idle", "connecting", "complete", "error"].includes(
    roomState,
  );

  const stopLipSync = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
    sourceRef.current?.disconnect();
    gainRef.current?.disconnect();
    audioContextRef.current?.close().catch(() => undefined);
    rafRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    audioContextRef.current = null;
  }, []);

  const startLipSync = useCallback(
    (stream: MediaStream) => {
      stopLipSync();
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      const zeroGain = context.createGain();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;
      zeroGain.gain.value = 0;
      source.connect(analyser);
      analyser.connect(zeroGain);
      zeroGain.connect(context.destination);
      audioContextRef.current = context;
      sourceRef.current = source;
      gainRef.current = zeroGain;
      const samples = new Uint8Array(analyser.fftSize);
      let envelope = 0,
        rollingPeak = 0.035,
        strongest = 0,
        currentIndex = 0;
      let lastPoseAt = performance.now(),
        silentSince = performance.now();
      const frame = (now: number) => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          energy += value * value;
        }
        const rms = Math.sqrt(energy / samples.length);
        envelope += (rms - envelope) * (rms >= envelope ? 0.38 : 0.12);
        rollingPeak = Math.max(envelope, rollingPeak * 0.997, 0.035);
        strongest = Math.max(
          strongest,
          Math.max(
            0,
            Math.min(
              1,
              (envelope - 0.012) / Math.max(rollingPeak - 0.012, 0.025),
            ),
          ),
        );
        if (rms >= 0.013) silentSince = now;
        if (now - lastPoseAt >= POSE_INTERVAL) {
          let target =
            strongest < 0.12
              ? 0
              : strongest < 0.32
                ? 1
                : strongest < 0.52
                  ? 2
                  : strongest < 0.76
                    ? 3
                    : 4;
          if (now - silentSince > 120) target = 0;
          currentIndex =
            now - silentSince > 170
              ? 0
              : currentIndex + Math.sign(target - currentIndex);
          if (avatarRef.current)
            avatarRef.current.dataset.mouth = POSES[currentIndex];
          strongest = 0;
          lastPoseAt = now;
        }
        rafRef.current = requestAnimationFrame(frame);
      };
      rafRef.current = requestAnimationFrame(frame);
    },
    [stopLipSync],
  );

  const closeVoiceRoom = useCallback(
    (finalState: RoomState) => {
      channelRef.current?.close();
      peerRef.current?.close();
      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
      if (audioRef.current) audioRef.current.srcObject = null;
      channelRef.current = null;
      peerRef.current = null;
      localStreamRef.current = null;
      stopLipSync();
      setMicMuted(false);
      setSpeakerMuted(false);
      setRoomState(finalState);
    },
    [stopLipSync],
  );
  const disconnect = useCallback(
    () => closeVoiceRoom("idle"),
    [closeVoiceRoom],
  );
  useEffect(() => disconnect, [disconnect]);

  const addAssistantDelta = (delta: string) => {
    assistantDraftRef.current += delta;
  };

  const handleEvent = (event: Record<string, unknown>) => {
    if (
      event.type === "input_audio_buffer.speech_started" &&
      responsePhaseRef.current === "awaiting-child"
    )
      setRoomState("listening");
    if (
      event.type === "input_audio_buffer.speech_stopped" &&
      responsePhaseRef.current === "awaiting-child"
    )
      setRoomState("thinking");
    if (
      event.type === "input_audio_buffer.committed" &&
      responsePhaseRef.current === "awaiting-child" &&
      !tipRequestedRef.current
    ) {
      tipRequestedRef.current = true;
      responsePhaseRef.current = "tip";
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setMicMuted(true);
      setRoomState("thinking");
      channelRef.current?.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions:
              "The child has finished one performance. Reply in exactly two short sentences: first, praise one specific thing they did well; second, give exactly one small actionable speaking tip. Do not ask a question, invite another repetition, offer another tip, or continue the conversation. End after the tip.",
            max_output_tokens: 120,
            metadata: { response_purpose: "single_coaching_tip" },
          },
        }),
      );
    }
    if (
      event.type === "conversation.item.input_audio_transcription.completed"
    ) {
      const transcript = String(event.transcript ?? "").trim();
      if (transcript && !childTranscriptRecordedRef.current) {
        childTranscriptRecordedRef.current = true;
        setAttempts(1);
      }
    }
    if (event.type === "response.output_audio.delta") setRoomState("speaking");
    if (event.type === "response.output_audio_transcript.delta")
      addAssistantDelta(String(event.delta ?? ""));
    if (event.type === "response.output_audio_transcript.done") {
      const transcript = String(
        event.transcript ?? assistantDraftRef.current,
      ).trim();
      if (responsePhaseRef.current === "tip" && transcript)
        setCoachingTip(transcript);
      assistantDraftRef.current = "";
    }
    if (event.type === "response.done") {
      if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
      if (responsePhaseRef.current === "model") {
        responsePhaseRef.current = "awaiting-child";
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        setMicMuted(false);
        setRoomState("ready");
      } else if (responsePhaseRef.current === "tip") {
        responsePhaseRef.current = "complete";
        closeVoiceRoom("complete");
      }
    }
    if (event.type === "error") {
      if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
      setError("Noah missed that turn. Please try once more.");
      setRoomState("error");
    }
  };

  const sendContext = (channel: RTCDataChannel, item = practice) => {
    responsePhaseRef.current = "model";
    tipRequestedRef.current = false;
    childTranscriptRecordedRef.current = false;
    assistantDraftRef.current = "";
    setCoachingTip("");
    setAttempts(0);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    setMicMuted(true);
    channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: `The selected ${item.kind.toLowerCase()} is titled “${item.title}”. The practice line is: ${item.text}`,
            },
          ],
        },
      }),
    );
    channel.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: `Model this line exactly once with clear, natural expression: “${item.text}” Then say only “Your turn.” Do not give feedback or a tip yet.`,
          max_output_tokens: 120,
          metadata: { response_purpose: "model_practice_line" },
        },
      }),
    );
  };

  const connect = async () => {
    setError("");
    setCoachingTip("");
    setAttempts(0);
    responsePhaseRef.current = "idle";
    tipRequestedRef.current = false;
    childTranscriptRecordedRef.current = false;
    setRoomState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = ({ streams }) => {
        audio.srcObject = streams[0];
        audio.muted = speakerMuted;
        startLipSync(streams[0]);
      };
      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.addEventListener("message", (message) => {
        try {
          handleEvent(JSON.parse(message.data));
        } catch {
          /* ignore malformed events */
        }
      });
      channel.addEventListener("open", () => {
        setRoomState("ready");
        sendContext(channel);
      });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: offer.sdp,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not connect to Noah.");
      }
      await peer.setRemoteDescription({
        type: "answer",
        sdp: await response.text(),
      });
    } catch (reason) {
      disconnect();
      setRoomState("error");
      setError(
        reason instanceof Error ? reason.message : "Could not connect to Noah.",
      );
    }
  };

  const switchPractice = (id: string) => {
    setPracticeId(id);
    setAttempts(0);
    setCoachingTip("");
    responsePhaseRef.current = "idle";
    tipRequestedRef.current = false;
    childTranscriptRecordedRef.current = false;
    const next = PRACTICES.find((item) => item.id === id) ?? PRACTICES[0];
    if (connected && channelRef.current?.readyState === "open") {
      sendContext(channelRef.current, next);
      setRoomState("thinking");
    }
  };
  const toggleMic = () => {
    if (responsePhaseRef.current !== "awaiting-child") return;
    const next = !micMuted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMicMuted(next);
  };
  const toggleSpeaker = () => {
    const next = !speakerMuted;
    if (audioRef.current) audioRef.current.muted = next;
    setSpeakerMuted(next);
  };
  return (
    <main className="speaking-app">
      <header className="studio-header">
        <div className="brand-lockup">
          <Link href="/" className="back-button" aria-label="Back to Noah home">
            <ArrowLeft size={18} />
          </Link>
          <div className="noah-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <strong>Noah 2.0</strong>
            <span>Speaking room</span>
          </div>
        </div>
        <div className="header-progress">
          <span>Today&apos;s practice</span>
          <div>
            <i style={{ width: `${Math.min(100, 33 + attempts * 34)}%` }} />
          </div>
          <strong>{Math.min(100, 33 + attempts * 34)}%</strong>
        </div>
        <div className="streak-pill">
          <Flame size={15} fill="currentColor" />
          <strong>{streak} day streak</strong>
        </div>
      </header>

      <div className="studio-shell">
        <aside className="practice-rail" aria-label="Speaking practices">
          <div className="rail-heading">
            <div>
              <span>Practice library</span>
              <h2>Choose a lesson</h2>
            </div>
            <BookOpen size={19} />
          </div>
          <div className="practice-list">
            {PRACTICES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`practice-card ${practiceId === item.id ? "active" : ""}`}
                onClick={() => switchPractice(item.id)}
                style={
                  { "--practice-color": item.color } as React.CSSProperties
                }
              >
                <span className="practice-icon">{item.icon}</span>
                <span className="practice-copy">
                  <small>
                    {item.kind} · {item.duration}
                  </small>
                  <strong>{item.title}</strong>
                  <em>{item.level}</em>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
          <div className="mini-challenge">
            <span className="challenge-star">
              <Star size={18} fill="currentColor" />
            </span>
            <div>
              <small>DAILY CHALLENGE</small>
              <strong>Use a brave, clear voice</strong>
              <span>+20 sparkle points</span>
            </div>
          </div>
        </aside>

        <section className="practice-workspace">
          <div className="workspace-heading">
            <div>
              <span className="workspace-eyebrow">
                <Sparkles size={14} /> English speaking practice
              </span>
              <h1>Build a brave speaking voice.</h1>
              <p>Listen to Noah, read the line aloud, and get one clear tip.</p>
            </div>
            <div className="lesson-count">
              Lesson {PRACTICES.findIndex((item) => item.id === practiceId) + 1}
              <span>of {PRACTICES.length}</span>
            </div>
          </div>

          <section className="flow-steps" aria-label="Practice steps">
            <div className={connected || attempts > 0 ? "done" : "active"}>
              <span>{connected || attempts > 0 ? <Check /> : "1"}</span>
              <strong>Meet Noah</strong>
            </div>
            <i />
            <div
              className={
                connected && attempts === 0
                  ? "active"
                  : attempts > 0
                    ? "done"
                    : ""
              }
            >
              <span>{attempts > 0 ? <Check /> : "2"}</span>
              <strong>Read aloud</strong>
            </div>
            <i />
            <div
              className={coachingTip ? "done" : attempts > 0 ? "active" : ""}
            >
              <span>{coachingTip ? <Check /> : "3"}</span>
              <strong>Get a tip</strong>
            </div>
          </section>

          <article className={`stage-card state-${roomState}`}>
            <div className="stage-visual">
              <div className="stage-topline">
                <span className={`live-dot ${connected ? "connected" : ""}`} />
                <span>
                  {connected ? "NOAH IS LIVE" : "YOUR SPEAKING BUDDY"}
                </span>
              </div>
              <div className="avatar-orbit">
                <div className="orbit-ring ring-one" />
                <div className="orbit-ring ring-two" />
                <div
                  className="avatar-frame"
                  data-mouth="closed"
                  ref={avatarRef}
                >
                  <div className="avatar-art">
                    <Image
                      src="/avatar/avatar-base.png"
                      alt="Noah, a friendly white and blue robot speaking coach"
                      width={430}
                      height={430}
                      className="avatar-base"
                      priority
                    />
                    <div className="mouth-window" aria-hidden="true">
                      {(["soft", "narrow", "round", "open"] as const).map(
                        (pose) => (
                          <Image
                            key={pose}
                            src={`/avatar/mouth-${pose}.png`}
                            alt=""
                            width={220}
                            height={130}
                            className={`mouth-pose mouth-${pose}`}
                          />
                        ),
                      )}
                    </div>
                  </div>
                </div>
                <span className="sparkle sparkle-a">✦</span>
                <span className="sparkle sparkle-b">✦</span>
                <span className="sparkle sparkle-c">•</span>
              </div>
              <div className="status-copy" aria-live="polite">
                <h2>{statusTitle}</h2>
                <p>{statusSub}</p>
              </div>
            </div>

            <div className="stage-content">
              <div className="script-card">
                <div className="script-label">
                  <span
                    style={{
                      background: `${practice.color}18`,
                      color: practice.color,
                    }}
                  >
                    {practice.icon}
                  </span>
                  <div>
                    <small>
                      {practice.kind} · {practice.duration}
                    </small>
                    <strong>{practice.title}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      channelRef.current && sendContext(channelRef.current)
                    }
                    disabled={!connected}
                  >
                    <Play size={16} fill="currentColor" /> Hear Noah
                  </button>
                </div>
                <blockquote>“{practice.text}”</blockquote>
                <div
                  className={`coach-tip ${coachingTip ? "coach-tip-result" : ""}`}
                  aria-live="polite"
                >
                  {coachingTip ? (
                    <CircleCheck size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span>
                    <strong>
                      {coachingTip ? "Noah’s one tip:" : "Before you start:"}
                    </strong>{" "}
                    {coachingTip || practice.tip}
                  </span>
                </div>
              </div>

              {connected ? (
                <div className="voice-controls">
                  <div className="listening-note">
                    <span className="listening-wave">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>
                      <strong>
                        {micMuted ? "Microphone is paused" : "Microphone is on"}
                      </strong>
                      {micMuted
                        ? "Listen to Noah’s line"
                        : "Read whenever you are ready"}
                    </span>
                  </div>
                  <div className="control-buttons">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={micMuted ? "muted" : ""}
                      disabled={responsePhaseRef.current !== "awaiting-child"}
                      aria-label={
                        micMuted ? "Turn microphone on" : "Mute microphone"
                      }
                      title={
                        micMuted ? "Turn microphone on" : "Mute microphone"
                      }
                    >
                      {micMuted ? <MicOff /> : <Mic />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleSpeaker}
                      className={speakerMuted ? "muted" : ""}
                      aria-label={speakerMuted ? "Turn sound on" : "Mute Noah"}
                      title={speakerMuted ? "Turn sound on" : "Mute Noah"}
                    >
                      {speakerMuted ? <VolumeX /> : <Volume2 />}
                    </button>
                    <button
                      type="button"
                      onClick={disconnect}
                      className="disconnect-button"
                      aria-label="End practice"
                      title="End practice"
                    >
                      <Square size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="connect-button"
                  onClick={connect}
                  disabled={roomState === "connecting"}
                >
                  <Mic size={19} />
                  {roomState === "connecting"
                    ? "Connecting to Noah…"
                    : coachingTip
                      ? "Practise this line again"
                      : "Start speaking practice"}
                  <ChevronRight size={18} />
                </button>
              )}
              {error ? <p className="inline-error">{error}</p> : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

// @ts-nocheck
"use client";

import { jsx as reactJsx, jsxs } from "react/jsx-runtime";
import * as React from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
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

const jsx = (type, props, key, hasStaticChildren) =>
  hasStaticChildren ? jsxs(type, props, key) : reactJsx(type, props, key);

const PRACTICE_KINDS = ["Story", "Poem", "Speech"];
const PRACTICES = [
  {
    id: "story-lion-mouse",
    kind: "Story",
    icon: "📖",
    color: "#5b7cfa",
    title: "The Lion and the Mouse",
    duration: "3 min",
    level: "Starter",
    text: 'One sunny afternoon, a mighty lion was sleeping peacefully under a big tree in the forest. The warm sun made him feel cosy, and he snored softly. A tiny brown mouse was looking for food nearby. She scampered across the grass, climbed over a small stone, and accidentally ran over the lion\'s big paw. The lion woke up with a loud, angry roar. He opened one big eye and caught the frightened mouse in his strong paw. "Please let me go," squeaked the little mouse. "One day I may help you, and then you will be glad you were kind." The lion laughed loudly because the tiny mouse looked so small and weak. But the lion was not cruel, so he opened his paw and set her free. The mouse ran away quickly into the grass.\n\nA few days later, the same lion was walking through the forest when he stepped into a hunter\'s strong net. The net lifted him up into the air, and he could not move. He roared and pulled with all his strength, but the thick ropes would not break. The whole forest heard his sad roar. The little mouse heard it too and ran as fast as she could. She found the lion trapped in the net. "Do not worry," she said. "I will help you." She began to nibble the ropes with her sharp little teeth. Bit by bit, the ropes came apart. After a long time, the lion was free. He gently lifted his paw and looked at the tiny mouse. "Thank you, little friend," said the lion. "You were right. Even small friends can be great helpers." From that day, the lion and the mouse became the best of friends.',
    tip: "Pause at the exciting moments — like when the lion roars and when the mouse frees him.",
  },
  {
    id: "story-tortoise-hare",
    kind: "Story",
    icon: "🐢",
    color: "#3fae7a",
    title: "The Tortoise and the Hare",
    duration: "3 min",
    level: "Starter",
    text: 'Once upon a time, in a green meadow, there lived a very fast hare who loved to show off. "I am the quickest animal in the whole meadow," he boasted to everyone. "Nobody can ever beat me in a race." A quiet, steady tortoise heard this and smiled. "I challenge you to a race," said the tortoise slowly. The hare laughed so hard that tears came out of his eyes. "You? Race me? This will be the easiest win of my life!" he said.\n\nThe next morning, all the animals gathered to watch. The wise old owl waved a leaf to start the race. zoom! The hare was gone in a flash, kicking up dust. The tortoise took one slow step, then another, and another. Very soon, the hare was so far ahead that he looked back and could not even see the tortoise. "That slow old fellow will take the whole day," he thought. "I have plenty of time. Let me rest under this shady tree for a while." He sat down, closed his eyes, and soon fell fast asleep.\n\na gentle wind blew, and the sun moved across the sky. The tortoise never stopped. Step by step, he walked past the sleeping hare. He did not look back, and he did not hurry. At last, he reached the finish line just as the hare was waking up. The hare jumped up and ran as fast as he could, but it was too late. The tortoise had already crossed the line! All the animals cheered loudly. The hare hung his head and learned a lesson he never forgot: slow and steady wins the race.',
    tip: "Speed up when the hare zooms, and slow down when the tortoise walks step by step.",
  },
  {
    id: "story-thirsty-crow",
    kind: "Story",
    icon: "🐦",
    color: "#7c83ff",
    title: "The Thirsty Crow",
    duration: "2 min",
    level: "Starter",
    text: 'On a hot summer morning, a poor thirsty crow was flying high above a village. The sun was blazing, and there had been no rain for many days. The crow\'s throat was dry and scratchy, and he felt weaker with every flap of his wings. "I must find some water soon," he said to himself, "or I will not be able to fly anymore." He looked down at the rooftops, the gardens, and the dry fields, but he could not see a single drop of water anywhere.\n\nAt last, he spotted a brown clay pot sitting outside a small house. The crow flew down at once and peered inside the pot. Yes! There was water at the very bottom. But the pot was tall and narrow, and the water was far too low for his short beak to reach. The crow tried to tip the pot over, but it was too heavy. He pushed it with all his might, but it did not move even a little. He sat on the rim and thought hard.\n\nThen, clever crow had a wonderful idea. He flew to the garden path and picked up a small pebble in his beak. He flew back and dropped the pebble into the pot with a tiny plop. Splash! Then he fetched another pebble, and another, and another. Trip after trip, he dropped many pebbles into the pot. Slowly, the water began to rise. After many trips, the water came high enough for the crow to drink. He drank happily, flapped his wings with joy, and flew away full of energy. Where there is a will, there is a way.',
    tip: "Sound excited when the crow finds the pot, and use small pauses while he drops each pebble.",
  },
  {
    id: "story-boy-wolf",
    kind: "Story",
    icon: "🐺",
    color: "#f0a04a",
    title: "The Boy Who Cried Wolf",
    duration: "3 min",
    level: "Starter",
    text: 'Once there was a young shepherd boy who looked after a flock of sheep on a green hillside. He was alone all day, and he often felt bored. One sunny afternoon, he thought of a mischievous plan to have some fun. He cupped his hands around his mouth and shouted as loudly as he could, "Wolf! Wolf! A wolf is attacking the sheep!" The villagers heard his cries and came running up the hill with sticks and clubs. But when they arrived, there was no wolf. The boy laughed and laughed. "I tricked you!" he said. The villagers were cross and told him not to tell lies.\n\nA few days later, the boy felt bored again. He shouted, "Wolf! Wolf! Please help me!" Once more, the kind villagers hurried up the hill, breathing hard. But again, there was no wolf. The boy giggled and clapped his hands. "You believed me again!" he cried. This time the villagers were very angry. "Do not call us for nothing," they warned. "Next time, we will not come."\n\nThen, one evening, a real wolf crept out of the dark forest. It had sharp teeth and hungry eyes. The boy was terrified. "Wolf! Wolf!" he screamed. "It is real! A real wolf is here!" But no one came. The villagers heard him and said, "It is just that silly boy telling another story." The wolf took one of the sheep and ran away. The boy sat alone on the hill, crying. At last he understood that nobody believes a liar, even when he tells the truth.',
    tip: "Make the boy's cries sound more scared each time — playful first, then truly frightened at the end.",
  },
  {
    id: "poem-shadow",
    kind: "Poem",
    icon: "🌈",
    color: "#f06a8a",
    title: "My Shadow",
    duration: "2 min",
    level: "Playful",
    text: "I have a little shadow that goes in and out with me,\nAnd what can be the use of him is more than I can see.\nHe is very, very like me from the heels up to the head;\nAnd I see him jump before me, when I jump into my bed.\n\nThe funniest thing about him is the way he likes to grow—\nNot at all like proper children, which is always very slow;\nFor he sometimes shoots up taller like an india-rubber ball,\nAnd he sometimes gets so little that there's none of him at all.\n\nHe hasn't got a notion of how children ought to play,\nAnd can only make a fool of me in every sort of way.\nHe stays so close beside me, he's a coward you can see;\nI'd think shame to stick to nursie as that shadow sticks to me!\n\nOne morning, very early, before the sun was up,\nI rose and found the shining dew on every buttercup;\nBut my lazy little shadow, like an arrant sleepy-head,\nHad stayed at home behind me and was fast asleep in bed.",
    tip: "Change your voice for each stanza; make it playful and curious.",
  },
  {
    id: "poem-rain",
    kind: "Poem",
    icon: "🌧️",
    color: "#5s9ed9",
    title: "The Rain Song",
    duration: "2 min",
    level: "Playful",
    text: "I hear the rain come tapping down,\nA gentle knocking on the town,\nIt washes every dusty street,\nAnd makes the thirsty garden sweet.\n\nThe little puddles jump and play,\nThey love a cool and rainy day.\nThe thirsty trees all drink their fill,\nThe window glass is wet and chill.\n\nI watch the drops slide down the pane,\nLike silver beads upon a chain.\nThey race each other, fast then slow,\nWhere do they go? I do not know.\n\nThen out comes the sun, warm and bright,\nIt paints a rainbow, soft and light.\nThe clouds roll by, the sky turns blue,\nThe rain has said its soft adieu.",
    tip: "Keep a gentle, steady rhythm like falling raindrops.",
  },
  {
    id: "poem-moon",
    kind: "Poem",
    icon: "🌙",
    color: "#b06dd9",
    title: "The Moon and the Stars",
    duration: "2 min",
    level: "Playful",
    text: "The moon is a boat in the soft dark sky,\nIt floats so high, so quiet and shy.\nThe stars are the lanterns that show it the way,\nThey twinkle and dance while the whole world is still.\n\nI stand at my window and look up so high,\nThe moon is a silver disc up in the sky.\nIt follows me home when I walk down the street,\nIt peeps through the leaves and the cold so my feet.\n\nThe small stars whisper a secret to me,\nA gentle old song from across the wide sea.\nI blink and I blink, and they blink back as well.\nThe night has a wonderful secret to tell.\n\nSo goodnight, dear moon, and goodnight, little star,\nI leave you to shine on wherever you are.\nWhen morning comes, you may hide out of view,\nBut I will come looking by nightfall for you.",
    tip: "Whisper the night lines and let your voice soar when describing the moon.",
  },
  {
    id: "poem-kite",
    kind: "Poem",
    icon: "🪁",
    color: "#5fd0c0",
    title: "The Little Red Kite",
    duration: "2 min",
    level: "Playful",
    text: "My little red kite climbs into the blue,\nIt tugs at the string as a cold wind blows through.\nIt dances and dives through the soft summer air,\nIt whirls and it loops without worry or care.\n\nUp, up it goes, higher and higher!\nThe houses below grow as small as a fire.\nThe birds fly past, but my kite flies above,\nA bright little ribbon of courage and love.\n\nI hold the spool tight, I let the line run,\nIt spins in the warm and wonderful sun.\nThe tail waves along like a winding red river,\nThe wind makes my little red kite start to shiver.\n\nThen down comes the wind, the kite sinks to the ground,\nIt rests in my arms without making a sound.\nTomorrow we will climb the sky once again,\nMy little red kite and the soft summer wind.",
    tip: "Raise your pitch as the kite climbs and lower it as the kite comes down.",
  },
  {
    id: "speech-hobby",
    kind: "Speech",
    icon: "🎤",
    color: "#f29b38",
    title: "My Favourite Hobby",
    duration: "4 min",
    level: "Confident",
    text: "Good morning everyone. My name is Aarav, and today I would love to tell you about my favourite hobby. My favourite hobby is drawing and painting. I love this hobby because it helps me bring my imagination to life on paper. Every single day after I finish my schoolwork, I take out my crayons, sketch pens, watercolours, and drawing book. I draw many things — animals, trees, flowers, birds, and sometimes funny cartoons of my family members too.\n\nI started drawing when I was just five years old. At first, my pictures were very simple. I could only draw circles, straight lines, and small houses. But with regular practice, I learned to draw faces, hands, beautiful landscapes, and even my favourite superheroes. My mother puts my best drawings on the fridge, and my teachers always appreciate my work. This makes me feel very proud and gives me a lot of confidence.\n\nDrawing is not just fun and enjoyable; it also teaches me many important things. It improves my concentration and patience. When I draw a picture, I focus on small details like eyes, leaves, clouds, and shadows. I also learn about different colours and how they mix together to make new shades. Sometimes I make mistakes, and I have to start again. But that is perfectly fine because every mistake teaches me something new and helps me improve.\n\nIn the future, I want to become a much better artist. I dream of drawing my own comic books and making colourful paintings that tell exciting stories. I also want to teach my younger brother how to draw because sharing what we love is a wonderful thing. I believe that if we practice every day with joy and effort, we can become good at anything we truly love.\n\nThank you for listening to me so patiently. I hope all of you will also find a hobby that makes you happy and keeps you learning. Remember to keep practising and never stop exploring new things. Thank you!",
    tip: "Speak clearly and pause after each main point. Smile at your audience.",
  },
  {
    id: "speech-best-friend",
    kind: "Speech",
    icon: "🤝",
    color: "#5ab0f0",
    title: "My Best Friend",
    duration: "3 min",
    level: "Confident",
    text: "Good morning Respected teacher and my dear friends. Today I want to talk about someone very special in my life. His name is Kabir, and he is my best friend. We have been friends since we were in the first grade, and we have shared so many happy moments together. I feel very lucky to have a friend like him by my side.\n\nKabir is a kind and cheerful boy who always has a big smile on his face. He is taller than me, he has curly hair, and he wears small glasses that make him look very smart. We sit together in class every day, we share our snacks, and we help each other with our homework. When I forget my pencil, he gives me one of his without even asking twice. When he is sad, I try my best to make him laugh.\n\nWe also love to play together after school. Our favourite game is cricket, and we spend hours in the park taking turns to bat and bowl. Kabir is a wonderful batsman, and he teaches me how to hold the bat correctly. Sometimes we also fly kites on the terrace, and we cheer for each other when our kites go the highest. Even when we argue, we say sorry quickly and become friends again.\n\nA true friend is someone who supports you, shares your joys, and helps you when things are difficult. Kabir is exactly that kind of friend. I hope our friendship stays strong as we grow older. I would like to end by saying that good friends are like precious treasures, and we should always value them. Thank you all for listening to me so kindly.",
    tip: "Smile when you describe your friend, and pause briefly before each new part.",
  },
  {
    id: "speech-my-school",
    kind: "Speech",
    icon: "🏫",
    color: "#f08755",
    title: "My School",
    duration: "3 min",
    level: "Confident",
    text: "Good morning everyone. Today I would love to tell you about my school, which I love very much. The name of my school is Sunshine Public School, and I have been studying here since the first grade. My school is a big building with bright classrooms, a large playground, and a lovely garden full of flowers and trees. Every morning when I walk through the gates, I feel happy and ready to learn.\n\nMy school has many wonderful teachers who care about every student. My favourite teacher is Mrs. Gupta, who teaches us English. She tells us interesting stories and always encourages us to read new books. In class, we learn many useful things like maths, science, and history. My school also has a big library filled with storybooks, encyclopedias, and colourful picture books. Every week, I borrow a new book, and I read it at home with great excitement.\n\nApart from studies, my school gives us many chances to play and have fun. We have a large playground where we play football, cricket, and many running games. There is also a music room where we learn to sing, and an art room where we paint and make clay models. Every year, we have a sports day, an annual function, and a science fair. I always take part in these events because they make me feel confident and proud.\n\nMy school is like my second home. My friends and teachers make me feel safe, happy, and full of hope. I believe that a good school helps a child grow into a kind and capable person. I will always be thankful to my school for everything it has given me. Thank you all for listening to me with so much patience.",
    tip: "Speak with warmth and pride, and pause after naming each favourite thing about school.",
  },
  {
    id: "speech-reading",
    kind: "Speech",
    icon: "📚",
    color: "#6dd9c9",
    title: "Why I Love Reading",
    duration: "3 min",
    level: "Confident",
    text: "Good morning everyone. Today I want to share with you something I love very much. I love reading books. For me, every book is like a magic door. When I open it, I can travel to faraway lands, meet brave heroes, and learn about stars, dinosaurs, and far-off planets. Reading has become my favourite thing to do, and I want to tell you why.\n\nI started reading when I was very young. At first, I only looked at picture books and listened to my mother tell me bedtime stories. Slowly, I learned to read on my own, and a whole new world opened up in front of me. Now I read every single day. I read before I go to sleep, I read in the car when we travel, and I read in the library during my free time. Each book takes me on a new and exciting adventure.\n\nReading also helps me in many ways. It teaches me new words, makes me a better writer, and helps me understand people who are different from me. When I read a story, I feel what the characters feel — their happiness, their fear, and their courage. This makes me kinder and more thoughtful. My teachers always say that good readers become good thinkers, and I truly believe that is right.\n\nMy favourite books are adventure stories and books about animals. I love to imagine myself as the hero of the story, exploring jungles or sailing across the sea. I want all my friends to feel this joy too. So my small request to you today is this — pick up a book, read just one page, and see where it takes you. You might discover a wonderful new friend inside that book. Thank you all for listening to me.",
    tip: "Let your voice sound curious and excited, like you are sharing a special secret.",
  },
];
const POSE_INTERVAL = 96;
const POSES = ["closed", "soft", "narrow", "round", "open"];
function statusCopy(state, modeling = false) {
  if (state === "connecting")
    return ["Warming up the studio…", "Noah is getting the microphone ready"];
  if (state === "listening")
    return [
      "Your turn — I’m listening",
      "Take your time and finish the whole piece",
    ];
  if (state === "thinking")
    return modeling
      ? ["Noah is preparing…", "He will model the piece for you"]
      : ["Nice! Let me think…", "Noah is finding one helpful tip"];
  if (state === "speaking")
    return modeling
      ? ["Noah is modelling", "Listen, or click Skip to start reading"]
      : ["Noah is coaching", "Listen for expression and pauses"];
  if (state === "complete")
    return ["Your tip is ready", "One practice, one clear next step"];
  if (state === "error")
    return ["Let’s try that again", "The voice room needs a quick reset"];
  if (state === "ready")
    return ["Your stage is ready", "Read the piece aloud when you’re ready"];
  return [
    "Meet Noah, your speaking buddy",
    "Connect once, then practise out loud",
  ];
}
const WATCHDOUT_TIMEOUT_MS = 15_000;
const MODEL_WORD_DURATION_MS = 360;
export function SpeakingStudio() {
  const [practiceId, setPracticeId] = (0, React.useState)("story-lion-mouse");
  const [openKind, setOpenKind] = (0, React.useState)("Story");
  const [roomState, setRoomState] = (0, React.useState)("idle");
  const [error, setError] = (0, React.useState)("");
  const [micMuted, setMicMuted] = (0, React.useState)(false);
  const [speakerMuted, setSpeakerMuted] = (0, React.useState)(false);
  const [attempts, setAttempts] = (0, React.useState)(0);
  const [streak] = (0, React.useState)(2);
  const [coachingTip, setCoachingTip] = (0, React.useState)("");
  const [tipStarted, setTipStarted] = (0, React.useState)(false);
  const [isModeling, setIsModeling] = (0, React.useState)(false);
  const [showStartOptions, setShowStartOptions] = (0, React.useState)(false);
  const peerRef = (0, React.useRef)(null);
  const channelRef = (0, React.useRef)(null);
  const localStreamRef = (0, React.useRef)(null);
  const audioRef = (0, React.useRef)(null);
  const recorderRef = (0, React.useRef)(null);
  const recordingChunksRef = (0, React.useRef)([]);
  const audioContextRef = (0, React.useRef)(null);
  const sourceRef = (0, React.useRef)(null);
  const gainRef = (0, React.useRef)(null);
  const rafRef = (0, React.useRef)(null);
  const avatarRef = (0, React.useRef)(null);
  const assistantDraftRef = (0, React.useRef)("");
  const lastTipTextRef = (0, React.useRef)("");
  const responsePhaseRef = (0, React.useRef)("idle");
  const tipRequestedRef = (0, React.useRef)(false);
  const childTranscriptRecordedRef = (0, React.useRef)(false);
  const hasSpokenRef = (0, React.useRef)(false);
  const lastTranscriptRef = (0, React.useRef)("");
  const awaitingTranscriptRef = (0, React.useRef)(false);
  const transcriptFallbackRef = (0, React.useRef)(null);
  const waitingForTipEndRef = (0, React.useRef)(false);
  const modelChunksRef = (0, React.useRef)([]);
  const currentChunkRef = (0, React.useRef)(0);
  const watchdogRef = (0, React.useRef)(null);
  const startModeRef = (0, React.useRef)("hear-noah");
  const practice =
    PRACTICES.find((item) => item.id === practiceId) ?? PRACTICES[0];
  const [statusTitle, statusSub] = statusCopy(roomState, isModeling);
  const connected = !["idle", "connecting", "complete", "error"].includes(
    roomState,
  );
  const stopLipSync = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[stopLipSync]": () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
        sourceRef.current?.disconnect();
        gainRef.current?.disconnect();
        audioContextRef.current?.close().catch(
          {
            "SpeakingStudio.useCallback[stopLipSync]": () => undefined,
          }["SpeakingStudio.useCallback[stopLipSync]"],
        );
        rafRef.current = null;
        sourceRef.current = null;
        gainRef.current = null;
        audioContextRef.current = null;
      },
    }["SpeakingStudio.useCallback[stopLipSync]"],
    [],
  );
  const startLipSync = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[startLipSync]": (stream) => {
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
        const frame = {
          "SpeakingStudio.useCallback[startLipSync].frame": (now) => {
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
          },
        }["SpeakingStudio.useCallback[startLipSync].frame"];
        rafRef.current = requestAnimationFrame(frame);
      },
    }["SpeakingStudio.useCallback[startLipSync]"],
    [stopLipSync],
  );
  const closeVoiceRoom = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[closeVoiceRoom]": (finalState) => {
        channelRef.current?.close();
        peerRef.current?.close();
        localStreamRef.current?.getTracks().forEach(
          {
            "SpeakingStudio.useCallback[closeVoiceRoom]": (track) => {
              track.stop();
            },
          }["SpeakingStudio.useCallback[closeVoiceRoom]"],
        );
        if (audioRef.current) audioRef.current.srcObject = null;
        channelRef.current = null;
        peerRef.current = null;
        localStreamRef.current = null;
        awaitingTranscriptRef.current = false;
        if (transcriptFallbackRef.current !== null) {
          clearTimeout(transcriptFallbackRef.current);
          transcriptFallbackRef.current = null;
        }
        waitingForTipEndRef.current = false;
        hasSpokenRef.current = false;
        modelChunksRef.current = [];
        currentChunkRef.current = 0;
        stopLipSync();
        setMicMuted(false);
        setSpeakerMuted(false);
        setRoomState(finalState);
      },
    }["SpeakingStudio.useCallback[closeVoiceRoom]"],
    [stopLipSync],
  );
  const disconnect = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[disconnect]": () => closeVoiceRoom("idle"),
    }["SpeakingStudio.useCallback[disconnect]"],
    [closeVoiceRoom],
  );
  const clearWatchdog = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[clearWatchdog]": () => {
        if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      },
    }["SpeakingStudio.useCallback[clearWatchdog]"],
    [],
  );
  const startWatchdog = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[startWatchdog]": () => {
        clearWatchdog();
        watchdogRef.current = setTimeout(
          {
            "SpeakingStudio.useCallback[startWatchdog]": () => {
              setRoomState(
                {
                  "SpeakingStudio.useCallback[startWatchdog]": (prev) => {
                    if (
                      prev === "idle" ||
                      prev === "error" ||
                      prev === "complete"
                    )
                      return prev;
                    closeVoiceRoom("error");
                    return "error";
                  },
                }["SpeakingStudio.useCallback[startWatchdog]"],
              );
            },
          }["SpeakingStudio.useCallback[startWatchdog]"],
          WATCHDOUT_TIMEOUT_MS,
        );
      },
    }["SpeakingStudio.useCallback[startWatchdog]"],
    [clearWatchdog, closeVoiceRoom],
  );
  (0, React.useEffect)(
    {
      "SpeakingStudio.useEffect": () => {
        return {
          "SpeakingStudio.useEffect": () => {
            clearWatchdog();
            disconnect();
          },
        }["SpeakingStudio.useEffect"];
      },
    }["SpeakingStudio.useEffect"],
    [disconnect, clearWatchdog],
  );
  const submitTranscript = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[submitTranscript]": async (transcript) => {
        try {
          await fetch("/api/speak-english/submit", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transcript,
              practiceId: practiceId,
            }),
          });
        } catch {
          /* silent — guardrail failure must not block the UI */
        }
      },
    }["SpeakingStudio.useCallback[submitTranscript]"],
    [practiceId],
  );
  const sendTipRequest = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[sendTipRequest]": (childHeard) => {
        if (!channelRef.current || channelRef.current.readyState !== "open")
          return;
        const targetLine = practice.text;
        const heardPart = childHeard ? `What they said: "${childHeard}".` : "";
        channelRef.current.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions: `Target practice piece: "${targetLine}". ${heardPart} Give honest, concise feedback in 2-4 sentences. Never give fake praise. If they missed words or stuttered, say so gently and give one fix. If they did well, praise one real thing. End with encouragement.`,
              max_output_tokens: 1536,
              metadata: {
                response_purpose: "single_coaching_tip",
              },
            },
          }),
        );
      },
    }["SpeakingStudio.useCallback[sendTipRequest]"],
    [practice.text],
  );
  const addAssistantDelta = (delta) => {
    assistantDraftRef.current += delta;
  };
  const handleEvent = (event) => {
    if (
      event.type === "input_audio_buffer.speech_started" &&
      responsePhaseRef.current === "awaiting-child"
    ) {
      hasSpokenRef.current = true;
      setRoomState("listening");
      clearWatchdog();
    }
    if (
      event.type === "input_audio_buffer.speech_stopped" &&
      responsePhaseRef.current === "awaiting-child"
    ) {
      setRoomState("thinking");
      startWatchdog();
    }
    if (
      event.type === "input_audio_buffer.committed" &&
      responsePhaseRef.current === "awaiting-child" &&
      !tipRequestedRef.current
    ) {
      startTipRequestFlow();
    }
    if (
      event.type === "conversation.item.input_audio_transcription.completed"
    ) {
      const transcript_0 = String(event.transcript ?? "").trim();
      if (transcript_0 && !childTranscriptRecordedRef.current) {
        childTranscriptRecordedRef.current = true;
        lastTranscriptRef.current = transcript_0;
        setAttempts(1);
      }
      if (awaitingTranscriptRef.current && transcript_0) {
        awaitingTranscriptRef.current = false;
        if (transcriptFallbackRef.current !== null) {
          clearTimeout(transcriptFallbackRef.current);
          transcriptFallbackRef.current = null;
        }
        sendTipRequest(transcript_0);
      }
    }
    if (event.type === "response.output_audio.delta") {
      setRoomState("speaking");
      if (responsePhaseRef.current === "tip") setTipStarted(true);
      startWatchdog();
    }
    if (event.type === "response.output_audio_transcript.delta") {
      const delta_0 = String(event.delta ?? "");
      addAssistantDelta(delta_0);
    }
    if (event.type === "response.output_audio_transcript.done") {
      const transcript_1 = String(
        event.transcript ?? assistantDraftRef.current,
      ).trim();
      if (responsePhaseRef.current === "tip" && transcript_1) {
        setCoachingTip(transcript_1);
        lastTipTextRef.current = transcript_1;
      }
      assistantDraftRef.current = "";
    }
    if (event.type === "response.done") {
      clearWatchdog();
      if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
      if (responsePhaseRef.current === "model") {
        currentChunkRef.current += 1;
        if (currentChunkRef.current < modelChunksRef.current.length) {
          setTimeout(() => {
            if (channelRef.current?.readyState === "open") {
              sendModelChunk(channelRef.current);
            }
          }, 400);
        } else {
          responsePhaseRef.current = "awaiting-child";
          localStreamRef.current?.getAudioTracks().forEach((track_0) => {
            track_0.enabled = true;
          });
          setMicMuted(false);
          setIsModeling(false);
          setRoomState("ready");
        }
      } else if (responsePhaseRef.current === "tip") {
        responsePhaseRef.current = "complete";
        const transcript_2 = lastTranscriptRef.current;
        if (transcript_2) submitTranscript(transcript_2);
        const tipText = lastTipTextRef.current;
        const wordCount = tipText ? tipText.split(/\s+/).length : 0;
        const estimatedMs =
          Math.max(3000, Math.round(wordCount * 0.5 * 1000)) + 2000;
        waitingForTipEndRef.current = true;
        setTimeout(() => {
          if (waitingForTipEndRef.current) {
            waitingForTipEndRef.current = false;
            closeVoiceRoom("complete");
          }
        }, estimatedMs);
      }
    }
    if (event.type === "error") {
      const code = String(event.error?.code ?? "");
      const benignCodes = new Set([
        "response_cancel_not_active",
        "input_audio_buffer_commit_empty",
        "conversation_already_has_active_response",
      ]);
      // eslint-disable-next-line no-console
      console.error("Realtime error event:", event);
      if (benignCodes.has(code)) return;
      clearWatchdog();
      if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
      setError("Noah missed that turn. Please try once more.");
      setRoomState("error");
    }
  };
  const sendContext = (channel, item_0 = practice) => {
    responsePhaseRef.current = "model";
    tipRequestedRef.current = false;
    childTranscriptRecordedRef.current = false;
    hasSpokenRef.current = false;
    lastTranscriptRef.current = "";
    awaitingTranscriptRef.current = false;
    if (transcriptFallbackRef.current !== null) {
      clearTimeout(transcriptFallbackRef.current);
      transcriptFallbackRef.current = null;
    }
    waitingForTipEndRef.current = false;
    assistantDraftRef.current = "";
    lastTipTextRef.current = "";
    modelChunksRef.current = [];
    currentChunkRef.current = 0;
    setCoachingTip("");
    setTipStarted(false);
    setAttempts(0);
    localStreamRef.current?.getAudioTracks().forEach((track_1) => {
      track_1.enabled = false;
    });
    setMicMuted(true);
    startWatchdog();
    const mode = startModeRef.current;
    const contextText =
      mode === "instructions-only"
        ? `The selected ${item_0.kind.toLowerCase()} is titled “${item_0.title}”. The child will read it aloud themselves. Do NOT read the piece. Only give 1-2 short sentences of warm encouragement and one quick reminder about expression or pacing, then say “Your turn.”`
        : `The selected ${item_0.kind.toLowerCase()} is titled “${item_0.title}”. The full practice piece is:\n\n${item_0.text}`;
    channel.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: contextText,
            },
          ],
        },
      }),
    );
    if (mode === "instructions-only") {
      setIsModeling(false);
      modelChunksRef.current = [];
      currentChunkRef.current = 0;
      channel.send(
        JSON.stringify({
          type: "response.create",
          response: {
            instructions:
              "Give brief, friendly instructions to the child and end with ‘Your turn.’ Do not read or repeat the practice piece yourself.",
            max_output_tokens: 1024,
            metadata: {
              response_purpose: "instructions_only",
            },
          },
        }),
      );
    } else {
      setIsModeling(true);
      const chunks = item_0.text
        .split(/\n\n+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
      modelChunksRef.current = chunks;
      currentChunkRef.current = 0;
      sendModelChunk(channel);
    }
  };
  const sendModelChunk = (channel_0) => {
    const chunks_0 = modelChunksRef.current;
    const index = currentChunkRef.current;
    if (!chunks_0.length || index >= chunks_0.length) {
      responsePhaseRef.current = "awaiting-child";
      localStreamRef.current?.getAudioTracks().forEach((track_2) => {
        track_2.enabled = true;
      });
      setMicMuted(false);
      setRoomState("ready");
      return;
    }
    const isLast = index === chunks_0.length - 1;
    const chunkText = chunks_0[index];
    const prompt = isLast
      ? `Model this final part with clear, natural expression, then say only "Your turn." Do not give feedback or a tip yet. Part: "${chunkText}"`
      : `Model this part with clear, natural expression. Do not say "Your turn" yet and do not give feedback. Part: "${chunkText}"`;
    channel_0.send(
      JSON.stringify({
        type: "response.create",
        response: {
          instructions: prompt,
          max_output_tokens: 4096,
          metadata: {
            response_purpose: "model_practice_chunk",
          },
        },
      }),
    );
  };
  const connect = async (mode_0 = "hear-noah") => {
    setError("");
    setCoachingTip("");
    setTipStarted(false);
    setIsModeling(false);
    setAttempts(0);
    startModeRef.current = mode_0;
    responsePhaseRef.current = "idle";
    tipRequestedRef.current = false;
    childTranscriptRecordedRef.current = false;
    hasSpokenRef.current = false;
    lastTranscriptRef.current = "";
    awaitingTranscriptRef.current = false;
    if (transcriptFallbackRef.current !== null) {
      clearTimeout(transcriptFallbackRef.current);
      transcriptFallbackRef.current = null;
    }
    waitingForTipEndRef.current = false;
    assistantDraftRef.current = "";
    lastTipTextRef.current = "";
    modelChunksRef.current = [];
    currentChunkRef.current = 0;
    setRoomState("connecting");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Microphone is not available. Please use HTTPS or localhost.",
        );
      }
      const stream_0 = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      localStreamRef.current = stream_0;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream_0.getTracks().forEach((track_3) => {
        peer.addTrack(track_3, stream_0);
      });
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.onended = () => {
        if (waitingForTipEndRef.current) {
          waitingForTipEndRef.current = false;
          closeVoiceRoom("complete");
        }
      };
      audioRef.current = audio;
      peer.ontrack = ({ streams }) => {
        audio.srcObject = streams[0];
        audio.muted = speakerMuted;
        startLipSync(streams[0]);
      };
      const channel_1 = peer.createDataChannel("oai-events");
      channelRef.current = channel_1;
      channel_1.addEventListener("message", (message) => {
        try {
          handleEvent(JSON.parse(message.data));
        } catch {
          /* ignore malformed events */
        }
      });
      channel_1.addEventListener("open", () => {
        setRoomState("ready");
        sendContext(channel_1);
      });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const response = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          "ngrok-skip-browser-warning": "true",
        },
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
      console.error("Connection error:", reason);
      disconnect();
      setRoomState("error");
      const msg =
        reason instanceof Error ? reason.message : "Could not connect to Noah.";
      const hint =
        msg.includes("Permission") || msg.includes("NotAllowed")
          ? " — please allow microphone access for this site"
          : "";
      setError(msg + hint);
    }
  };
  const switchPractice = (id) => {
    setPracticeId(id);
    setOpenKind(PRACTICES.find((item_1) => item_1.id === id)?.kind ?? openKind);
    setAttempts(0);
    setCoachingTip("");
    setTipStarted(false);
    setIsModeling(false);
    responsePhaseRef.current = "idle";
    tipRequestedRef.current = false;
    childTranscriptRecordedRef.current = false;
    hasSpokenRef.current = false;
    lastTranscriptRef.current = "";
    awaitingTranscriptRef.current = false;
    if (transcriptFallbackRef.current !== null) {
      clearTimeout(transcriptFallbackRef.current);
      transcriptFallbackRef.current = null;
    }
    waitingForTipEndRef.current = false;
    assistantDraftRef.current = "";
    lastTipTextRef.current = "";
    modelChunksRef.current = [];
    currentChunkRef.current = 0;
    const next = PRACTICES.find((item_2) => item_2.id === id) ?? PRACTICES[0];
    if (connected && channelRef.current?.readyState === "open") {
      sendContext(channelRef.current, next);
      setRoomState("thinking");
    }
  };
  const toggleMic = () => {
    if (responsePhaseRef.current !== "awaiting-child") return;
    const next_0 = !micMuted;
    localStreamRef.current?.getAudioTracks().forEach((track_4) => {
      track_4.enabled = !next_0;
    });
    setMicMuted(next_0);
  };
  const startTipRequestFlow = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[startTipRequestFlow]": () => {
        tipRequestedRef.current = true;
        responsePhaseRef.current = "tip";
        localStreamRef.current?.getAudioTracks().forEach(
          {
            "SpeakingStudio.useCallback[startTipRequestFlow]": (track_5) => {
              track_5.enabled = false;
            },
          }["SpeakingStudio.useCallback[startTipRequestFlow]"],
        );
        setMicMuted(true);
        setRoomState("thinking");
        setTipStarted(true);
        startWatchdog();
        awaitingTranscriptRef.current = true;
        if (transcriptFallbackRef.current !== null)
          clearTimeout(transcriptFallbackRef.current);
        transcriptFallbackRef.current = setTimeout(
          {
            "SpeakingStudio.useCallback[startTipRequestFlow]": () => {
              if (awaitingTranscriptRef.current) {
                awaitingTranscriptRef.current = false;
                sendTipRequest(
                  lastTranscriptRef.current || "(transcript not yet available)",
                );
              }
            },
          }["SpeakingStudio.useCallback[startTipRequestFlow]"],
          1500,
        );
      },
    }["SpeakingStudio.useCallback[startTipRequestFlow]"],
    [sendTipRequest, startWatchdog],
  );
  const fetchNoahAudio = async (text) => {
    const response = await fetch("/api/speak-english/voice", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
    });
    if (!response.ok) throw new Error("Noah could not prepare the audio.");
    return response.blob();
  };
  const speechChunks = (text) => {
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)?/g) ?? [text];
    const chunks = [];
    let current = "";
    for (const sentence of sentences) {
      if (current && current.length + sentence.length > 180) {
        chunks.push(current.trim());
        current = "";
      }
      current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  };
  const playNoahAudio = async (audioBlob) => {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.muted = speakerMuted;
    audioRef.current = audio;
    await new Promise((resolve, reject) => {
      const poses = ["soft", "narrow", "round", "open"];
      let poseIndex = 0;
      const mouthTimer = window.setInterval(() => {
        if (avatarRef.current) {
          avatarRef.current.dataset.mouth = poses[poseIndex % poses.length];
          poseIndex += 1;
        }
      }, 110);
      const stopMouth = () => {
        clearInterval(mouthTimer);
        if (avatarRef.current) avatarRef.current.dataset.mouth = "closed";
      };
      audio.onended = () => {
        stopMouth();
        resolve();
      };
      audio.onpause = () => {
        stopMouth();
        resolve();
      };
      audio.onerror = () => {
        stopMouth();
        reject(new Error("Noah's audio could not play."));
      };
      audio.play().catch(reject);
    });
    URL.revokeObjectURL(url);
  };
  const startPractice = async (mode) => {
    setError("");
    setCoachingTip("");
    setTipStarted(false);
    setAttempts(0);
    setIsModeling(mode === "hear-noah");
    responsePhaseRef.current = "model";
    setRoomState("connecting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
      setMicMuted(true);
      setRoomState("speaking");
      const spokenText =
        mode === "hear-noah"
          ? practice.text
          : `You will read ${practice.title}. Take your time, speak clearly, and pause at full stops. Your turn.`;
      const chunks = speechChunks(spokenText);
      const firstAudio = await fetchNoahAudio(chunks[0]);
      const queuedAudio = chunks.slice(1).map(fetchNoahAudio);
      await playNoahAudio(firstAudio);
      for (const audioJob of queuedAudio) {
        if (responsePhaseRef.current !== "model") break;
        await playNoahAudio(await audioJob);
        if (responsePhaseRef.current !== "model") break;
      }
      setIsModeling(false);
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRoomState("thinking");
        setMicMuted(true);
        try {
          const audio = new Blob(recordingChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          const form = new FormData();
          form.set("audio", audio, "practice.webm");
          form.set("targetText", practice.text);
          const feedbackResponse = await fetch("/api/speak-english/feedback", {
            method: "POST",
            body: form,
          });
          const result = await feedbackResponse.json();
          if (!feedbackResponse.ok)
            throw new Error(
              result.error || "Noah could not review that recording.",
            );
          setAttempts(1);
          setCoachingTip(result.feedback);
          lastTipTextRef.current = result.feedback;
          if (result.transcript) submitTranscript(result.transcript);
          setRoomState("speaking");
          await playNoahAudio(
            await fetchNoahAudio(`Noah's one tip. ${result.feedback}`),
          );
          setRoomState("complete");
        } catch (reason) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Noah could not review that recording.",
          );
          setRoomState("error");
        } finally {
          stream.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
          recorderRef.current = null;
        }
      };
      recorder.start();
      responsePhaseRef.current = "awaiting-child";
      setMicMuted(false);
      setRoomState("ready");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Noah could not start the microphone.",
      );
      setRoomState("error");
    }
  };
  const finishReading = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.stop();
  };
  const skipModel = (0, React.useCallback)(
    {
      "SpeakingStudio.useCallback[skipModel]": () => {
        if (responsePhaseRef.current !== "model") return;
        audioRef.current?.pause();
        channelRef.current?.send(
          JSON.stringify({
            type: "response.cancel",
          }),
        );
        responsePhaseRef.current = "awaiting-child";
        currentChunkRef.current = modelChunksRef.current.length;
        localStreamRef.current?.getAudioTracks().forEach(
          {
            "SpeakingStudio.useCallback[skipModel]": (track_6) => {
              track_6.enabled = true;
            },
          }["SpeakingStudio.useCallback[skipModel]"],
        );
        setMicMuted(false);
        setIsModeling(false);
        setRoomState("ready");
      },
    }["SpeakingStudio.useCallback[skipModel]"],
    [],
  );
  const toggleSpeaker = () => {
    const next_1 = !speakerMuted;
    if (audioRef.current) audioRef.current.muted = next_1;
    setSpeakerMuted(next_1);
  };
  return /*#__PURE__*/ (0, jsx)(
    "main",
    {
      className: "speaking-app",
      children: [
        /*#__PURE__*/ (0, jsx)(
          "header",
          {
            className: "studio-header",
            children: [
              /*#__PURE__*/ (0, jsx)(
                "div",
                {
                  className: "brand-lockup",
                  children: [
                    /*#__PURE__*/ (0, jsx)(
                      Link,
                      {
                        href: "/",
                        className: "back-button",
                        "aria-label": "Back to Noah home",
                        children: /*#__PURE__*/ (0, jsx)(
                          ArrowLeft,
                          {
                            size: 18,
                          },
                          void 0,
                          false,
                          {
                            fileName:
                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                            lineNumber: 724,
                            columnNumber: 13,
                          },
                          this,
                        ),
                      },
                      void 0,
                      false,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 723,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        className: "noah-mark",
                        children: /*#__PURE__*/ (0, jsx)(
                          Sparkles,
                          {
                            size: 18,
                          },
                          void 0,
                          false,
                          {
                            fileName:
                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                            lineNumber: 727,
                            columnNumber: 13,
                          },
                          this,
                        ),
                      },
                      void 0,
                      false,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 726,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        children: [
                          /*#__PURE__*/ (0, jsx)(
                            "strong",
                            {
                              children: "Noah 2.0",
                            },
                            void 0,
                            false,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 730,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "span",
                            {
                              children: "Speaking room",
                            },
                            void 0,
                            false,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 731,
                              columnNumber: 13,
                            },
                            this,
                          ),
                        ],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 729,
                        columnNumber: 11,
                      },
                      this,
                    ),
                  ],
                },
                void 0,
                true,
                {
                  fileName:
                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                  lineNumber: 722,
                  columnNumber: 9,
                },
                this,
              ),
              /*#__PURE__*/ (0, jsx)(
                "div",
                {
                  className: "header-progress",
                  children: [
                    /*#__PURE__*/ (0, jsx)(
                      "span",
                      {
                        children: "Today's practice",
                      },
                      void 0,
                      false,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 735,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        children: /*#__PURE__*/ (0, jsx)(
                          "i",
                          {
                            style: {
                              width: `${Math.min(100, 33 + attempts * 34)}%`,
                            },
                          },
                          void 0,
                          false,
                          {
                            fileName:
                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                            lineNumber: 737,
                            columnNumber: 13,
                          },
                          this,
                        ),
                      },
                      void 0,
                      false,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 736,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "strong",
                      {
                        children: [Math.min(100, 33 + attempts * 34), "%"],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 741,
                        columnNumber: 11,
                      },
                      this,
                    ),
                  ],
                },
                void 0,
                true,
                {
                  fileName:
                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                  lineNumber: 734,
                  columnNumber: 9,
                },
                this,
              ),
              /*#__PURE__*/ (0, jsx)(
                "div",
                {
                  className: "streak-pill",
                  children: [
                    /*#__PURE__*/ (0, jsx)(
                      Flame,
                      {
                        size: 15,
                        fill: "currentColor",
                      },
                      void 0,
                      false,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 744,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "strong",
                      {
                        children: [streak, " day streak"],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 745,
                        columnNumber: 11,
                      },
                      this,
                    ),
                  ],
                },
                void 0,
                true,
                {
                  fileName:
                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                  lineNumber: 743,
                  columnNumber: 9,
                },
                this,
              ),
            ],
          },
          void 0,
          true,
          {
            fileName:
              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
            lineNumber: 721,
            columnNumber: 7,
          },
          this,
        ),
        /*#__PURE__*/ (0, jsx)(
          "div",
          {
            className: "studio-shell",
            children: [
              /*#__PURE__*/ (0, jsx)(
                "aside",
                {
                  className: "practice-rail",
                  "aria-label": "Speaking practices",
                  children: [
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        className: "rail-heading",
                        children: [
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    children: "Practice library",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 753,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "h2",
                                  {
                                    children: "Choose a lesson",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 754,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 752,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            BookOpen,
                            {
                              size: 19,
                            },
                            void 0,
                            false,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 756,
                              columnNumber: 13,
                            },
                            this,
                          ),
                        ],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 751,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        className: "practice-list",
                        children: PRACTICE_KINDS.map((kind) => {
                          const items = PRACTICES.filter(
                            (item_3) => item_3.kind === kind,
                          );
                          const isOpen = openKind === kind;
                          const kindIcon = items[0]?.icon ?? "📘";
                          return /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className: "practice-group",
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "button",
                                  {
                                    type: "button",
                                    className: `practice-category ${isOpen ? "open" : ""} ${practice.kind === kind ? "active" : ""}`,
                                    onClick: () =>
                                      setOpenKind(isOpen ? null : kind),
                                    "aria-expanded": isOpen,
                                    children: [
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          className: "practice-icon",
                                          children: kindIcon,
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 765,
                                          columnNumber: 21,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          className: "practice-copy",
                                          children: [
                                            /*#__PURE__*/ (0, jsx)(
                                              "strong",
                                              {
                                                children: [kind, "s"],
                                              },
                                              void 0,
                                              true,
                                              {
                                                fileName:
                                                  "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                lineNumber: 767,
                                                columnNumber: 23,
                                              },
                                              this,
                                            ),
                                            /*#__PURE__*/ (0, jsx)(
                                              "em",
                                              {
                                                children: [
                                                  items.length,
                                                  " lessons",
                                                ],
                                              },
                                              void 0,
                                              true,
                                              {
                                                fileName:
                                                  "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                lineNumber: 768,
                                                columnNumber: 23,
                                              },
                                              this,
                                            ),
                                          ],
                                        },
                                        void 0,
                                        true,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 766,
                                          columnNumber: 21,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        ChevronDown,
                                        {
                                          size: 18,
                                          className: "category-chevron",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 770,
                                          columnNumber: 21,
                                        },
                                        this,
                                      ),
                                    ],
                                  },
                                  void 0,
                                  true,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 764,
                                    columnNumber: 19,
                                  },
                                  this,
                                ),
                                isOpen &&
                                  /*#__PURE__*/ (0, jsx)(
                                    "div",
                                    {
                                      className: "practice-options",
                                      children: items.map((item_4) =>
                                        /*#__PURE__*/ (0, jsx)(
                                          "button",
                                          {
                                            type: "button",
                                            className: `practice-card ${practiceId === item_4.id ? "active" : ""}`,
                                            onClick: () =>
                                              switchPractice(item_4.id),
                                            style: {
                                              "--practice-color": item_4.color,
                                            },
                                            children: [
                                              /*#__PURE__*/ (0, jsx)(
                                                "span",
                                                {
                                                  className: "practice-icon",
                                                  children: item_4.icon,
                                                },
                                                void 0,
                                                false,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 776,
                                                  columnNumber: 27,
                                                },
                                                this,
                                              ),
                                              /*#__PURE__*/ (0, jsx)(
                                                "span",
                                                {
                                                  className: "practice-copy",
                                                  children: [
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "small",
                                                      {
                                                        children: [
                                                          item_4.kind,
                                                          " · ",
                                                          item_4.duration,
                                                        ],
                                                      },
                                                      void 0,
                                                      true,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 778,
                                                        columnNumber: 29,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "strong",
                                                      {
                                                        children: item_4.title,
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 781,
                                                        columnNumber: 29,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "em",
                                                      {
                                                        children: item_4.level,
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 782,
                                                        columnNumber: 29,
                                                      },
                                                      this,
                                                    ),
                                                  ],
                                                },
                                                void 0,
                                                true,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 777,
                                                  columnNumber: 27,
                                                },
                                                this,
                                              ),
                                              /*#__PURE__*/ (0, jsx)(
                                                ChevronRight,
                                                {
                                                  size: 18,
                                                },
                                                void 0,
                                                false,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 784,
                                                  columnNumber: 27,
                                                },
                                                this,
                                              ),
                                            ],
                                          },
                                          item_4.id,
                                          true,
                                          {
                                            fileName:
                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                            lineNumber: 773,
                                            columnNumber: 44,
                                          },
                                          this,
                                        ),
                                      ),
                                    },
                                    void 0,
                                    false,
                                    {
                                      fileName:
                                        "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                      lineNumber: 772,
                                      columnNumber: 30,
                                    },
                                    this,
                                  ),
                              ],
                            },
                            kind,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 763,
                              columnNumber: 20,
                            },
                            this,
                          );
                        }),
                      },
                      void 0,
                      false,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 758,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        className: "mini-challenge",
                        children: [
                          /*#__PURE__*/ (0, jsx)(
                            "span",
                            {
                              className: "challenge-star",
                              children: /*#__PURE__*/ (0, jsx)(
                                Star,
                                {
                                  size: 18,
                                  fill: "currentColor",
                                },
                                void 0,
                                false,
                                {
                                  fileName:
                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                  lineNumber: 792,
                                  columnNumber: 15,
                                },
                                this,
                              ),
                            },
                            void 0,
                            false,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 791,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "small",
                                  {
                                    children: "DAILY CHALLENGE",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 795,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "strong",
                                  {
                                    children: "Use a brave, clear voice",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 796,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    children: "+20 sparkle points",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 797,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 794,
                              columnNumber: 13,
                            },
                            this,
                          ),
                        ],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 790,
                        columnNumber: 11,
                      },
                      this,
                    ),
                  ],
                },
                void 0,
                true,
                {
                  fileName:
                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                  lineNumber: 750,
                  columnNumber: 9,
                },
                this,
              ),
              /*#__PURE__*/ (0, jsx)(
                "section",
                {
                  className: "practice-workspace",
                  children: [
                    /*#__PURE__*/ (0, jsx)(
                      "div",
                      {
                        className: "workspace-heading",
                        children: [
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    className: "workspace-eyebrow",
                                    children: [
                                      /*#__PURE__*/ (0, jsx)(
                                        Sparkles,
                                        {
                                          size: 14,
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 806,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      " English speaking practice",
                                    ],
                                  },
                                  void 0,
                                  true,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 805,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "h1",
                                  {
                                    children: "Build a brave speaking voice.",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 808,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "p",
                                  {
                                    children:
                                      "Listen to Noah, read the piece aloud, and get one clear tip.",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 809,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 804,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className: "lesson-count",
                              children: [
                                "Lesson ",
                                PRACTICES.findIndex(
                                  (item_5) => item_5.id === practiceId,
                                ) + 1,
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    children: ["of ", PRACTICES.length],
                                  },
                                  void 0,
                                  true,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 815,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 813,
                              columnNumber: 13,
                            },
                            this,
                          ),
                        ],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 803,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "section",
                      {
                        className: "flow-steps",
                        "aria-label": "Practice steps",
                        children: [
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className:
                                connected || attempts > 0 ? "done" : "active",
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    children:
                                      connected || attempts > 0
                                        ? /*#__PURE__*/ (0, jsx)(
                                            Check,
                                            {},
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 821,
                                              columnNumber: 50,
                                            },
                                            this,
                                          )
                                        : "1",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 821,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "strong",
                                  {
                                    children: "Meet Noah",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 822,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 820,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "i",
                            {},
                            void 0,
                            false,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 824,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className:
                                connected && attempts === 0
                                  ? "active"
                                  : attempts > 0
                                    ? "done"
                                    : "",
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    children:
                                      attempts > 0
                                        ? /*#__PURE__*/ (0, jsx)(
                                            Check,
                                            {},
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 826,
                                              columnNumber: 37,
                                            },
                                            this,
                                          )
                                        : "2",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 826,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "strong",
                                  {
                                    children: "Read aloud",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 827,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 825,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "i",
                            {},
                            void 0,
                            false,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 829,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className: coachingTip
                                ? "done"
                                : tipStarted || attempts > 0
                                  ? "active"
                                  : "",
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "span",
                                  {
                                    children: coachingTip
                                      ? /*#__PURE__*/ (0, jsx)(
                                          Check,
                                          {},
                                          void 0,
                                          false,
                                          {
                                            fileName:
                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                            lineNumber: 831,
                                            columnNumber: 36,
                                          },
                                          this,
                                        )
                                      : "3",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 831,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "strong",
                                  {
                                    children: "Get a tip",
                                  },
                                  void 0,
                                  false,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 832,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 830,
                              columnNumber: 13,
                            },
                            this,
                          ),
                        ],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 819,
                        columnNumber: 11,
                      },
                      this,
                    ),
                    /*#__PURE__*/ (0, jsx)(
                      "article",
                      {
                        className: `stage-card state-${roomState}`,
                        children: [
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className: "stage-visual",
                              children: [
                                /*#__PURE__*/ (0, jsx)(
                                  "div",
                                  {
                                    className: "stage-topline",
                                    children: [
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          className: `live-dot ${connected ? "connected" : ""}`,
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 839,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          children: connected
                                            ? "NOAH IS LIVE"
                                            : "YOUR SPEAKING BUDDY",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 840,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                    ],
                                  },
                                  void 0,
                                  true,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 838,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "div",
                                  {
                                    className: "avatar-orbit",
                                    children: [
                                      /*#__PURE__*/ (0, jsx)(
                                        "div",
                                        {
                                          className: "orbit-ring ring-one",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 845,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "div",
                                        {
                                          className: "orbit-ring ring-two",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 846,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "div",
                                        {
                                          className: "avatar-frame",
                                          "data-mouth": "closed",
                                          ref: avatarRef,
                                          children: /*#__PURE__*/ (0, jsx)(
                                            "div",
                                            {
                                              className: "avatar-art",
                                              children: [
                                                /*#__PURE__*/ (0, jsx)(
                                                  Image,
                                                  {
                                                    src: "/avatar/avatar-base.png",
                                                    alt: "Noah, a friendly white and blue robot speaking coach",
                                                    width: 430,
                                                    height: 430,
                                                    className: "avatar-base",
                                                    priority: true,
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 849,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "div",
                                                  {
                                                    className: "mouth-window",
                                                    "aria-hidden": "true",
                                                    children: [
                                                      "soft",
                                                      "narrow",
                                                      "round",
                                                      "open",
                                                    ].map((pose) =>
                                                      /*#__PURE__*/ (0, jsx)(
                                                        Image,
                                                        {
                                                          src: `/avatar/mouth-${pose}.png`,
                                                          alt: "",
                                                          width: 220,
                                                          height: 130,
                                                          className: `mouth-pose mouth-${pose}`,
                                                        },
                                                        pose,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 851,
                                                          columnNumber: 83,
                                                        },
                                                        this,
                                                      ),
                                                    ),
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 850,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 848,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 847,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          className: "sparkle sparkle-a",
                                          children: "✦",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 855,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          className: "sparkle sparkle-b",
                                          children: "✦",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 856,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "span",
                                        {
                                          className: "sparkle sparkle-c",
                                          children: "•",
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 857,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                    ],
                                  },
                                  void 0,
                                  true,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 844,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                                /*#__PURE__*/ (0, jsx)(
                                  "div",
                                  {
                                    className: "status-copy",
                                    "aria-live": "polite",
                                    children: [
                                      /*#__PURE__*/ (0, jsx)(
                                        "h2",
                                        {
                                          children: statusTitle,
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 860,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                      /*#__PURE__*/ (0, jsx)(
                                        "p",
                                        {
                                          children: statusSub,
                                        },
                                        void 0,
                                        false,
                                        {
                                          fileName:
                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                          lineNumber: 861,
                                          columnNumber: 17,
                                        },
                                        this,
                                      ),
                                    ],
                                  },
                                  void 0,
                                  true,
                                  {
                                    fileName:
                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                    lineNumber: 859,
                                    columnNumber: 15,
                                  },
                                  this,
                                ),
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 837,
                              columnNumber: 13,
                            },
                            this,
                          ),
                          /*#__PURE__*/ (0, jsx)(
                            "div",
                            {
                              className: "stage-content",
                              children: [
                                coachingTip
                                  ? /*#__PURE__*/ (0, jsx)(
                                      "section",
                                      {
                                        className: "tip-result-panel",
                                        "aria-live": "polite",
                                        children: [
                                          /*#__PURE__*/ (0, jsx)(
                                            "span",
                                            {
                                              className: "tip-result-icon",
                                              children: /*#__PURE__*/ (0, jsx)(
                                                CircleCheck,
                                                {
                                                  size: 28,
                                                },
                                                void 0,
                                                false,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 868,
                                                  columnNumber: 21,
                                                },
                                                this,
                                              ),
                                            },
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 867,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "span",
                                            {
                                              className: "tip-result-eyebrow",
                                              children: "Practice complete",
                                            },
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 870,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "h2",
                                            {
                                              children: "Noah's one tip",
                                            },
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 871,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "p",
                                            {
                                              children: coachingTip,
                                            },
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 872,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "span",
                                            {
                                              className: "tip-result-note",
                                              children:
                                                "Use this one idea in your next practice.",
                                            },
                                            void 0,
                                            false,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 873,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "button",
                                            {
                                              type: "button",
                                              className: "tip-result-restart",
                                              onClick: () => {
                                                setCoachingTip("");
                                                setTipStarted(false);
                                                setShowStartOptions(true);
                                              },
                                              children: [
                                                /*#__PURE__*/ (0, jsx)(
                                                  Mic,
                                                  {
                                                    size: 18,
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 881,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                " Practise this line again",
                                                /*#__PURE__*/ (0, jsx)(
                                                  ChevronRight,
                                                  {
                                                    size: 18,
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 882,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 876,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                        ],
                                      },
                                      void 0,
                                      true,
                                      {
                                        fileName:
                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                        lineNumber: 866,
                                        columnNumber: 30,
                                      },
                                      this,
                                    )
                                  : /*#__PURE__*/ (0, jsx)(
                                      "div",
                                      {
                                        className: "script-card",
                                        children: [
                                          /*#__PURE__*/ (0, jsx)(
                                            "div",
                                            {
                                              className: "script-label",
                                              children: [
                                                /*#__PURE__*/ (0, jsx)(
                                                  "span",
                                                  {
                                                    style: {
                                                      background: `${practice.color}18`,
                                                      color: practice.color,
                                                    },
                                                    children: practice.icon,
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 886,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "div",
                                                  {
                                                    children: [
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "small",
                                                        {
                                                          children: [
                                                            practice.kind,
                                                            " · ",
                                                            practice.duration,
                                                          ],
                                                        },
                                                        void 0,
                                                        true,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 893,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "strong",
                                                        {
                                                          children:
                                                            practice.title,
                                                        },
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 896,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                    ],
                                                  },
                                                  void 0,
                                                  true,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 892,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    onClick: () => {
                                                      if (!channelRef.current)
                                                        return;
                                                      startModeRef.current =
                                                        "hear-noah";
                                                      sendContext(
                                                        channelRef.current,
                                                      );
                                                    },
                                                    disabled: !connected,
                                                    children: [
                                                      /*#__PURE__*/ (0, jsx)(
                                                        Play,
                                                        {
                                                          size: 16,
                                                          fill: "currentColor",
                                                        },
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 903,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                      " Hear Noah",
                                                    ],
                                                  },
                                                  void 0,
                                                  true,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 898,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 885,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "blockquote",
                                            {
                                              children: [
                                                "“",
                                                practice.text,
                                                "”",
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 906,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "div",
                                            {
                                              className: "coach-tip",
                                              "aria-live": "polite",
                                              children: [
                                                /*#__PURE__*/ (0, jsx)(
                                                  Sparkles,
                                                  {
                                                    size: 16,
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 908,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "span",
                                                  {
                                                    children: [
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "strong",
                                                        {
                                                          children:
                                                            "Before you start:",
                                                        },
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 910,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                      " ",
                                                      practice.tip,
                                                    ],
                                                  },
                                                  void 0,
                                                  true,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 909,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 907,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                        ],
                                      },
                                      void 0,
                                      true,
                                      {
                                        fileName:
                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                        lineNumber: 884,
                                        columnNumber: 30,
                                      },
                                      this,
                                    ),
                                connected
                                  ? /*#__PURE__*/ (0, jsx)(
                                      "div",
                                      {
                                        className: "voice-controls",
                                        children: [
                                          /*#__PURE__*/ (0, jsx)(
                                            "div",
                                            {
                                              className: "listening-note",
                                              children: [
                                                /*#__PURE__*/ (0, jsx)(
                                                  "span",
                                                  {
                                                    className: "listening-wave",
                                                    children: [
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "i",
                                                        {},
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 918,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "i",
                                                        {},
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 919,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "i",
                                                        {},
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 920,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                    ],
                                                  },
                                                  void 0,
                                                  true,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 917,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "span",
                                                  {
                                                    children: [
                                                      /*#__PURE__*/ (0, jsx)(
                                                        "strong",
                                                        {
                                                          children: micMuted
                                                            ? "Microphone is paused"
                                                            : "Microphone is on",
                                                        },
                                                        void 0,
                                                        false,
                                                        {
                                                          fileName:
                                                            "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                          lineNumber: 923,
                                                          columnNumber: 23,
                                                        },
                                                        this,
                                                      ),
                                                      micMuted
                                                        ? "Listen to Noah’s line"
                                                        : "Read whenever you are ready",
                                                    ],
                                                  },
                                                  void 0,
                                                  true,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 922,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 916,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                          /*#__PURE__*/ (0, jsx)(
                                            "div",
                                            {
                                              className: "control-buttons",
                                              children: [
                                                isModeling
                                                  ? /*#__PURE__*/ (0, jsx)(
                                                      "button",
                                                      {
                                                        type: "button",
                                                        onClick: skipModel,
                                                        className:
                                                          "skip-button",
                                                        "aria-label":
                                                          "Skip Noah and start reading",
                                                        title:
                                                          "Skip Noah and start reading",
                                                        children:
                                                          "Skip to my turn",
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 930,
                                                        columnNumber: 35,
                                                      },
                                                      this,
                                                    )
                                                  : !micMuted &&
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "button",
                                                      {
                                                        type: "button",
                                                        onClick: finishReading,
                                                        className:
                                                          "finish-button",
                                                        "aria-label":
                                                          "Finish reading and get feedback",
                                                        title:
                                                          "Finish reading and get feedback",
                                                        children: "Finish",
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 932,
                                                        columnNumber: 48,
                                                      },
                                                      this,
                                                    ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    onClick: toggleMic,
                                                    className: micMuted
                                                      ? "muted"
                                                      : "",
                                                    disabled:
                                                      responsePhaseRef.current !==
                                                      "awaiting-child",
                                                    "aria-label": micMuted
                                                      ? "Turn microphone on"
                                                      : "Mute microphone",
                                                    title: micMuted
                                                      ? "Turn microphone on"
                                                      : "Mute microphone",
                                                    children: micMuted
                                                      ? /*#__PURE__*/ (0, jsx)(
                                                          MicOff,
                                                          {},
                                                          void 0,
                                                          false,
                                                          {
                                                            fileName:
                                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                            lineNumber: 936,
                                                            columnNumber: 35,
                                                          },
                                                          this,
                                                        )
                                                      : /*#__PURE__*/ (0, jsx)(
                                                          Mic,
                                                          {},
                                                          void 0,
                                                          false,
                                                          {
                                                            fileName:
                                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                            lineNumber: 936,
                                                            columnNumber: 48,
                                                          },
                                                          this,
                                                        ),
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 935,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    onClick: toggleSpeaker,
                                                    className: speakerMuted
                                                      ? "muted"
                                                      : "",
                                                    "aria-label": speakerMuted
                                                      ? "Turn sound on"
                                                      : "Mute Noah",
                                                    title: speakerMuted
                                                      ? "Turn sound on"
                                                      : "Mute Noah",
                                                    children: speakerMuted
                                                      ? /*#__PURE__*/ (0, jsx)(
                                                          VolumeX,
                                                          {},
                                                          void 0,
                                                          false,
                                                          {
                                                            fileName:
                                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                            lineNumber: 939,
                                                            columnNumber: 39,
                                                          },
                                                          this,
                                                        )
                                                      : /*#__PURE__*/ (0, jsx)(
                                                          Volume2,
                                                          {},
                                                          void 0,
                                                          false,
                                                          {
                                                            fileName:
                                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                            lineNumber: 939,
                                                            columnNumber: 53,
                                                          },
                                                          this,
                                                        ),
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 938,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                                /*#__PURE__*/ (0, jsx)(
                                                  "button",
                                                  {
                                                    type: "button",
                                                    onClick: disconnect,
                                                    className:
                                                      "disconnect-button",
                                                    "aria-label":
                                                      "End practice",
                                                    title: "End practice",
                                                    children: /*#__PURE__*/ (0,
                                                    jsx)(
                                                      Square,
                                                      {
                                                        size: 17,
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 942,
                                                        columnNumber: 23,
                                                      },
                                                      this,
                                                    ),
                                                  },
                                                  void 0,
                                                  false,
                                                  {
                                                    fileName:
                                                      "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                    lineNumber: 941,
                                                    columnNumber: 21,
                                                  },
                                                  this,
                                                ),
                                              ],
                                            },
                                            void 0,
                                            true,
                                            {
                                              fileName:
                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                              lineNumber: 929,
                                              columnNumber: 19,
                                            },
                                            this,
                                          ),
                                        ],
                                      },
                                      void 0,
                                      true,
                                      {
                                        fileName:
                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                        lineNumber: 915,
                                        columnNumber: 28,
                                      },
                                      this,
                                    )
                                  : coachingTip
                                    ? null
                                    : showStartOptions
                                      ? /*#__PURE__*/ (0, jsx)(
                                          "div",
                                          {
                                            className: "start-options",
                                            role: "group",
                                            "aria-label": "Choose how to begin",
                                            children: [
                                              /*#__PURE__*/ (0, jsx)(
                                                "div",
                                                {
                                                  className:
                                                    "start-options-heading",
                                                  children: [
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "strong",
                                                      {
                                                        children:
                                                          "How would you like to begin?",
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 947,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "span",
                                                      {
                                                        children:
                                                          "Choose the support that feels right for you.",
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 948,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                  ],
                                                },
                                                void 0,
                                                true,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 946,
                                                  columnNumber: 19,
                                                },
                                                this,
                                              ),
                                              /*#__PURE__*/ (0, jsx)(
                                                "button",
                                                {
                                                  type: "button",
                                                  className: "start-option",
                                                  onClick: () => {
                                                    setShowStartOptions(false);
                                                    startPractice("hear-noah");
                                                  },
                                                  children: [
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "span",
                                                      {
                                                        className:
                                                          "start-option-icon",
                                                        children:
                                                          /*#__PURE__*/ (0,
                                                          jsx)(
                                                            Volume2,
                                                            {
                                                              size: 18,
                                                            },
                                                            void 0,
                                                            false,
                                                            {
                                                              fileName:
                                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                              lineNumber: 955,
                                                              columnNumber: 23,
                                                            },
                                                            this,
                                                          ),
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 954,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "span",
                                                      {
                                                        children: [
                                                          /*#__PURE__*/ (0,
                                                          jsx)(
                                                            "strong",
                                                            {
                                                              children:
                                                                "Hear Noah first",
                                                            },
                                                            void 0,
                                                            false,
                                                            {
                                                              fileName:
                                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                              lineNumber: 958,
                                                              columnNumber: 23,
                                                            },
                                                            this,
                                                          ),
                                                          /*#__PURE__*/ (0,
                                                          jsx)(
                                                            "small",
                                                            {
                                                              children: [
                                                                "Noah reads the full ",
                                                                practice.kind.toLowerCase(),
                                                                " before your turn.",
                                                              ],
                                                            },
                                                            void 0,
                                                            true,
                                                            {
                                                              fileName:
                                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                              lineNumber: 959,
                                                              columnNumber: 23,
                                                            },
                                                            this,
                                                          ),
                                                        ],
                                                      },
                                                      void 0,
                                                      true,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 957,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      ChevronRight,
                                                      {
                                                        size: 18,
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 964,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                  ],
                                                },
                                                void 0,
                                                true,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 950,
                                                  columnNumber: 19,
                                                },
                                                this,
                                              ),
                                              /*#__PURE__*/ (0, jsx)(
                                                "button",
                                                {
                                                  type: "button",
                                                  className: "start-option",
                                                  onClick: () => {
                                                    setShowStartOptions(false);
                                                    startPractice(
                                                      "instructions-only",
                                                    );
                                                  },
                                                  children: [
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "span",
                                                      {
                                                        className:
                                                          "start-option-icon",
                                                        children:
                                                          /*#__PURE__*/ (0,
                                                          jsx)(
                                                            Mic,
                                                            {
                                                              size: 18,
                                                            },
                                                            void 0,
                                                            false,
                                                            {
                                                              fileName:
                                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                              lineNumber: 971,
                                                              columnNumber: 23,
                                                            },
                                                            this,
                                                          ),
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 970,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      "span",
                                                      {
                                                        children: [
                                                          /*#__PURE__*/ (0,
                                                          jsx)(
                                                            "strong",
                                                            {
                                                              children:
                                                                "Start reading now",
                                                            },
                                                            void 0,
                                                            false,
                                                            {
                                                              fileName:
                                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                              lineNumber: 974,
                                                              columnNumber: 23,
                                                            },
                                                            this,
                                                          ),
                                                          /*#__PURE__*/ (0,
                                                          jsx)(
                                                            "small",
                                                            {
                                                              children:
                                                                "Noah gives quick instructions, then it is your turn.",
                                                            },
                                                            void 0,
                                                            false,
                                                            {
                                                              fileName:
                                                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                              lineNumber: 975,
                                                              columnNumber: 23,
                                                            },
                                                            this,
                                                          ),
                                                        ],
                                                      },
                                                      void 0,
                                                      true,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 973,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                    /*#__PURE__*/ (0, jsx)(
                                                      ChevronRight,
                                                      {
                                                        size: 18,
                                                      },
                                                      void 0,
                                                      false,
                                                      {
                                                        fileName:
                                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                        lineNumber: 979,
                                                        columnNumber: 21,
                                                      },
                                                      this,
                                                    ),
                                                  ],
                                                },
                                                void 0,
                                                true,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 966,
                                                  columnNumber: 19,
                                                },
                                                this,
                                              ),
                                              /*#__PURE__*/ (0, jsx)(
                                                "button",
                                                {
                                                  type: "button",
                                                  className:
                                                    "start-options-back",
                                                  onClick: () =>
                                                    setShowStartOptions(false),
                                                  children: "Back",
                                                },
                                                void 0,
                                                false,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 981,
                                                  columnNumber: 19,
                                                },
                                                this,
                                              ),
                                            ],
                                          },
                                          void 0,
                                          true,
                                          {
                                            fileName:
                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                            lineNumber: 945,
                                            columnNumber: 66,
                                          },
                                          this,
                                        )
                                      : /*#__PURE__*/ (0, jsx)(
                                          "button",
                                          {
                                            type: "button",
                                            className: "connect-button",
                                            onClick: () =>
                                              setShowStartOptions(true),
                                            disabled:
                                              roomState === "connecting",
                                            children: [
                                              /*#__PURE__*/ (0, jsx)(
                                                Mic,
                                                {
                                                  size: 19,
                                                },
                                                void 0,
                                                false,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 985,
                                                  columnNumber: 19,
                                                },
                                                this,
                                              ),
                                              roomState === "connecting"
                                                ? "Connecting to Noah…"
                                                : coachingTip
                                                  ? "Practise this line again"
                                                  : "Start speaking practice",
                                              /*#__PURE__*/ (0, jsx)(
                                                ChevronRight,
                                                {
                                                  size: 18,
                                                },
                                                void 0,
                                                false,
                                                {
                                                  fileName:
                                                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                                  lineNumber: 987,
                                                  columnNumber: 19,
                                                },
                                                this,
                                              ),
                                            ],
                                          },
                                          void 0,
                                          true,
                                          {
                                            fileName:
                                              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                            lineNumber: 984,
                                            columnNumber: 26,
                                          },
                                          this,
                                        ),
                                error
                                  ? /*#__PURE__*/ (0, jsx)(
                                      "p",
                                      {
                                        className: "inline-error",
                                        children: error,
                                      },
                                      void 0,
                                      false,
                                      {
                                        fileName:
                                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                                        lineNumber: 989,
                                        columnNumber: 24,
                                      },
                                      this,
                                    )
                                  : null,
                              ],
                            },
                            void 0,
                            true,
                            {
                              fileName:
                                "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                              lineNumber: 865,
                              columnNumber: 13,
                            },
                            this,
                          ),
                        ],
                      },
                      void 0,
                      true,
                      {
                        fileName:
                          "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                        lineNumber: 836,
                        columnNumber: 11,
                      },
                      this,
                    ),
                  ],
                },
                void 0,
                true,
                {
                  fileName:
                    "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
                  lineNumber: 802,
                  columnNumber: 9,
                },
                this,
              ),
            ],
          },
          void 0,
          true,
          {
            fileName:
              "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
            lineNumber: 749,
            columnNumber: 7,
          },
          this,
        ),
      ],
    },
    void 0,
    true,
    {
      fileName:
        "[project]/Downloads/noah prot/noah-2-prototype/app/speak-english/speaking-studio.tsx",
      lineNumber: 720,
      columnNumber: 10,
    },
    this,
  );
}

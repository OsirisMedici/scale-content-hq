"use client";

import {
  Check,
  ChevronDown,
  Clapperboard,
  FileText,
  Film,
  HardDrive,
  Hash,
  ImageIcon,
  Link2,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  Scissors,
  Search,
  Send,
  SkipBack,
  Upload,
  Users,
  Video,
  Volume2,
  ZoomIn,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AssetKind = "script" | "plan" | "broll" | "beat";
type TrackKind = "voice" | "broll" | "graphics";

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

type BoardItem = {
  id: string;
  title: string;
  kind: AssetKind;
  note: string;
  sourceName?: string;
  size?: string;
  previewUrl?: string;
  mimeType?: string;
  uploadId?: string;
  text?: string;
  timelineStart?: number;
  timelineDuration?: number;
  tags?: string[];
  comments: Comment[];
  createdAt: string;
};

type ActivityEntry = { id: string; text: string; createdAt: string };

type PlannerState = {
  projectName: string;
  targetRuntime: string;
  items: BoardItem[];
  activity: ActivityEntry[];
};

const STORAGE_KEY = "scale-content-hq-timeline-v2";
const CHANNEL_NAME = "scale-content-hq-live-board";
const SAMPLE_DATE = "2026-07-10T00:00:00.000Z";
const RUNTIME = 60;

const scriptLines = [
  "You do not need more content. You need a better system for deciding what makes the cut.",
  "Start with the result. Let the viewer see the transformation before you explain the process.",
  "Then show the messy middle: the notes, the footage, and the decisions that usually slow the edit down.",
  "Now every word, visual reference, and B-roll option lives on one timeline with the team.",
  "The editor opens the board and already knows what goes where, why it matters, and what is approved.",
  "That is how the planning process gets compressed from hours into minutes.",
];

const initialState: PlannerState = {
  projectName: "Launch Reel",
  targetRuntime: "00:60",
  items: [
    {
      id: "script-main",
      title: "Launch reel script v3",
      kind: "script",
      note: "Primary voiceover script",
      sourceName: "launch-reel-v3.txt",
      text: scriptLines.join("\n\n"),
      tags: ["approved", "voiceover"],
      comments: [],
      createdAt: SAMPLE_DATE,
    },
    ...scriptLines.map((text, index) => ({
      id: `beat-${index + 1}`,
      title: `Scene ${String(index + 1).padStart(2, "0")}`,
      kind: "beat" as const,
      note: index === 0 ? "Cold open. Keep this under four seconds." : "",
      text,
      timelineStart: [0, 7, 16, 27, 38, 50][index],
      timelineDuration: [7, 9, 11, 11, 12, 10][index],
      tags: index === 0 ? ["hook"] : [],
      comments:
        index === 0
          ? [
              {
                id: "comment-1",
                author: "Maya",
                body: "Use the strongest before/after visual on the first line.",
                createdAt: SAMPLE_DATE,
              },
            ]
          : [],
      createdAt: SAMPLE_DATE,
    })),
    {
      id: "plan-1",
      title: "Opening frame direction",
      kind: "plan",
      note: "Full-screen result with the metric held for 1.5 seconds.",
      sourceName: "opening-frame.jpg",
      timelineStart: 1,
      timelineDuration: 5,
      tags: ["hook", "frame"],
      comments: [],
      createdAt: SAMPLE_DATE,
    },
    {
      id: "broll-1",
      title: "Workspace screen recording",
      kind: "broll",
      note: "Use the clean take with the cursor moving left to right.",
      sourceName: "workspace-clean-take.mp4",
      timelineStart: 17,
      timelineDuration: 9,
      tags: ["product", "clean-take"],
      comments: [],
      createdAt: SAMPLE_DATE,
    },
    {
      id: "broll-2",
      title: "Team review close-up",
      kind: "broll",
      note: "Crop tightly around comments and approvals.",
      sourceName: "team-review.mov",
      timelineStart: 32,
      timelineDuration: 7,
      tags: ["team", "proof"],
      comments: [],
      createdAt: SAMPLE_DATE,
    },
  ],
  activity: [
    {
      id: "activity-1",
      text: "Maya tagged the opening frame for the hook.",
      createdAt: SAMPLE_DATE,
    },
  ],
};

const tracks: Array<{
  id: TrackKind;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  kinds: AssetKind[];
}> = [
  { id: "voice", label: "VO", sublabel: "Script", icon: Volume2, kinds: ["beat"] },
  { id: "broll", label: "B-roll", sublabel: "Footage", icon: Film, kinds: ["broll"] },
  {
    id: "graphics",
    label: "Graphics",
    sublabel: "Plan frames",
    icon: ImageIcon,
    kinds: ["plan"],
  },
];

const kindConfig: Record<AssetKind, { label: string; icon: LucideIcon; tone: string }> = {
  script: { label: "Script", icon: FileText, tone: "text-emerald-300" },
  plan: { label: "Plan", icon: ImageIcon, tone: "text-sky-300" },
  broll: { label: "B-roll", icon: Video, tone: "text-amber-300" },
  beat: { label: "Scene", icon: Clapperboard, tone: "text-fuchsia-300" },
};

const collaborators = [
  { name: "You", initials: "YO", className: "bg-lime-300 text-neutral-950" },
  { name: "Maya", initials: "MA", className: "bg-cyan-300 text-neutral-950" },
  { name: "Dev", initials: "DE", className: "bg-orange-300 text-neutral-950" },
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readTextFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

type PersistedUpload = {
  id: string;
  url: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

async function persistUpload(file: File) {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/uploads", { method: "POST", body: formData });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "The local file upload failed.");
  }
  return (await response.json()) as PersistedUpload;
}

function formatSize(bytes?: number) {
  if (!bytes) return undefined;
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.min(RUNTIME, seconds));
  return `00:${String(Math.floor(safe)).padStart(2, "0")}:${String(
    Math.floor((safe % 1) * 100),
  ).padStart(2, "0")}`;
}

function makeBeatItems(script: string, sourceName: string): BoardItem[] {
  const chunks = script
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .slice(0, 10);
  const duration = RUNTIME / Math.max(chunks.length, 1);

  return chunks.map((text, index) => ({
    id: createId("beat"),
    title: `Scene ${String(index + 1).padStart(2, "0")}`,
    kind: "beat",
    note: "",
    sourceName,
    text,
    timelineStart: index * duration,
    timelineDuration: duration,
    tags: [],
    comments: [],
    createdAt: new Date().toISOString(),
  }));
}

function normalizeState(value: PlannerState): PlannerState {
  return {
    ...value,
    items: value.items.map((item) => ({
      ...item,
      note: item.note ?? "",
      tags: item.tags ?? [],
      comments: item.comments ?? [],
    })),
  };
}

export default function Home() {
  const [state, setState] = useState<PlannerState>(initialState);
  const [selectedId, setSelectedId] = useState("broll-1");
  const [currentTime, setCurrentTime] = useState(2.4);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [tagText, setTagText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const channelRef = useRef<BroadcastChannel | null>(null);
  const skipBroadcastRef = useRef(false);
  const skipServerSaveRef = useRef(false);
  const storageReadyRef = useRef(false);
  const serverVersionRef = useRef(0);
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const beats = useMemo(
    () =>
      state.items
        .filter((item) => item.kind === "beat")
        .sort((a, b) => (a.timelineStart ?? 0) - (b.timelineStart ?? 0)),
    [state.items],
  );
  const assets = useMemo(
    () =>
      state.items.filter(
        (item) =>
          item.kind !== "beat" &&
          (item.title.toLowerCase().includes(search.toLowerCase()) ||
            item.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))),
      ),
    [search, state.items],
  );
  const selectedItem = state.items.find((item) => item.id === selectedId) ?? assets[0];
  const activeBeat = beats.find(
    (beat) =>
      currentTime >= (beat.timelineStart ?? 0) &&
      currentTime < (beat.timelineStart ?? 0) + (beat.timelineDuration ?? 6),
  );

  useEffect(() => {
    let mounted = true;
    let fallbackState = initialState;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        fallbackState = normalizeState(JSON.parse(saved) as PlannerState);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<PlannerState>) => {
      skipBroadcastRef.current = true;
      skipServerSaveRef.current = true;
      setState(normalizeState(event.data));
    };

    async function hydrateFromServer() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("Local database is unavailable.");
        const workspace = (await response.json()) as {
          state: PlannerState;
          version: number;
        } | null;
        const nextState = workspace?.state ? normalizeState(workspace.state) : fallbackState;

        window.queueMicrotask(() => {
          if (!mounted) return;
          if (workspace) serverVersionRef.current = workspace.version;
          setState(nextState);
          setSelectedId(
            nextState.items.find((item) => item.kind === "broll")?.id ?? nextState.items[0]?.id ?? "",
          );
          storageReadyRef.current = true;
          setSyncStatus(workspace ? "saved" : "saving");
        });
      } catch {
        window.queueMicrotask(() => {
          if (!mounted) return;
          setState(fallbackState);
          storageReadyRef.current = true;
          setSyncStatus("error");
        });
      }
    }

    void hydrateFromServer();

    const pollTimer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) return;
        const workspace = (await response.json()) as {
          state: PlannerState;
          version: number;
        } | null;
        if (!mounted || !workspace || workspace.version <= serverVersionRef.current) return;
        serverVersionRef.current = workspace.version;
        skipBroadcastRef.current = true;
        skipServerSaveRef.current = true;
        setState(normalizeState(workspace.state));
        setSyncStatus("saved");
      } catch {
        if (mounted) setSyncStatus("error");
      }
    }, 2000);

    return () => {
      mounted = false;
      window.clearInterval(pollTimer);
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (!storageReadyRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // SQLite remains the durable copy if browser storage is unavailable.
    }
    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false;
    } else {
      channelRef.current?.postMessage(state);
    }

    if (skipServerSaveRef.current) {
      skipServerSaveRef.current = false;
      return;
    }

    setSyncStatus("saving");
    const saveTimer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        });
        if (!response.ok) throw new Error("Database save failed.");
        const workspace = (await response.json()) as { version: number };
        serverVersionRef.current = workspace.version;
        setSyncStatus("saved");
      } catch {
        setSyncStatus("error");
      }
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [state]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCurrentTime((time) => {
        if (time >= RUNTIME) {
          setPlaying(false);
          return 0;
        }
        return Math.min(RUNTIME, time + 0.1);
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!activeBeat) return;
    transcriptRefs.current[activeBeat.id]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeBeat]);

  function updateState(updater: (current: PlannerState) => PlannerState) {
    setState((current) => updater(current));
  }

  function logActivity(text: string, current: PlannerState): PlannerState {
    return {
      ...current,
      activity: [
        { id: createId("activity"), text, createdAt: new Date().toISOString() },
        ...current.activity,
      ].slice(0, 12),
    };
  }

  async function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
    kind: Exclude<AssetKind, "beat">,
  ) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const uploaded: BoardItem[] = [];
    let newBeats: BoardItem[] = [];

    try {
      for (const file of files) {
        const [persisted, text] = await Promise.all([
          persistUpload(file),
          kind === "script" ? readTextFile(file) : Promise.resolve(undefined),
        ]);
        uploaded.push({
          id: createId(kind),
          title: file.name.replace(/\.[^/.]+$/, ""),
          kind,
          note: kind === "script" ? "Imported script" : "Add an editor note",
          sourceName: persisted.name,
          size: formatSize(persisted.size),
          previewUrl: kind === "script" ? undefined : persisted.url,
          mimeType: persisted.mimeType,
          uploadId: persisted.id,
          text,
          tags: [],
          comments: [],
          createdAt: persisted.createdAt,
        });
        if (text) newBeats = [...newBeats, ...makeBeatItems(text, file.name)];
      }
    } catch {
      setSyncStatus("error");
      event.target.value = "";
      return;
    }

    updateState((current) =>
      logActivity(`Uploaded ${files.length} ${kind} file${files.length > 1 ? "s" : ""}.`, {
        ...current,
        items:
          kind === "script"
            ? [...uploaded, ...newBeats, ...current.items.filter((item) => item.kind !== "beat")]
            : [...uploaded, ...current.items],
      }),
    );
    setSelectedId(uploaded[0].id);
    event.target.value = "";
  }

  function updateItem(id: string, patch: Partial<BoardItem>) {
    updateState((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }

  function dropOnTrack(event: DragEvent<HTMLDivElement>, track: (typeof tracks)[number]) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggedId;
    const item = state.items.find((entry) => entry.id === id);
    if (!item || !track.kinds.includes(item.kind)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const start = Math.max(0, Math.min(RUNTIME - 2, ((event.clientX - rect.left) / rect.width) * RUNTIME));
    updateItem(item.id, {
      timelineStart: Math.round(start * 2) / 2,
      timelineDuration: item.timelineDuration ?? (item.kind === "plan" ? 5 : 7),
    });
    setCurrentTime(start);
    setSelectedId(item.id);
  }

  function addTag() {
    const tag = tagText.trim().replace(/^#/, "");
    if (!selectedItem || !tag || selectedItem.tags?.includes(tag)) return;
    updateItem(selectedItem.id, { tags: [...(selectedItem.tags ?? []), tag] });
    setTagText("");
  }

  function addComment() {
    if (!selectedItem || !commentText.trim()) return;
    const comment: Comment = {
      id: createId("comment"),
      author: "You",
      body: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    updateState((current) =>
      logActivity(`Commented on ${selectedItem.title}.`, {
        ...current,
        items: current.items.map((item) =>
          item.id === selectedItem.id ? { ...item, comments: [...item.comments, comment] } : item,
        ),
      }),
    );
    setCommentText("");
  }

  const timelineWidth = `${Math.round(100 * zoom)}%`;

  return (
    <main className="flex h-screen min-h-[720px] flex-col overflow-hidden bg-[#0e100f] text-stone-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#141715] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-lime-300 text-neutral-950">
            <Scissors className="h-4 w-4" />
          </div>
          <button className="hidden h-9 items-center gap-2 border-r border-white/10 pr-4 text-sm font-medium text-stone-400 sm:flex">
            Scale Content HQ
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <h1
            className="max-w-[42vw] truncate text-sm font-semibold outline-none sm:text-base"
            contentEditable
            suppressContentEditableWarning
            onBlur={(event) =>
              updateState((current) => ({
                ...current,
                projectName: event.currentTarget.textContent?.trim() || current.projectName,
              }))
            }
          >
            {state.projectName}
          </h1>
          <span className="hidden items-center gap-1.5 rounded-full bg-lime-300/10 px-2 py-1 text-[11px] font-medium text-lime-200 md:inline-flex">
            <Radio className="h-3 w-3" /> Live
          </span>
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium lg:inline-flex ${
              syncStatus === "error"
                ? "bg-red-400/10 text-red-300"
                : "bg-white/[0.06] text-stone-400"
            }`}
            title="Workspace and uploads are stored on this self-hosted machine"
          >
            <HardDrive className="h-3 w-3" />
            {syncStatus === "loading"
              ? "Opening local DB"
              : syncStatus === "saving"
                ? "Saving locally"
                : syncStatus === "error"
                  ? "Local DB unavailable"
                  : "Offline DB saved"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden -space-x-2 sm:flex">
            {collaborators.map((person) => (
              <span
                key={person.name}
                title={person.name}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#141715] text-[10px] font-bold ${person.className}`}
              >
                {person.initials}
              </span>
            ))}
          </div>
          <button className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 text-xs font-semibold text-stone-200 hover:bg-white/[0.09]">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
          </button>
          <button aria-label="More project actions" className="icon-button">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,70%)_minmax(330px,30%)]">
        <section className="grid min-h-0 min-w-0 grid-rows-[minmax(250px,44%)_minmax(300px,56%)] border-r border-white/10">
          <section className="flex min-h-0 flex-col bg-[#111412]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-300" />
                <h2 className="text-xs font-semibold uppercase text-stone-300">Script document</h2>
                <span className="text-[11px] text-stone-600">{beats.length} scenes</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                <span className="hidden sm:inline">Words follow the playhead</span>
                <span className="rounded bg-white/[0.06] px-2 py-1 font-mono text-stone-300">{formatTime(currentTime)}</span>
              </div>
            </div>

            <div className="transcript-scroll min-h-0 flex-1 overflow-y-auto px-[8%] py-8">
              <div className="mx-auto max-w-4xl space-y-2">
                {beats.map((beat, index) => {
                  const active = activeBeat?.id === beat.id;
                  const passed = currentTime > (beat.timelineStart ?? 0) + (beat.timelineDuration ?? 6);
                  return (
                    <div
                      key={beat.id}
                      ref={(node) => {
                        transcriptRefs.current[beat.id] = node;
                      }}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", beat.id);
                        setDraggedId(beat.id);
                      }}
                      onClick={() => {
                        setCurrentTime(beat.timelineStart ?? 0);
                        setSelectedId(beat.id);
                      }}
                      className={`group grid cursor-grab grid-cols-[34px_1fr_auto] gap-3 rounded-md px-3 py-2.5 transition active:cursor-grabbing ${
                        active ? "bg-white/[0.08]" : "hover:bg-white/[0.035]"
                      }`}
                    >
                      <span className={`pt-1 font-mono text-[11px] ${active ? "text-lime-300" : "text-stone-700"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(event) => updateItem(beat.id, { text: event.currentTarget.textContent ?? "" })}
                        className={`outline-none transition ${
                          active
                            ? "text-[18px] font-medium leading-7 text-stone-50"
                            : passed
                              ? "text-[15px] leading-6 text-stone-600"
                              : "text-[15px] leading-6 text-stone-300"
                        }`}
                      >
                        {beat.text}
                      </p>
                      <span className={`pt-1 font-mono text-[10px] ${active ? "text-lime-200" : "text-stone-700"}`}>
                        {Math.round(beat.timelineStart ?? 0)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col border-t border-white/10 bg-[#0d0f0e]">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3">
              <div className="flex items-center gap-1">
                <button aria-label="Jump to start" className="icon-button" onClick={() => setCurrentTime(0)}>
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  aria-label={playing ? "Pause" : "Play"}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-neutral-950 hover:bg-lime-200"
                  onClick={() => setPlaying((value) => !value)}
                >
                  {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
                </button>
                <span className="ml-2 min-w-24 font-mono text-xs text-stone-300">{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button aria-label="Zoom out" className="icon-button" onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-[11px] text-stone-500">{Math.round(zoom * 100)}%</span>
                <button aria-label="Zoom in" className="icon-button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <div className="relative min-h-full min-w-[760px]" style={{ width: timelineWidth }}>
                <div className="sticky top-0 z-20 ml-28 h-7 border-b border-white/10 bg-[#0d0f0e]">
                  {Array.from({ length: 13 }, (_, index) => index * 5).map((second) => (
                    <span key={second} className="absolute top-1 font-mono text-[9px] text-stone-600" style={{ left: `${(second / RUNTIME) * 100}%` }}>
                      {second}s
                    </span>
                  ))}
                </div>

                {tracks.map((track) => {
                  const Icon = track.icon;
                  const clips = state.items.filter(
                    (item) => track.kinds.includes(item.kind) && item.timelineStart !== undefined,
                  );
                  return (
                    <div key={track.id} className="grid h-[72px] grid-cols-[112px_1fr] border-b border-white/[0.07]">
                      <div className="sticky left-0 z-20 flex items-center gap-2 border-r border-white/10 bg-[#111412] px-3">
                        <Icon className="h-4 w-4 text-stone-500" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-stone-300">{track.label}</p>
                          <p className="text-[10px] text-stone-600">{track.sublabel}</p>
                        </div>
                      </div>
                      <div
                        className="timeline-track relative"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => dropOnTrack(event, track)}
                      >
                        {clips.map((item) => (
                          <TimelineClip
                            key={item.id}
                            item={item}
                            active={selectedId === item.id}
                            onSelect={() => {
                              setSelectedId(item.id);
                              setCurrentTime(item.timelineStart ?? 0);
                            }}
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", item.id);
                              setDraggedId(item.id);
                            }}
                          />
                        ))}
                        <div className="pointer-events-none absolute inset-y-0 z-10 w-px bg-lime-300" style={{ left: `${(currentTime / RUNTIME) * 100}%` }}>
                          <span className="absolute -left-1.5 -top-1 h-3 w-3 rotate-45 bg-lime-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </section>

        <aside className="flex min-h-0 flex-col bg-[#151816]">
          <div className="shrink-0 border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Tagged files</h2>
                <p className="mt-1 text-[11px] text-stone-500">Drag media straight onto the timeline</p>
              </div>
              <UploadMenu onUpload={handleUpload} />
            </div>
            <label className="mt-3 flex h-9 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3">
              <Search className="h-3.5 w-3.5 text-stone-600" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search files or tags"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-stone-600"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 border-b border-white/10 p-3 xl:grid-cols-3">
              {assets.map((item) => (
                <AssetCard
                  key={item.id}
                  item={item}
                  active={selectedItem?.id === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", item.id);
                    setDraggedId(item.id);
                  }}
                />
              ))}
            </div>

            {selectedItem && (
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <KindLabel kind={selectedItem.kind} />
                    <h3 className="mt-2 truncate text-base font-semibold text-stone-100">{selectedItem.title}</h3>
                    <p className="mt-1 truncate text-[11px] text-stone-600">
                      {selectedItem.sourceName ?? "Timeline scene"}{selectedItem.size ? ` · ${selectedItem.size}` : ""}
                    </p>
                  </div>
                  <button aria-label="Copy file link" className="icon-button"><Link2 className="h-4 w-4" /></button>
                </div>

                <AssetPreview item={selectedItem} large />

                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-stone-500">
                    <Hash className="h-3.5 w-3.5" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.tags?.map((tag) => (
                      <button
                        key={tag}
                        className="rounded bg-white/[0.07] px-2 py-1 text-[11px] text-stone-300 hover:bg-white/[0.11]"
                        onClick={() => updateItem(selectedItem.id, { tags: selectedItem.tags?.filter((entry) => entry !== tag) })}
                        title="Remove tag"
                      >
                        #{tag}
                      </button>
                    ))}
                    <div className="flex h-7 items-center rounded border border-dashed border-white/10 px-2">
                      <Plus className="mr-1 h-3 w-3 text-stone-600" />
                      <input
                        value={tagText}
                        onChange={(event) => setTagText(event.target.value)}
                        onKeyDown={(event) => event.key === "Enter" && addTag()}
                        placeholder="tag"
                        className="w-16 bg-transparent text-[11px] outline-none placeholder:text-stone-600"
                      />
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase text-stone-500">Editor note</span>
                  <textarea
                    value={selectedItem.note}
                    onChange={(event) => updateItem(selectedItem.id, { note: event.target.value })}
                    className="min-h-20 w-full resize-none rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-stone-300 outline-none focus:border-lime-300/40"
                  />
                </label>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase text-stone-500">
                      <MessageSquare className="h-3.5 w-3.5" /> Comments
                    </span>
                    <span className="text-[10px] text-stone-600">{selectedItem.comments.length}</span>
                  </div>
                  <div className="space-y-2">
                    {selectedItem.comments.map((comment) => (
                      <div key={comment.id} className="rounded-md bg-white/[0.045] p-2.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-stone-300">{comment.author}</span>
                          <span className="text-stone-600">{comment.createdAt.slice(11, 16)}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-stone-400">{comment.body}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && addComment()}
                      placeholder="Comment at this point..."
                      className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 text-xs outline-none placeholder:text-stone-600 focus:border-lime-300/40"
                    />
                    <button aria-label="Send comment" onClick={addComment} className="flex h-9 w-9 items-center justify-center rounded-md bg-lime-300 text-neutral-950 hover:bg-lime-200">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function TimelineClip({
  item,
  active,
  onSelect,
  onDragStart,
}: {
  item: BoardItem;
  active: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  const start = item.timelineStart ?? 0;
  const duration = item.timelineDuration ?? 6;
  const colors =
    item.kind === "beat"
      ? "border-fuchsia-300/30 bg-fuchsia-400/20 text-fuchsia-100"
      : item.kind === "broll"
        ? "border-amber-300/30 bg-amber-400/20 text-amber-100"
        : "border-sky-300/30 bg-sky-400/20 text-sky-100";

  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`absolute top-2 h-14 overflow-hidden rounded border px-2 text-left transition ${colors} ${active ? "ring-1 ring-lime-300" : "hover:brightness-125"}`}
      style={{ left: `${(start / RUNTIME) * 100}%`, width: `${Math.max((duration / RUNTIME) * 100, 4)}%` }}
    >
      <span className="block truncate text-[10px] font-semibold">{item.title}</span>
      <span className="mt-1 block truncate text-[9px] opacity-60">{item.text ?? item.sourceName ?? `${duration}s`}</span>
    </button>
  );
}

function KindLabel({ kind }: { kind: AssetKind }) {
  const config = kindConfig[kind];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase ${config.tone}`}>
      <Icon className="h-3.5 w-3.5" /> {config.label}
    </span>
  );
}

function AssetCard({
  item,
  active,
  onSelect,
  onDragStart,
}: {
  item: BoardItem;
  active: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      className={`min-w-0 overflow-hidden rounded-md border text-left transition ${active ? "border-lime-300/60 bg-lime-300/[0.06]" : "border-white/10 bg-black/20 hover:border-white/20"}`}
    >
      <AssetPreview item={item} />
      <div className="p-2">
        <p className="truncate text-[11px] font-medium text-stone-300">{item.title}</p>
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <KindLabel kind={item.kind} />
          {item.timelineStart !== undefined && <Check className="h-3 w-3 text-lime-300" />}
        </div>
      </div>
    </button>
  );
}

function AssetPreview({ item, large }: { item: BoardItem; large?: boolean }) {
  const className = `${large ? "h-44" : "h-20"} w-full bg-black/40 object-cover`;
  if (item.previewUrl) {
    if (
      item.kind === "broll" &&
      (item.mimeType?.startsWith("video/") || item.previewUrl.startsWith("blob:"))
    ) {
      return <video className={className} controls={large} muted src={item.previewUrl} />;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={className} src={item.previewUrl} alt={item.title} />
    );
  }
  const Icon = kindConfig[item.kind].icon;
  return (
    <div className={`${className} preview-grid flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-2 text-stone-600">
        <Icon className={large ? "h-8 w-8" : "h-5 w-5"} />
        {large && <span className="text-[10px] uppercase">Preview appears after upload</span>}
      </div>
    </div>
  );
}

function UploadMenu({
  onUpload,
}: {
  onUpload: (event: ChangeEvent<HTMLInputElement>, kind: Exclude<AssetKind, "beat">) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <label title="Upload script" className="icon-button cursor-pointer">
        <FileText className="h-4 w-4" />
        <input type="file" accept=".txt,.md,.srt,.vtt,.csv" className="sr-only" onChange={(event) => void onUpload(event, "script")} />
      </label>
      <label title="Upload plan image" className="icon-button cursor-pointer">
        <ImageIcon className="h-4 w-4" />
        <input type="file" accept="image/*" className="sr-only" onChange={(event) => void onUpload(event, "plan")} />
      </label>
      <label title="Upload B-roll" className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-lime-300 px-2.5 text-[11px] font-semibold text-neutral-950 hover:bg-lime-200">
        <Upload className="h-3.5 w-3.5" /> Upload
        <input type="file" accept="video/*,image/*" multiple className="sr-only" onChange={(event) => void onUpload(event, "broll")} />
      </label>
    </div>
  );
}

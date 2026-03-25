import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AgentBriefInputSchema,
  type AgentBriefInput,
  type AgentConcept,
  type AgentRunStep,
  GeneratePlayableAdInputSchema,
  type GameType,
  type GeneratePlayableAdInput,
  type PlayableAdConfig,
  type PlayableAdHistoryListItem
} from "@studio/shared";
import "./App.css";

type HistoryDetailResponse = {
  mode?: "manual" | "agent";
  input?: GeneratePlayableAdInput;
  brief?: AgentBriefInput;
  concept?: AgentConcept;
  steps?: AgentRunStep[];
  output: PlayableAdConfig;
  provider: string;
  createdAt: string;
};

type AgentGenerateResponse = {
  concept: AgentConcept;
  steps: AgentRunStep[];
  output: PlayableAdConfig;
  provider: string;
  createdAt: string;
};

type HistoryListItem = PlayableAdHistoryListItem;

type ApiError = {
  status: "error";
  code: string;
  message: string;
  details?: Array<{ path?: string; message: string }>;
};

const apiBaseUrl = "http://localhost:8080";

const gameTypePreviewCopy: Record<GameType, { title: string; flavor: string; lane: string }> = {
  runner: {
    title: "Runner lane preview",
    flavor: "Swipe to dodge obstacles and keep momentum up.",
    lane: "🏃  ▭  ⚡  ▭  🧱"
  },
  merge: {
    title: "Merge board preview",
    flavor: "Drag and combine matching pieces to evolve faster.",
    lane: "🔹 + 🔹 → 🔷   |   🔷 + 🔷 → 💎"
  },
  "tap-survival": {
    title: "Survival arena preview",
    flavor: "Tap quickly to survive incoming waves and recover health.",
    lane: "❤️❤️♡   ☄️☄️☄️   👆 TAP"
  }
};

export default function App() {
  const [result, setResult] = useState<PlayableAdConfig | null>(null);
  const [history, setHistory] = useState<HistoryListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [mode, setMode] = useState<"manual" | "agent">("manual");
  const [agentConcept, setAgentConcept] = useState<AgentConcept | null>(null);
  const [agentSteps, setAgentSteps] = useState<AgentRunStep[]>([]);

  const manualForm = useForm<GeneratePlayableAdInput>({
    resolver: zodResolver(GeneratePlayableAdInputSchema),
    defaultValues: {
      gameType: "runner",
      theme: "space racers",
      targetAudience: "casual",
      ctaStyle: "urgent",
      difficulty: "easy"
    }
  });

  const agentForm = useForm<AgentBriefInput>({
    resolver: zodResolver(AgentBriefInputSchema),
    defaultValues: {
      theme: "space racers",
      targetAudience: "casual",
      campaignGoal: "increase day-1 retention",
      tone: "urgent"
    }
  });

  function getDifficultyFromScore(score: number): GeneratePlayableAdInput["difficulty"] {
    if (score <= 2) return "easy";
    if (score === 3) return "medium";
    return "hard";
  }

  function syncFormFromGeneratedConfig(
    config: PlayableAdConfig,
    previousInput: GeneratePlayableAdInput
  ) {
    manualForm.reset({
      gameType: config.gameType,
      theme: config.theme,
      difficulty: getDifficultyFromScore(config.difficultyScore),
      targetAudience: previousInput.targetAudience,
      ctaStyle: previousInput.ctaStyle
    });
  }

  async function loadHistory() {
    const response = await fetch(`${apiBaseUrl}/api/v1/playable-ads`);

    if (!response.ok) {
      throw new Error("Failed to load history");
    }

    const data: HistoryListItem[] = await response.json();
    setHistory(data);
  }

  async function loadHistoryItem(id: string) {
    const response = await fetch(`${apiBaseUrl}/api/v1/playable-ads/${id}`);

    if (!response.ok) {
      throw new Error("Failed to load history item");
    }

    const data: HistoryDetailResponse = await response.json();
    setResult(data.output);

    if (data.mode === "agent") {
      setMode("agent");
      if (data.brief) {
        agentForm.reset(data.brief);
      }
      setAgentConcept(data.concept ?? null);
      setAgentSteps(data.steps ?? []);
      return;
    }

    setMode("manual");
    if (data.input) {
      manualForm.reset(data.input);
    }
    setAgentConcept(null);
    setAgentSteps([]);
  }

  useEffect(() => {
    loadHistory().catch((error) => {
      console.error(error);
    });
  }, []);

  async function onManualSubmit(values: GeneratePlayableAdInput) {
    setLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/playable-ads/generate-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data);
        return;
      }

      setResult(data);
      syncFormFromGeneratedConfig(data, values);
      setAgentConcept(null);
      setAgentSteps([]);
      await loadHistory();
    } catch (error) {
      console.error(error);
      setApiError({
        status: "error",
        code: "NETWORK_ERROR",
        message: "Could not reach the backend service"
      });
    } finally {
      setLoading(false);
    }
  }

  async function onAgentSubmit(values: AgentBriefInput) {
    setLoading(true);
    setApiError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/playable-ads/agent-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(values)
      });

      const data: AgentGenerateResponse = await response.json();

      if (!response.ok) {
        setApiError(data as unknown as ApiError);
        return;
      }

      setResult(data.output);
      setAgentConcept(data.concept);
      setAgentSteps(data.steps);
      await loadHistory();
    } catch (error) {
      console.error(error);
      setApiError({
        status: "error",
        code: "NETWORK_ERROR",
        message: "Could not reach the backend service"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <section className="panel">
        <h1>Playable Ads Config Studio</h1>
        <p className="muted">
          Internal tool prototype for generating and previewing playable-ad configs.
        </p>

        <div className="modeToggle">
          <button
            type="button"
            className={mode === "manual" ? "toggleButtonActive" : ""}
            onClick={() => setMode("manual")}
          >
            Manual Mode
          </button>
          <button
            type="button"
            className={mode === "agent" ? "toggleButtonActive" : ""}
            onClick={() => setMode("agent")}
          >
            Agent Mode
          </button>
        </div>

        {mode === "manual" ? (
          <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="form">
            <label>
              Game type
              <select {...manualForm.register("gameType")}>
                <option value="runner">runner</option>
                <option value="merge">merge</option>
                <option value="tap-survival">tap-survival</option>
              </select>
            </label>

            <label>
              Theme
              <input {...manualForm.register("theme")} placeholder="space racers" />
            </label>

            <label>
              Target audience
              <select {...manualForm.register("targetAudience")}>
                <option value="casual">casual</option>
                <option value="midcore">midcore</option>
              </select>
            </label>

            <label>
              CTA style
              <select {...manualForm.register("ctaStyle")}>
                <option value="urgent">urgent</option>
                <option value="reward">reward</option>
                <option value="challenge">challenge</option>
              </select>
            </label>

            <label>
              Difficulty
              <select {...manualForm.register("difficulty")}>
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Generating config..." : "Generate config"}
            </button>
          </form>
        ) : (
          <form onSubmit={agentForm.handleSubmit(onAgentSubmit)} className="form">
            <label>
              Theme
              <input {...agentForm.register("theme")} placeholder="space racers" />
            </label>

            <label>
              Target audience
              <select {...agentForm.register("targetAudience")}>
                <option value="casual">casual</option>
                <option value="midcore">midcore</option>
              </select>
            </label>

            <label>
              Campaign goal
              <input {...agentForm.register("campaignGoal")} placeholder="increase day-1 retention" />
            </label>

            <label>
              Tone
              <input {...agentForm.register("tone")} placeholder="urgent" />
            </label>

            <button type="submit" disabled={loading}>
              {loading ? "Running agent workflow..." : "Run agent workflow"}
            </button>
          </form>
        )}

        {loading && (
          <p className="loadingText">
            {mode === "agent"
              ? "Generating concept + config and refreshing history…"
              : "Generating a config and refreshing history…"}
          </p>
        )}

        {apiError && (
          <div className="errorBox">
            <strong>{apiError.code}</strong>
            <p>{apiError.message}</p>

            {apiError.details && apiError.details.length > 0 && (
              <ul>
                {apiError.details.map((detail, index) => (
                  <li key={index}>
                    {detail.path ? `${detail.path}: ` : ""}
                    {detail.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Generated Config</h2>

        {result ? (
          <>
            {agentConcept && (
              <div className="conceptCard">
                <h3>Agent concept</h3>
                <p>
                  <strong>Game type:</strong> {agentConcept.recommendedGameType}
                </p>
                <p>
                  <strong>Headline idea:</strong> {agentConcept.headlineIdea}
                </p>
                <p>
                  <strong>CTA direction:</strong> {agentConcept.ctaDirection}
                </p>
                <p>
                  <strong>Gameplay concept:</strong> {agentConcept.gameplayConcept}
                </p>
              </div>
            )}

            {agentSteps.length > 0 && (
              <div className="stepsCard">
                <h3>Agent run steps</h3>
                <ul>
                  {agentSteps.map((step) => (
                    <li key={step.name}>
                      <strong>{step.name}</strong> — {step.status}: {step.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="previewCard" style={{ background: result.palette.background }}>
              <div className="previewHeader">
                <span className="badge">{result.gameType}</span>
                <span className="badge">{result.status}</span>
              </div>

              <h3 style={{ color: result.palette.accent }}>{result.headline}</h3>
              <p>{result.objective}</p>

              <div className="miniPlayable">
                <div className="miniPlayableHeader">
                  <div>
                    <strong>{gameTypePreviewCopy[result.gameType].title}</strong>
                    <p className="muted">{gameTypePreviewCopy[result.gameType].flavor}</p>
                  </div>
                  <div className="scoreBox">Difficulty: {result.difficultyScore}</div>
                </div>
                <div className="previewLane">{gameTypePreviewCopy[result.gameType].lane}</div>
                <button className="playableButton" type="button">
                  {result.ctaText}
                </button>
              </div>

              <ul>
                {result.tutorialSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>

            <pre>{JSON.stringify(result, null, 2)}</pre>
          </>
        ) : (
          <p className="muted">No generated config yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>History</h2>

        <div className="history">
          {history.length === 0 ? (
            <p className="muted">No generated ads yet.</p>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                className={`historyItem ${result?.id === item.id ? "historyItemActive" : ""}`}
                onClick={() => {
                  loadHistoryItem(item.id).catch((error) => {
                    console.error(error);
                  });
                  setApiError(null);
                }}
                type="button"
              >
                <strong>{item.theme}</strong>
                <div className="historyMeta">
                  <span>{item.gameType}</span>
                  <span>{item.provider}</span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <span className="historyStatus">
                  Mode: {item.mode} · Status: {item.status}
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

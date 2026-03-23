import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GeneratePlayableAdInputSchema,
  type GeneratePlayableAdInput,
  type PlayableAdConfig
} from "@studio/shared";
import "./App.css";

type HistoryItem = {
  _id: string;
  output: PlayableAdConfig;
  provider: string;
  createdAt: string;
};

type ApiError = {
  status: "error";
  code: string;
  message: string;
  details?: Array<{ path?: string; message: string }>;
};

const apiBaseUrl = "http://localhost:8080";

export default function App() {
  const [result, setResult] = useState<PlayableAdConfig | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const form = useForm<GeneratePlayableAdInput>({
    resolver: zodResolver(GeneratePlayableAdInputSchema),
    defaultValues: {
      gameType: "runner",
      theme: "space racers",
      targetAudience: "casual",
      ctaStyle: "urgent",
      difficulty: "easy"
    }
  });

  async function loadHistory() {
    const response = await fetch(`${apiBaseUrl}/api/v1/playable-ads`);

    if (!response.ok) {
      throw new Error("Failed to load history");
    }

    const data = await response.json();
    setHistory(data);
  }

  useEffect(() => {
    loadHistory().catch((error) => {
      console.error(error);
    });
  }, []);

  async function onSubmit(values: GeneratePlayableAdInput) {
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

        <form onSubmit={form.handleSubmit(onSubmit)} className="form">
          <label>
            Game type
            <select {...form.register("gameType")}>
              <option value="runner">runner</option>
              <option value="merge">merge</option>
              <option value="tap-survival">tap-survival</option>
            </select>
          </label>

          <label>
            Theme
            <input {...form.register("theme")} placeholder="space racers" />
          </label>

          <label>
            Target audience
            <select {...form.register("targetAudience")}>
              <option value="casual">casual</option>
              <option value="midcore">midcore</option>
            </select>
          </label>

          <label>
            CTA style
            <select {...form.register("ctaStyle")}>
              <option value="urgent">urgent</option>
              <option value="reward">reward</option>
              <option value="challenge">challenge</option>
            </select>
          </label>

          <label>
            Difficulty
            <select {...form.register("difficulty")}>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Generating..." : "Generate config"}
          </button>
        </form>

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
            <div className="previewCard" style={{ background: result.palette.background }}>
              <div className="previewHeader">
                <span className="badge">{result.gameType}</span>
                <span className="badge">{result.status}</span>
              </div>

              <h3 style={{ color: result.palette.accent }}>{result.headline}</h3>
              <p>{result.objective}</p>

              <div className="miniPlayable">
                <div className="scoreBox">Difficulty: {result.difficultyScore}</div>
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
            <p className="muted">No generations yet.</p>
          ) : (
            history.map((item) => (
              <button
                key={item.output.id}
                className="historyItem"
                onClick={() => {
                  setResult(item.output);
                  setApiError(null);
                }}
                type="button"
              >
                <strong>{item.output.theme}</strong>
                <span>{item.output.gameType}</span>
                <span>{item.provider}</span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

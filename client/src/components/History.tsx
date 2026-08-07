import type { Recommendation, Student, SummaryItem } from "../types";
import { useState, useEffect, useMemo } from "react";
import { getHistory } from "../services/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Change this to FALSE for prod
const useMock = false;

function getStudent(students: Student[], studentId: string): Student | null {
  for (const student of students) {
    if (student.id === studentId) {
      return student;
    }
  }
  return null;
}

interface HistoryProps {
  students: Student[];
  selectedStudentId: string;
}

// == mock data ==
function generateMockData(): SummaryItem[] {
  const out = [];
  const now = new Date();
  const base = [
    [9, 7, 3], // phonological  [low, med, high] starting point
    [6, 5, 4], // orthographic
    [8, 6, 2], // morphological
    [12, 9, 6], // grammar
    [4, 2, 1], // other
  ];
  for (let i = 0; i < 11; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (10 - i) * 12);
    const summary = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ];
    base.forEach((cat, col) => {
      cat.forEach((val, row) => {
        const decay = 1 - i * (0.045 + row * 0.015);
        const noise = Math.sin(i * 1.7 + col * 2.3 + row) * 0.6;
        const next = Math.max(0, Math.round(val * decay + noise));
        summary[row][col] = next;
      });
    });
    out.push({ wordCount: Math.floor(Math.random() * 40) + 20, createdAt: d.toISOString(), summary });
  }
  return out as SummaryItem[];
}


// summary rows    = [low, medium, high]                                  (severity)
// summary columns = [phonological, orthographic, morphological, grammar, other]
interface CategoryDef {
  key: string;
  label: string;
  abbr: string;
  col: number;
}

const CATEGORIES: CategoryDef[] = [
  { key: "phonological", label: "Phonological", abbr: "PH", col: 0 },
  { key: "orthographic", label: "Orthographic", abbr: "OR", col: 1 },
  { key: "morphological", label: "Morphological", abbr: "MO", col: 2 },
  { key: "grammar", label: "Grammar", abbr: "GR", col: 3 },
  { key: "other", label: "Other", abbr: "OT", col: 4 },
];

// Mirrors --ok / --gold / --coral in index.css so the chart matches the
// existing .badge.low/.medium/.high color language used elsewhere in the app.
const SEVERITY_COLOR = {
  low: "#2b6b3f",
  medium: "#a8791f",
  high: "#bd4f28",
};

interface ChartPoint {
  date: string;
  Low: number;
  Medium: number;
  High: number;
  score: number;
}

interface CategoryStat extends CategoryDef {
  points: ChartPoint[];
  delta: number; // % change in weighted severity score, first sample to last
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// High-severity mistakes count for more than low-severity ones, so a shrinking
// total that's still mostly "high" doesn't read as false progress.
function weightedScore(low: number, medium: number, high: number): number {
  return low * 1 + medium * 2 + high * 3;
}

function sparklinePath(values: number[], w: number, h: number): string {
  if (values.length < 2) return "";
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  return values
    .map((v, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - (v / max) * h).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      {payload
        .slice()
        .reverse()
        .map((p) => (
          <div className="chart-tooltip-row" key={p.dataKey}>
            <span>
              <span className="swatch" style={{ background: p.color }} />
              {p.dataKey}
            </span>
            <span>{p.value}</span>
          </div>
        ))}
      <div className="chart-tooltip-total">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </div>
  );
}

function CategoryDetail({ stat }: { stat: CategoryStat }) {
  const hasEnoughData = stat.points.length >= 2;

  if (!hasEnoughData) {
    return (
      <p className="detail-empty">
        Not enough samples yet to chart a trend for {stat.label.toLowerCase()}{" "}
        mistakes. Add another writing sample to see progress here.
      </p>
    );
  }

  const trend = stat.delta < 0 ? "improving" : stat.delta > 0 ? "worsening" : "flat";
  const latestScore = stat.points[stat.points.length - 1].score;

  return (
    <>
      <div>
        <span className="detail-stat-label">
          {stat.label} &middot; weighted severity score
        </span>
        <span className="detail-score">
          {latestScore}
          <span className={`detail-score-delta ${trend}`}>
            {trend === "flat"
              ? "no change"
              : `${trend === "improving" ? "down" : "up"} ${Math.abs(stat.delta)}% since first sample`}
          </span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={stat.points} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="var(--sage-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#7c8a7c" }}
            axisLine={{ stroke: "#d6ddc7" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#7c8a7c" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="Low"
            stackId="1"
            stroke={SEVERITY_COLOR.low}
            fill={SEVERITY_COLOR.low}
            fillOpacity={0.5}
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="Medium"
            stackId="1"
            stroke={SEVERITY_COLOR.medium}
            fill={SEVERITY_COLOR.medium}
            fillOpacity={0.5}
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="High"
            stackId="1"
            stroke={SEVERITY_COLOR.high}
            fill={SEVERITY_COLOR.high}
            fillOpacity={0.5}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="chart-legend">
        <span className="chart-legend-item">
          <span className="chart-legend-swatch low" />
          Low
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-swatch medium" />
          Medium
        </span>
        <span className="chart-legend-item">
          <span className="chart-legend-swatch high" />
          High
        </span>
      </div>
    </>
  );
}

export default function History({ students, selectedStudentId }: HistoryProps) {
  const [historyItems, setHistoryItems] = useState<SummaryItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number>(0);

  const student = getStudent(students, selectedStudentId);

  useEffect(() => {
    if (selectedStudentId === "" || student === null) {
      setHistoryItems([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setActiveCategory(0);
	const history = getHistory(student.id);

	history
      .then((data) => {
        if (isMounted) {
          setHistoryItems(useMock ? generateMockData() : data.summary);
          setRecommendations(useMock ? generateMockData() : data.recommendations);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "An error occurred");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStudentId]);

  const sorted = useMemo(
    () =>
      [...historyItems].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [historyItems]
  );

  const perCategory: CategoryStat[] = useMemo(
    () =>
      CATEGORIES.map((cat) => {
        const points: ChartPoint[] = sorted.map((item) => {
          const low = item.summary?.[0]?.[cat.col] ?? 0;
          const medium = item.summary?.[1]?.[cat.col] ?? 0;
          const high = item.summary?.[2]?.[cat.col] ?? 0;
          return {
            date: fmtDate(item.createdAt),
            Low: low,
            Medium: medium,
            High: high,
            score: weightedScore(low, medium, high),
          };
        });
        const scores = points.map((p) => p.score);
        const first = scores[0] ?? 0;
        const last = scores[scores.length - 1] ?? 0;
        const delta = first === 0 ? (last === 0 ? 0 : 100) : Math.round(((last - first) / first) * 100);
        return { ...cat, points, delta };
      }),
    [sorted]
  );

  if (selectedStudentId === "" || student === null) {
    return <h2 className="card">No student selected</h2>;
  }

  if (loading) {
    return <div className="card">Loading history...</div>;
  }

  if (error) {
    return <div className="card">Error: {error}</div>;
  }

  return (
    <div className="card">
      <div className="history-header">
        <span className="history-eyebrow">Mistake log &middot; by category</span>
        <h2>{student.name}</h2>
      </div>

      {historyItems.length === 0 ? (
        <p className="muted">No history available.</p>
      ) : (
        <>
          <div className="category-tabs">
            {perCategory.map((cat, i) => {
              const isActive = i === activeCategory;
              const trend = cat.delta < 0 ? "improving" : cat.delta > 0 ? "worsening" : "flat";
              const path = sparklinePath(
                cat.points.map((p) => p.score),
                64,
                18
              );
              return (
                <button
                  key={cat.key}
                  type="button"
                  className={`category-tab${isActive ? " active" : ""}`}
                  onClick={() => setActiveCategory(i)}
                  aria-pressed={isActive}
                >
                  <div className="tab-top-row">
                    <span className="tab-abbr">{cat.abbr}</span>
                    <span className={`tab-delta ${trend}`}>
                      {trend === "flat"
                        ? "\u2014"
                        : `${trend === "improving" ? "\u25BC" : "\u25B2"}${Math.abs(cat.delta)}%`}
                    </span>
                  </div>
                  <div className="tab-name">{cat.label}</div>
                  {cat.points.length >= 2 && (
                    <svg
                      className={`tab-sparkline ${trend}`}
                      viewBox="0 0 64 18"
                      preserveAspectRatio="none"
                    >
                      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="category-detail">
            <CategoryDetail stat={perCategory[activeCategory]} />
          </div>
        </>
      )}
      <hr></hr>
      <h2>Accepted recommendations</h2>
      <p className="muted">Listed from most improvement per unit time to least improvement per unit time</p>
      {recommendations.map((recommendation: Recommendation) => (!recommendation.title) ? null : (
        <article key={recommendation.id} className="recommendation-card">
          <div className="recommendation-header">
            <div>
              <h3>{recommendation.title}</h3>
              <p className="muted">
                Category: {recommendation.targetCategory} | Priority:{" "}
                {recommendation.priority}
              </p>
            </div>
            <span className="status-text">{recommendation.status}</span>
          </div>
          <p><strong>Rationale:</strong> {recommendation.rationale}</p>
          <p><strong>Activity:</strong> {recommendation.activity}</p>
        </article>
      ))}
	</div>
  );
}

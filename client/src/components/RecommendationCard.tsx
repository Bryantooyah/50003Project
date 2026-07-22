import type { Recommendation } from "../types";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onUpdateStatus: (
    recommendationId: string,
    status: "accepted" | "rejected"
  ) => void;
}

export default function RecommendationCard({
  recommendation,
  onUpdateStatus,
}: RecommendationCardProps) {
  return (
    <article className="recommendation-card">
      <div>
        <h3>{recommendation.title}</h3>
        <p className="muted">
          Category: {recommendation.targetCategory} | Priority:{" "}
          {recommendation.priority} | Status: {recommendation.status}
        </p>
      </div>

      <p>
        <strong>Rationale:</strong> {recommendation.rationale}
      </p>

      <p>
        <strong>Activity:</strong> {recommendation.activity}
      </p>

      <div className="recommendation-actions">
        <button
          onClick={() => onUpdateStatus(recommendation.id, "accepted")}
          disabled={recommendation.status === "accepted"}
        >
          Accept
        </button>
        <button
          onClick={() => onUpdateStatus(recommendation.id, "rejected")}
          disabled={recommendation.status === "rejected"}
        >
          Reject
        </button>
      </div>
    </article>
  );
}
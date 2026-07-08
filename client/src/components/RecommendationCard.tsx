import type { Recommendation } from "../types";

type Props = {
  recommendation: Recommendation;
  onUpdateStatus: (
    recommendationId: string,
    status: "accepted" | "rejected"
  ) => void;
};

export default function RecommendationCard({
  recommendation,
  onUpdateStatus,
}: Props) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-header">
        <div>
          <h3>{recommendation.title}</h3>
          <p className="muted">Target: {recommendation.targetCategory}</p>
        </div>

        <span className={`badge ${recommendation.priority}`}>
          {recommendation.priority}
        </span>
      </div>

      <p>
        <strong>Rationale:</strong> {recommendation.rationale}
      </p>

      <p>
        <strong>Suggested activity:</strong> {recommendation.activity}
      </p>

      <div className="recommendation-actions">
        {recommendation.status === "pending" ? (
          <>
            <button
              onClick={() => onUpdateStatus(recommendation.id, "accepted")}
            >
              Accept
            </button>
            <button
              className="secondary"
              onClick={() => onUpdateStatus(recommendation.id, "rejected")}
            >
              Reject
            </button>
          </>
        ) : (
          <span className="status-text">
            Feedback logged: {recommendation.status}
          </span>
        )}
      </div>
    </article>
  );
}
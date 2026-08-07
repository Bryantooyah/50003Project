import type {
  AnswerKeyItem,
  WritingSampleFile,
  WritingSampleManifest,
} from "../types";

interface WritingSampleBankProps {
  manifest: WritingSampleManifest | null;
  selectedSampleId: string;
  onSelectSample: (sample: WritingSampleFile) => void;
}

export default function WritingSampleBank({
  manifest,
  selectedSampleId,
  onSelectSample,
}: WritingSampleBankProps) {
  if (!manifest) {
    return (
      <section className="card">
        <h2>Client writing sample bank</h2>
        <p className="muted">Loading writing samples...</p>
      </section>
    );
  }

  const selectedSample = manifest.samples.find(
    (sample) => sample.id === selectedSampleId
  );

  return (
    <section className="card" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px 20px" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>Client writing sample bank</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
        Select a client-provided writing sample
      </p>

      <label htmlFor="sample-bank" style={{ margin: "6px 0 4px", fontSize: "0.85rem" }}>Writing sample</label>
      <select
        id="sample-bank"
        value={selectedSampleId}
        onChange={(event) => {
          const sample = manifest.samples.find(
            (item) => item.id === event.target.value
          );

          if (sample) {
            onSelectSample(sample);
          }
        }}
        style={{ padding: "8px 12px", fontSize: "0.9rem" }}
      >
        <option value="">Choose a writing sample</option>
        {manifest.samples.map((sample) => (
          <option key={sample.id} value={sample.id}>
            {sample.displayName} — {sample.fileType.toUpperCase()}
          </option>
        ))}
      </select>

      {selectedSample && (
        <div className="sample-preview" style={{ marginTop: "0.5rem" }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 4px" }}>{selectedSample.displayName}</h3>
          <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 6px" }}>
            Dataset: {selectedSample.datasetType} | Max mark:{" "}
            {selectedSample.expectedMaxMark}
          </p>

          {selectedSample.fileType === "image" ? (
            <img
              src={`/writing-samples/${selectedSample.fileName}`}
              alt={selectedSample.displayName}
              className="sample-image"
              style={{ maxHeight: "120px", objectFit: "contain" }}
            />
          ) : (
            <iframe
              src={`/writing-samples/${selectedSample.fileName}`}
              title={selectedSample.displayName}
              className="sample-pdf"
              style={{ height: "120px" }}
            />
          )}
        </div>
      )}

      <AnswerKeyTable answerKey={manifest.answerKey} />
    </section>
  );
}

function AnswerKeyTable({ answerKey }: { answerKey: AnswerKeyItem[] }) {
  return (
    <div className="answer-key" style={{ marginTop: "0.75rem" }}>
      <h3 style={{ fontSize: "0.95rem", marginBottom: "0.35rem" }}>Answer key</h3>
      <div className="table-wrapper" style={{ maxHeight: "180px", overflowY: "auto" }}>
        <table style={{ fontSize: "0.82rem" }}>
          <thead>
            <tr>
              <th style={{ padding: "6px 8px" }}>No.</th>
              <th style={{ padding: "6px 8px" }}>Question</th>
              <th style={{ padding: "6px 8px" }}>Expected answer</th>
              <th style={{ padding: "6px 8px" }}>Mark</th>
            </tr>
          </thead>
          <tbody>
            {answerKey.map((item) => (
              <tr key={item.questionNo}>
                <td style={{ padding: "5px 8px" }}>{item.questionNo}</td>
                <td style={{ padding: "5px 8px" }}>{item.question}</td>
                <td style={{ padding: "5px 8px" }}>{item.expectedAnswer}</td>
                <td style={{ padding: "5px 8px" }}>{item.mark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

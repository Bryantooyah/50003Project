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
    <section className="card">
      <h2>Client writing sample bank</h2>
      <p className="muted">
        Select a client-provided writing sample for UC2 analysis. Student
        names are anonymised in the frontend.
      </p>

      <label htmlFor="sample-bank">Writing sample</label>
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
      >
        <option value="">Choose a writing sample</option>
        {manifest.samples.map((sample) => (
          <option key={sample.id} value={sample.id}>
            {sample.displayName} — {sample.fileType.toUpperCase()}
          </option>
        ))}
      </select>

      {selectedSample && (
        <div className="sample-preview">
          <h3>{selectedSample.displayName}</h3>
          <p className="muted">
            Dataset: {selectedSample.datasetType} | Max mark:{" "}
            {selectedSample.expectedMaxMark}
          </p>

          {selectedSample.fileType === "image" ? (
            <img
              src={`/writing-samples/${selectedSample.fileName}`}
              alt={selectedSample.displayName}
              className="sample-image"
            />
          ) : (
            <iframe
              src={`/writing-samples/${selectedSample.fileName}`}
              title={selectedSample.displayName}
              className="sample-pdf"
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
    <div className="answer-key">
      <h3>Answer key</h3>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Question</th>
              <th>Expected answer</th>
              <th>Mark</th>
            </tr>
          </thead>
          <tbody>
            {answerKey.map((item) => (
              <tr key={item.questionNo}>
                <td>{item.questionNo}</td>
                <td>{item.question}</td>
                <td>{item.expectedAnswer}</td>
                <td>{item.mark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { AnalysisResult, ErrorCategory } from "../types";
import { useRef, useState, useEffect } from "react";
import { getCohortAverages } from "../services/api"; // Adjust import path if needed
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ErrorPatternDashboardProps = {
  analysis: AnalysisResult[];
};

const categoryLabels: Record<ErrorCategory, string> = {
  phonological: "Phonological",
  orthographic: "Orthographic",
  morphological: "Morphological",
  grammar: "Grammar",
  other: "Other",
};

export default function LongitudinalView({
  analysis,
}: ErrorPatternDashboardProps) {
  const pdfRef = useRef<HTMLDivElement>(null);

  async function exportPDF() {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.addImage(img, "PNG", 10, 10, 190, 0);
    pdf.save("dashboard.pdf");
  }

  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory>("phonological");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [cohortAverages, setCohortAverages] = useState<Record<ErrorCategory, number> | null>(null);


  useEffect(() => {
    getCohortAverages().then((data) => setCohortAverages(data));
  }, []);

  const safeAnalysis = analysis || [];

  const filteredAnalysis = safeAnalysis.filter((item) => {
    if (!item?.createdAt) return false;
    const itemTime = new Date(item.createdAt).getTime();

    if (startDate && itemTime < new Date(startDate).getTime()) {
      return false;
    }
    if (endDate && itemTime > new Date(endDate).setHours(23, 59, 59, 999)) {
      return false;
    }
    return true;
  });

  const categoryDataSeries = filteredAnalysis.map((item, index) => {
    const rawDate = item?.createdAt ? new Date(item.createdAt) : null;
    const dateStr = rawDate && !isNaN(rawDate.getTime())
      ? rawDate.toLocaleDateString()
      : `Sample ${index + 1}`;

    return {
      id: item.id ? `${item.id}-${index}` : `sample-${index}`,
      date: dateStr,
      count: item.summary?.[selectedCategory] ?? 0,
    };
  });

  const counts = categoryDataSeries.map((d) => d.count);
  const maxCountInSeries = counts.length > 0 ? Math.max(...counts) : 0;
  
  const yMax = Math.max(5, maxCountInSeries);
  const yTicks = Array.from({ length: yMax + 1 }, (_, i) => yMax - i);
  const totalCategoryErrors = counts.reduce((acc, curr) => acc + curr, 0);

  const currentCohortAverage = cohortAverages?.[selectedCategory] ?? 0;

  return (
    <section className="card">
      <h2>Student Error Pattern Dashboard</h2>
      <p className="muted">
        Viewing <strong>{categoryLabels[selectedCategory]}</strong> error trends over time.
      </p>

      <div className="top-bar" style={{ margin: "1rem 0" }}>
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label>Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ErrorCategory)}
          >
            {(Object.keys(categoryLabels) as ErrorCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: "140px" }}>
          <label>From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div style={{ flex: 1, minWidth: "140px" }}>
          <label>To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div ref={pdfRef}>
        <div 
          className="dashboard-metrics" 
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}
        >
          <div className="metric-card">
            <span>Selected Category</span>
            <strong>{categoryLabels[selectedCategory]}</strong>
          </div>

          <div className="metric-card">
            <span>Total Errors Found</span>
            <strong>{totalCategoryErrors}</strong>
          </div>

          <div className="metric-card">
            <span>Samples Analyzed</span>
            <strong>{filteredAnalysis.length}</strong>
          </div>
          <div className="metric-card">
            <span>Cohort Average Error per Sample</span>
            <strong>{currentCohortAverage}</strong>
          </div>
        </div>

        <h3>Frequency Graph ({categoryLabels[selectedCategory]})</h3>

        {categoryDataSeries.length === 0 ? (
          <p className="muted" style={{ margin: "2rem 0" }}>
            No data available for the selected date range.
          </p>
        ) : (
          <div
            className="chart-wrapper"
            style={{
              display: "flex",
              gap: "0.75rem",
              height: "260px",
              marginTop: "1.5rem",
              marginBottom: "2.5rem",
            }}
          >
            <div
              className="chart-y-axis muted"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                fontWeight: "600",
                paddingBottom: "2rem",
                textAlign: "right",
                width: "20px",
                color: "var(--ink-soft)",
              }}
            >
              {yTicks.map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>

            <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  pointerEvents: "none",
                }}
              >
                {yTicks.map((tick) => (
                  <div
                    key={tick}
                    style={{
                      borderBottom: "1px dashed var(--sage-line)",
                      width: "100%",
                      height: 0,
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                  height: "calc(100% - 2rem)",
                  padding: "0 1rem",
                }}
              >
                {categoryDataSeries.map((item) => {
                  const heightPercent = (item.count / yMax) * 100;

                  return (
                    <div
                      key={item.id}
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: "700",
                          marginBottom: "4px",
                          color: "var(--forest-deep)",
                          opacity: item.count > 0 ? 1 : 0.4,
                        }}
                      >
                        {item.count}
                      </span>

                      {/* Thin Bar Fill */}
                      <div
                        style={{
                          width: "28px",
                          height: `${heightPercent}%`,
                          backgroundColor: item.count > 0 ? "var(--forest)" : "var(--sage-line)",
                          borderRadius: "6px 6px 0 0",
                          transition: "height 0.4s ease, background-color 0.3s ease",
                          minHeight: item.count > 0 ? "4px" : "2px",
                        }}
                        title={`${item.date}: ${item.count} errors`}
                      />

                      <span
                        className="muted"
                        style={{
                          position: "absolute",
                          bottom: "-1.8rem",
                          fontSize: "0.78rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.date}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderBottom: "2px solid var(--forest-deep)", width: "100%" }} />
            </div>
          </div>
        )}
      </div>

      <div className="form-footer">
        <button className="btn btn-primary" onClick={exportPDF}>
          Export PDF
        </button>
      </div>
    </section>
  );
}
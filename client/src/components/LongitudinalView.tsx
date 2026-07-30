import type { AnalysisResult, ErrorCategory } from "../types";
import { useRef, useState} from "react";
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

export default function ErrorPatternDashboard({
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

  const safeAnalysis = analysis || [];
  
  const filteredAnalysis = safeAnalysis.filter((item) => {
    const itemTime = new Date(item.createdAt).getTime();

    if (startDate && itemTime < new Date(startDate).getTime()) {
      return false;
    }
    if (endDate && itemTime > new Date(endDate).setHours(23, 59, 59, 999)) {
      return false;
    }
    return true;
  });
  const categoryDataSeries = filteredAnalysis.map((item) => {
    return {
      id: item.id,
      date: new Date(item.createdAt).toLocaleDateString(),
      count: item.summary?.[selectedCategory] ?? 0,
    };
  });
  const counts = categoryDataSeries.map((d) => d.count);
  const maxCountInSeries = counts.length > 0 ? Math.max(...counts) : 1;
  let totalCategoryErrors = 0;
  for (const item of categoryDataSeries) {
    totalCategoryErrors += item.count;
  }
  return (
    <>
      <section className="card">

          <h2>Student Error Pattern Dashboard</h2>
          <p className="muted">
            Viewing <strong>{categoryLabels[selectedCategory]}</strong> error trends over time.
          </p>

          <div className="dashboard-controls" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", margin: "1rem 0" }}>
            <div>
              <label style={{ fontWeight: "bold", display: "block" }}>Category</label>
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

            <div>
              <label style={{ fontWeight: "bold", display: "block" }}>From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontWeight: "bold", display: "block" }}>To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div ref={pdfRef}>
          <div className="dashboard-metrics">
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
          </div>
          <h3>Frequency Graph ({categoryLabels[selectedCategory]})</h3>
          
          {categoryDataSeries.length === 0 ? (
            <p className="muted">No data available for the selected date range.</p>
          ) : (
            <div 
              className="bar-graph-container" 
              style={{ display: "flex", alignItems: "flex-end", gap: "1rem", height: "180px", margin: "1rem 0" }}
            >
              {categoryDataSeries.map((item) => {
                const heightPercent = Math.round((item.count / maxCountInSeries) * 100);

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      flex: 1,
                      height: "100%",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>
                      {item.count}
                    </span>

                    <div
                      className="bar-fill"
                      style={{
                        width: "100%",
                        height: `${Math.max(heightPercent, 5)}%`,
                        transition: "height 0.3s ease",
                      }}
                    />
                    
                    <span style={{ marginTop: "0.5rem" }}>
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <button className="primary-button" onClick={exportPDF}>
          Export PDF
        </button>
      </section>
    </>
  );
}
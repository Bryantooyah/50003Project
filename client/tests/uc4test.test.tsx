import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import LongitudinalView from "../src/components/LongitudinalView";
import { getCohortAverages } from "../src/services/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
jest.mock("../src/services/api", () => ({
  getCohortAverages: jest.fn(),
}));

jest.mock("html2canvas", () => jest.fn());
jest.mock("jspdf", () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  }));
});
const mockAnalysis = [
  {
    id: "1",
    createdAt: "2026-07-01T10:00:00.000Z",
    summary: { phonological: 2, orthographic: 1, morphological: 0, grammar: 1, other: 0 },
  },
  {
    id: "2",
    createdAt: "2026-07-15T10:00:00.000Z",
    summary: { phonological: 4, orthographic: 0, morphological: 1, grammar: 0, other: 0 },
  },
] as any;

describe("UC4 Tests: Longitudinal Analysis Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCohortAverages as jest.Mock).mockResolvedValue({
      phonological: 3,
      orthographic: 1,
      morphological: 2,
      grammar: 1,
      other: 0,
    });
  });


  it("generates a PDF when export button is clicked (UC4-U3)", async () => {
    const mockCanvas = document.createElement("canvas");
    mockCanvas.toDataURL = jest.fn().mockReturnValue("data:image/png;base64,mock");
    (html2canvas as jest.Mock).mockResolvedValue(mockCanvas);

    render(<LongitudinalView analysis={mockAnalysis} />);

    const exportBtn = screen.getByRole("button", { name: /Export PDF/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalled();
    });

    const mockPdfInstance = (jsPDF as unknown as jest.Mock).mock.results[0].value;
    expect(mockPdfInstance.addImage).toHaveBeenCalled();
    expect(mockPdfInstance.save).toHaveBeenCalledWith("dashboard.pdf");
  });
});
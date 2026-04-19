import { jsPDF } from "jspdf";

type Step = {
  step_number: number;
  action: string;
  platform: string;
  mode: string;
  estimated_cost: string;
  prompt_to_use: string;
};

type StrategyForPdf = {
  idea: string;
  total_estimated_cost: string;
  estimated_savings: string;
  time_estimate: string;
  steps: Step[];
};

const PAGE_MARGIN = 48; // pt
const LINE_GAP = 4;

export function downloadStrategyPdf(strategy: StrategyForPdf, filename = "tokensavvy-strategy.pdf") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  // ---------- Branded header ----------
  // Brand colors (matches app gradient-primary feel)
  const brandPrimary: [number, number, number] = [124, 58, 237]; // violet-600
  const brandAccent: [number, number, number] = [236, 72, 153]; // pink-500

  // Top accent bar (full width)
  doc.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.setFillColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.rect(pageWidth * 0.6, 0, pageWidth * 0.4, 6, "F");

  // Logo mark: rounded square with "TS" monogram
  const logoSize = 26;
  const logoX = PAGE_MARGIN;
  const logoY = y;
  doc.setFillColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.roundedRect(logoX, logoY, logoSize, logoSize, 6, 6, "F");
  // Small accent dot on the logo
  doc.setFillColor(brandAccent[0], brandAccent[1], brandAccent[2]);
  doc.circle(logoX + logoSize - 5, logoY + 5, 2.2, "F");
  // Monogram
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TS", logoX + logoSize / 2, logoY + logoSize / 2 + 4, { align: "center" });

  // Wordmark + tagline next to logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(25, 25, 40);
  doc.text("TokenSavvy", logoX + logoSize + 12, logoY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(brandPrimary[0], brandPrimary[1], brandPrimary[2]);
  doc.text("BUILD STRATEGY", logoX + logoSize + 12, logoY + 23);

  y = logoY + logoSize + 18;

  // Thin divider under header
  doc.setDrawColor(228, 226, 240);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y);
  y += 18;

  const writeLines = (
    text: string,
    options: {
      size?: number;
      style?: "normal" | "bold";
      color?: [number, number, number];
      font?: "helvetica" | "courier";
      gapAfter?: number;
      maxWidth?: number;
    } = {},
  ) => {
    const {
      size = 10,
      style = "normal",
      color = [20, 20, 30],
      font = "helvetica",
      gapAfter = 6,
      maxWidth = contentWidth,
    } = options;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text || "", maxWidth);
    const lineHeight = size + LINE_GAP;
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, PAGE_MARGIN, y);
      y += lineHeight;
    }
    y += gapAfter;
  };

  // ---------- Subtitle (branded header rendered above) ----------
  writeLines("A token-optimized plan for your build", {
    size: 10,
    color: [110, 110, 130],
    gapAfter: 14,
  });

  // ---------- Idea ----------
  writeLines("Your idea", { size: 11, style: "bold", gapAfter: 4 });
  writeLines(strategy.idea, { size: 10, color: [60, 60, 75], gapAfter: 14 });

  // ---------- Summary box ----------
  const summaryHeight = 64;
  ensureSpace(summaryHeight + 12);
  doc.setFillColor(245, 244, 250);
  doc.setDrawColor(225, 222, 235);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, summaryHeight, 6, 6, "FD");
  const colWidth = contentWidth / 3;
  const summaryItems: Array<[string, string]> = [
    ["Total cost", strategy.total_estimated_cost || "—"],
    ["Savings", strategy.estimated_savings || "—"],
    ["Time", strategy.time_estimate || "—"],
  ];
  summaryItems.forEach(([label, value], i) => {
    const x = PAGE_MARGIN + colWidth * i + 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 140);
    doc.text(label.toUpperCase(), x, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(25, 25, 40);
    const valueLines = doc.splitTextToSize(value, colWidth - 28);
    doc.text(valueLines.slice(0, 2), x, y + 38);
  });
  y += summaryHeight + 22;

  // ---------- Steps ----------
  writeLines("Build steps", { size: 13, style: "bold", gapAfter: 10 });

  strategy.steps.forEach((step) => {
    // Estimate space for step header (~50pt) so we don't orphan it.
    ensureSpace(60);

    // Step number + action title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(25, 25, 40);
    const titleLines = doc.splitTextToSize(
      `Step ${step.step_number}. ${step.action}`,
      contentWidth,
    );
    titleLines.forEach((line: string) => {
      ensureSpace(14);
      doc.text(line, PAGE_MARGIN, y);
      y += 14;
    });
    y += 2;

    // Meta line: platform · mode · cost
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 130);
    const meta = `${step.platform}  ·  ${step.mode}  ·  Est. ${step.estimated_cost}`;
    ensureSpace(14);
    doc.text(meta, PAGE_MARGIN, y);
    y += 14;

    // Prompt block (monospace, gray background)
    const promptLines = doc.splitTextToSize(step.prompt_to_use || "", contentWidth - 20);
    const lineHeight = 12;
    const blockHeight = promptLines.length * lineHeight + 18;

    // If the block won't fit on this page at all, push to next page.
    if (y + blockHeight > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    // Render block, splitting across pages if it's longer than one page worth.
    let cursor = 0;
    while (cursor < promptLines.length) {
      const available = pageHeight - PAGE_MARGIN - y - 18;
      const linesThatFit = Math.max(1, Math.floor(available / lineHeight));
      const chunk = promptLines.slice(cursor, cursor + linesThatFit);
      const chunkHeight = chunk.length * lineHeight + 18;

      doc.setFillColor(247, 247, 252);
      doc.setDrawColor(228, 226, 240);
      doc.roundedRect(PAGE_MARGIN, y, contentWidth, chunkHeight, 4, 4, "FD");

      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 55);
      chunk.forEach((line: string, idx: number) => {
        doc.text(line, PAGE_MARGIN + 10, y + 14 + idx * lineHeight);
      });

      y += chunkHeight + 8;
      cursor += chunk.length;

      if (cursor < promptLines.length) {
        doc.addPage();
        y = PAGE_MARGIN;
      }
    }

    y += 14; // gap between steps
  });

  // ---------- Footer on every page ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 165);
    doc.text("Generated by TokenSavvy", PAGE_MARGIN, pageHeight - 20);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - PAGE_MARGIN,
      pageHeight - 20,
      { align: "right" },
    );
  }

  doc.save(filename);
}

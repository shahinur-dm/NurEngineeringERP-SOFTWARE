import { GState, jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { amountInWords, formatDateBD } from "@/lib/utils";
import { paymentStatusFromAmounts } from "@/lib/sale-finance";

type Kind = "bill" | "quotation" | "challan";

type Item = {
  name?: string;
  sku?: string;
  description?: string;
  imageUrl?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  lineTotal?: number;
  remarks?: string;
};

export type TradePdfSale = {
  invoiceNo?: string;
  quotationNo?: string;
  salesOrderNo?: string;
  referenceNo?: string;
  poNo?: string;
  poDate?: Date | string;
  subject?: string;
  terms?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  items?: Item[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  note?: string;
  soldByName?: string;
  saleDate?: Date | string;
};

export type TradePdfBusiness = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
};

function dash(v?: string | number | null) {
  if (v == null || v === "") return "";
  return String(v);
}

function enDate(v?: Date | string) {
  if (!v) return "";
  return formatDateBD(v, "en");
}

function taka(n?: number) {
  return `${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}/-`;
}

function companyLetterhead(name?: string) {
  const v = String(name || "").trim();
  if (!v || /erp|\bpos\b/i.test(v) || /[^\u0000-\u007f]/.test(v)) {
    return "Nur Engineering Solution";
  }
  return v;
}

function englishName(name?: string, fallback = "Md. Nurul Islam") {
  const v = String(name || "").trim();
  if (!v || /[^\u0000-\u007f]/.test(v) || /admin/i.test(v)) return fallback;
  return v;
}

function wechatId(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `nurul${digits.replace(/^880/, "")}` : "";
}

async function loadImageDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") || "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function pdfImageFormat(dataUrl: string) {
  if (dataUrl.includes("image/png")) return "PNG";
  if (dataUrl.includes("image/webp")) return "WEBP";
  return "JPEG";
}

export async function buildTradePdf(opts: {
  kind: Kind;
  sale: TradePdfSale;
  business?: TradePdfBusiness | null;
  challanNo?: string;
  challanItems?: Item[];
  headerFooter?: boolean;
}) {
  const { kind, sale, business } = opts;
  const headerFooter = opts.headerFooter !== false;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bizName = companyLetterhead(business?.name);
  const items = (kind === "challan" && opts.challanItems?.length ? opts.challanItems : sale.items) || [];
  const date = enDate(sale.saleDate);
  const m = 10;
  const boxW = 62;
  const logoData = business?.logoUrl ? await loadImageDataUrl(business.logoUrl) : null;
  const footerH = 16;

  function drawLetterhead() {
    if (!headerFooter) return;
    if (logoData) {
      try {
        doc.addImage(logoData, pdfImageFormat(logoData), m, 9, 18, 18);
      } catch {
        /* skip */
      }
    } else {
      doc.setFillColor(22, 63, 134);
      doc.circle(m + 9, 18, 9, "F");
      doc.setDrawColor(232, 137, 44);
      doc.setLineWidth(0.8);
      doc.circle(m + 9, 18, 7.2, "S");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("NES", m + 9, 19.4, { align: "center" });
      doc.setTextColor(20);
    }

    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 79, 160);
    doc.setFontSize(17);
    doc.text(bizName, pageW / 2, 16, { align: "center" });
    doc.setTextColor(196, 94, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Machine, Spare parts and Technical Service Provider", pageW / 2, 21.5, { align: "center" });
    doc.setTextColor(20);

    const officeFill = kind === "quotation" ? [236, 236, 236] : [215, 238, 248];
    doc.setFillColor(officeFill[0], officeFill[1], officeFill[2]);
    doc.setDrawColor(51);
    doc.rect(pageW - m - boxW, 8, boxW, 20, "FD");
    doc.setFontSize(7);
    const officeLines = [
      business?.address ? `Office: ${business.address}` : "",
      business?.email ? `Email: ${business.email}` : "",
      business?.phone ? `Mobile: ${business.phone}` : "",
    ].filter(Boolean);
    let oy = 12;
    officeLines.forEach((line) => {
      doc.text(line, pageW - m - boxW + 2, oy, { maxWidth: boxW - 4 });
      oy += 4.4;
    });

    doc.setDrawColor(232, 137, 44);
    doc.setLineWidth(1.1);
    doc.line(m, 30, pageW - m, 30);
    doc.setDrawColor(0);
    doc.setLineWidth(0.25);
    doc.line(m, 31.3, pageW - m, 31.3);
  }

  drawLetterhead();
  doc.setTextColor(20);

  const meta: [string, string][] =
    kind === "bill"
      ? [
          ["Bill No:", dash(sale.invoiceNo)],
          ["Challan No:", dash(opts.challanNo)],
          ["Ref. No:", dash(sale.referenceNo)],
          ["PO/Order No:", dash(sale.poNo || sale.salesOrderNo)],
          ["PO/Order Date:", enDate(sale.poDate)],
        ]
      : kind === "challan"
        ? [
            ["Challan No:", dash(opts.challanNo)],
            ["PI No:", dash(sale.quotationNo)],
            ["Ref. No:", dash(sale.referenceNo)],
            ["PO/Order No:", dash(sale.poNo || sale.salesOrderNo)],
            ["PO/Order Date:", enDate(sale.poDate)],
          ]
        : [
            ["Date:", date],
            ["Quotation /PI No:", dash(sale.quotationNo)],
            ["Ref. No.:", dash(sale.referenceNo)],
          ];

  autoTable(doc, {
    startY: 34,
    margin: { left: pageW - m - boxW, right: m },
    tableWidth: boxW,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.3, textColor: 20, lineColor: 40, lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28, fillColor: kind === "quotation" ? [236, 236, 236] : [207, 232, 245] },
      1: { cellWidth: 34 },
    },
    body: meta,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaBottom = ((doc as any).lastAutoTable?.finalY || 55) as number;

  if (kind !== "quotation") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Date: ${date}`, m, 38);
    const title = kind === "bill" ? "Bill" : "Delivery Challan";
    doc.setFontSize(14);
    doc.text(title, pageW / 2, 42, { align: "center" });
    const tw = doc.getTextWidth(title);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - tw / 2, 43.2, pageW / 2 + tw / 2, 43.2);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("To", m, kind === "quotation" ? 38 : 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let ty = kind === "quotation" ? 43 : 57;
  doc.text(sale.customerName || "", m, ty);
  ty += 5;
  if (sale.customerAddress) {
    const addr = doc.splitTextToSize(sale.customerAddress, 110);
    doc.text(addr, m, ty);
    ty += addr.length * 4.2;
  }

  const subject = sale.subject || (kind === "quotation" ? "" : sale.note) || "";
  let y = Math.max(ty + 3, kind === "quotation" ? 48 : metaBottom + 2);
  if (subject) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const sub = doc.splitTextToSize(`Subject: ${subject}`, pageW - m * 2 - boxW - 8);
    doc.text(sub, m, y);
    y += sub.length * 4.2 + 2;
  }

  if (kind !== "quotation") {
    autoTable(doc, {
      startY: y,
      margin: { left: m, right: m },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2, lineColor: 40, lineWidth: 0.2 },
      body: [[`Customer: ${sale.customerName || ""}`, `Contact: ${sale.customerMobile || ""}`]],
      columnStyles: { 0: { cellWidth: (pageW - m * 2) / 2 }, 1: { cellWidth: (pageW - m * 2) / 2 } },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY || y) + 6;
  } else {
    y = Math.max(y, metaBottom + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Dear Sir,", m, y);
    y += 5;
    const intro = [
      "Thank you for your inquiry. We are submitting herewith our quotation for the following items / services.",
      "We are a Machine, Spare parts and Technical Service Provider with expertise in PLC automation, servo systems, robotics and industrial machinery.",
    ];
    intro.forEach((para) => {
      const lines = doc.splitTextToSize(para, pageW - m * 2);
      doc.text(lines, m, y);
      y += lines.length * 4.2 + 2;
    });
    y += 2;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(kind === "quotation" ? "Quotation" : "Items/Services:", pageW / 2, y, { align: "center" });
  y += 3;

  const head =
    kind === "challan"
      ? [["SL No.", "Item Name", "Description", "Quantity (Piece)", "Remarks"]]
      : [["SL No.", "Item Name", "Description", "Quantity (Piece)", "Unit Price (Taka)", "Total Price (Taka)"]];

  const itemRows = items.map((item, idx) => {
    if (kind === "challan") {
      return [idx + 1, item.name || "", item.description || "", String(item.qty ?? 0), item.remarks || ""];
    }
    return [
      idx + 1,
      item.name || "",
      item.description || "",
      String(item.qty ?? 0),
      Number(item.unitPrice || 0).toLocaleString("en-IN"),
      Number(item.lineTotal || 0).toLocaleString("en-IN"),
    ];
  });
  const totalRows: (string | number)[][] = [];
  if (kind === "bill") {
    if (Number(sale.discount || 0)) totalRows.push(["", "", "", "", "Discount", taka(sale.discount)]);
    if (Number(sale.tax || 0)) totalRows.push(["", "", "", "", "Tax", taka(sale.tax)]);
    if (Number(sale.shipping || 0)) totalRows.push(["", "", "", "", "Shipping", taka(sale.shipping)]);
  }
  if (kind !== "challan") {
    totalRows.push(["", "", "", "", kind === "quotation" ? "Total Price =" : "Total Bill =", taka(sale.grandTotal)]);
  } else {
    const qtyTotal = items.reduce((a, i) => a + Number(i.qty || 0), 0);
    totalRows.push(["", "", "Total =", String(qtyTotal), ""]);
  }

  const PAGE_ROWS = 10;
  const tableOpts = {
    head,
    margin: { left: m, right: m, bottom: 22 },
    styles: { fontSize: 8, cellPadding: 2, valign: "top" as const, minCellHeight: 14, lineColor: 30, lineWidth: 0.2 },
    headStyles: { fillColor: [234, 214, 176] as [number, number, number], textColor: 20, fontStyle: "bold" as const, halign: "center" as const },
    columnStyles: (kind === "challan"
      ? { 0: { cellWidth: 16, halign: "center" as const }, 2: { cellWidth: 70 }, 3: { halign: "center" as const } }
      : {
          0: { cellWidth: 14, halign: "center" as const },
          2: { cellWidth: 58 },
          3: { halign: "center" as const },
          4: { halign: "center" as const },
          5: { halign: "center" as const },
        }) as Record<string, { cellWidth?: number; halign?: "center" }>,
  };

  const chunks: typeof itemRows[] = [];
  for (let i = 0; i < Math.max(itemRows.length, 1); i += PAGE_ROWS) {
    chunks.push(itemRows.slice(i, i + PAGE_ROWS));
  }
  if (!chunks.length) chunks.push([]);

  chunks.forEach((chunk, pageIdx) => {
    if (pageIdx > 0) {
      doc.addPage();
      drawLetterhead();
      y = 36;
    }
    const isLast = pageIdx === chunks.length - 1;
    autoTable(doc, {
      ...tableOpts,
      startY: y,
      body: isLast ? [...chunk, ...totalRows] : chunk,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY || y) + 6;
  });
  const footerReserve = 22;
  if (y > pageH - footerReserve - 48) {
    doc.addPage();
    drawLetterhead();
    y = 36;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  if (kind !== "challan") {
    doc.setFont("helvetica", "bold");
    doc.text(`In Word: ${amountInWords(sale.grandTotal || 0, "en")}`, pageW - m, y, {
      align: "right",
      maxWidth: pageW - m * 2,
    });
    y += 7;
  }
  if (kind === "bill") {
    const pay = paymentStatusFromAmounts(sale.grandTotal || 0, sale.paidAmount || 0);
    const payLabel = pay === "paid" ? "Paid" : pay === "partial" ? "Partial Paid" : "Due";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(
      `Paid Amount: ${taka(sale.paidAmount)}    Due Amount: ${taka(sale.dueAmount)}    Payment Status: ${payLabel}`,
      m,
      y,
    );
    y += 8;
  }

  doc.setFont("helvetica", "normal");
  const savedTermLines = (sale.terms || "").split("\n").filter((line) => line.trim());
  if (kind !== "quotation" && savedTermLines.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Terms & Conditions", m, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    savedTermLines.forEach((line) => {
      doc.text(`◆  ${line.replace(/^[-•◆]\s*/, "").trim()}`, m, y, {
        maxWidth: pageW - m * 2,
      });
      y += 4.2;
    });
    y += 4;
  }
  if (kind === "quotation") {
    const lines = (sale.terms || "").split("\n").filter((l) => l.trim());
    if (lines.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Terms & Conditions", m, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      lines.forEach((line) => {
        doc.text(`◆  ${line.replace(/^[-•◆]\s*/, "").trim()}`, m, y, { maxWidth: pageW - m * 2 });
        y += 4.2;
      });
      y += 1;
      doc.text("Please sign back to us if you confirm this P.I/Quotation.", m, y);
      y += 8;
    }
  } else {
    doc.setFontSize(8);
    const note =
      "Already we have supplied these services/items with good condition to your company. Now please check our bill and take necessary action to pay our bill accordingly. If you have any confusion or have any query then please inform to us feel freely and we will support you accordingly.";
    const noteLines = doc.splitTextToSize(note, pageW - m * 2);
    doc.text(noteLines, m, y);
    y += noteLines.length * 3.8 + 4;
    doc.text(`- ${bizName}`, pageW - m, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.rect(pageW / 2 - 38, y - 4, 76, 8);
    doc.text("24/7 Best Deal, Best Service", pageW / 2, y + 1.5, { align: "center" });
    y += 18;
  }

  const signY = pageH - footerH - 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.line(m, signY, m + 50, signY);
  doc.line(pageW - m - 55, signY, pageW - m, signY);
  doc.text(kind === "quotation" ? "(Customer Signature)" : "(Receiver Signature)", m, signY + 5);
  doc.setFont("helvetica", "bold");
  doc.text(englishName(sale.soldByName), pageW - m, signY + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Proprietor, ${bizName}`, pageW - m, signY + 9, { align: "right" });

  const wechat = wechatId(business?.phone);
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (headerFooter) {
      try {
        doc.setGState(new GState({ opacity: 0.12 }));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.setTextColor(150);
        doc.text("Nur Engineering Solution", pageW / 2, 145, { align: "center", angle: 32 });
        doc.setGState(new GState({ opacity: 1 }));
      } catch {
        /* watermark optional */
      }
      doc.setTextColor(20);
      doc.setFillColor(143, 201, 184);
      doc.rect(0, pageH - footerH, pageW, footerH, "F");
      doc.setFontSize(7);
      doc.setTextColor(20);
      doc.text(`Office Address : ${business?.address || ""}`, pageW / 2, pageH - 10.5, {
        align: "center",
        maxWidth: pageW - 16,
      });
      doc.text(
        [
          business?.phone ? `Mobile/WhatsApp: ${business.phone}` : "",
          wechat ? `Wechat: ${wechat}` : "",
          business?.website ? `Website: ${business.website}` : "",
          business?.email ? `Email: ${business.email}` : "",
        ]
          .filter(Boolean)
          .join("  ,  "),
        pageW / 2,
        pageH - 6,
        { align: "center", maxWidth: pageW - 16 },
      );
    }
  }

  return doc;
}

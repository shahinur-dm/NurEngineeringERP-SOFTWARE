import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth";
import { Sale, Business } from "@/models";
import { amountInWords, formatDateBD } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") || "pdf";
  const locale = (new URL(req.url).searchParams.get("locale") || "bn") as "bn" | "en";

  await connectDB();
  const sale = await Sale.findById(id).lean();
  const business = await Business.findOne().lean();
  if (!sale) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const bizName = locale === "bn" && business?.nameBn ? business.nameBn : business?.name || "DIT POS";
  const bizAddress =
    locale === "bn" && business?.addressBn ? business.addressBn : business?.address || "";

  if (format === "excel") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(locale === "bn" ? "চালান" : "Invoice");
    wb.creator = "DIT POS";

    ws.mergeCells("A1:G1");
    ws.getCell("A1").value = bizName;
    ws.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF1E6BB8" } };

    ws.mergeCells("A2:G2");
    ws.getCell("A2").value =
      locale === "bn" ? "বিক্রয় চালান / ট্যাক্স ইনভয়েস" : "Sales Invoice / Tax Invoice";
    ws.getCell("A2").font = { bold: true, size: 12 };

    ws.addRow([]);
    ws.addRow([
      locale === "bn" ? "চালান নং" : "Invoice No",
      sale.invoiceNo,
      "",
      locale === "bn" ? "তারিখ" : "Date",
      formatDateBD(sale.saleDate, locale),
    ]);
    ws.addRow([
      locale === "bn" ? "বিল প্রাপক" : "Bill To",
      sale.customerName,
      "",
      "BIN",
      business?.bin || "",
    ]);
    ws.addRow([
      locale === "bn" ? "মোবাইল" : "Mobile",
      sale.customerMobile || "",
      "",
      "TIN",
      business?.tin || "",
    ]);
    ws.addRow([
      locale === "bn" ? "ঠিকানা" : "Address",
      sale.customerAddress || "",
      "",
      "Mushak",
      business?.mushak || "",
    ]);
    ws.addRow([]);

    const headerRow = ws.addRow([
      locale === "bn" ? "ক্রমিক" : "SL",
      locale === "bn" ? "পণ্যের বিবরণ" : "Description",
      locale === "bn" ? "এসকেইউ" : "SKU",
      locale === "bn" ? "পরিমাণ" : "Qty",
      locale === "bn" ? "দর" : "Rate",
      locale === "bn" ? "ছাড়" : "Discount",
      locale === "bn" ? "মূল্য" : "Amount",
    ]);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E6BB8" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    sale.items.forEach((item: {
      name?: string;
      sku?: string;
      qty: number;
      unitPrice: number;
      discount?: number;
      lineTotal: number;
    }, idx: number) => {
      ws.addRow([
        idx + 1,
        item.name,
        item.sku || "",
        item.qty,
        item.unitPrice,
        item.discount || 0,
        item.lineTotal,
      ]);
    });

    ws.addRow([]);
    ws.addRow(["", "", "", "", "", locale === "bn" ? "উপমোট" : "Subtotal", sale.subtotal]);
    ws.addRow(["", "", "", "", "", locale === "bn" ? "ছাড়" : "Discount", sale.discount]);
    ws.addRow(["", "", "", "", "", locale === "bn" ? "কর" : "Tax", sale.tax]);
    ws.addRow(["", "", "", "", "", locale === "bn" ? "পরিবহন" : "Shipping", sale.shipping || 0]);
    const totalRow = ws.addRow([
      "",
      "",
      "",
      "",
      "",
      locale === "bn" ? "সর্বমোট" : "Grand Total",
      sale.grandTotal,
    ]);
    totalRow.font = { bold: true };
    ws.addRow(["", "", "", "", "", locale === "bn" ? "পরিশোধিত" : "Paid", sale.paidAmount]);
    ws.addRow(["", "", "", "", "", locale === "bn" ? "বাকি" : "Due", sale.dueAmount]);
    ws.addRow([]);
    ws.addRow([
      locale === "bn" ? "কথায়" : "In words",
      amountInWords(sale.grandTotal, locale),
    ]);

    ws.columns.forEach((col, i) => {
      col.width = i === 1 ? 28 : 14;
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${sale.invoiceNo}.xlsx"`,
      },
    });
  }

  // PDF — Bangladesh professional tax invoice layout
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 110, 86);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(bizName, 14, 12);
  doc.setFontSize(10);
  doc.text(locale === "bn" ? "বিক্রয় চালান / ট্যাক্স ইনভয়েস" : "SALES INVOICE / TAX INVOICE", 14, 20);
  doc.text(sale.invoiceNo, pageW - 14, 12, { align: "right" });
  doc.text(formatDateBD(sale.saleDate, locale), pageW - 14, 20, { align: "right" });

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  let y = 36;
  doc.text(bizAddress || "", 14, y);
  y += 5;
  doc.text(`Phone: ${business?.phone || ""}  |  ${business?.email || ""}`, 14, y);
  y += 5;
  doc.text(
    `BIN: ${business?.bin || "-"}   TIN: ${business?.tin || "-"}   Mushak: ${business?.mushak || "-"}`,
    14,
    y,
  );

  y += 10;
  doc.setFillColor(230, 244, 239);
  doc.rect(14, y - 5, pageW - 28, 22, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(locale === "bn" ? "বিল প্রাপক / Bill To" : "Bill To", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(sale.customerName || "", 16, y + 6);
  doc.text(sale.customerMobile || "", 16, y + 12);
  doc.text(sale.customerAddress || "", 80, y + 6);

  y += 24;
  autoTable(doc, {
    startY: y,
    head: [
      [
        locale === "bn" ? "ক্রমিক" : "SL",
        locale === "bn" ? "পণ্যের বিবরণ" : "Description",
        "SKU",
        locale === "bn" ? "পরিমাণ" : "Qty",
        locale === "bn" ? "দর" : "Rate",
        locale === "bn" ? "মূল্য" : "Amount",
      ],
    ],
    body: sale.items.map((item: {
      name?: string;
      sku?: string;
      qty: number;
      unitPrice: number;
      lineTotal: number;
    }, idx: number) => [
      idx + 1,
      item.name || "",
      item.sku || "",
      item.qty,
      Number(item.unitPrice).toFixed(2),
      Number(item.lineTotal).toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [13, 110, 86], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 250, 247] },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((doc as any).lastAutoTable?.finalY || y + 40) + 8;
  const rightX = pageW - 14;

  doc.setFontSize(10);
  const rows = [
    [locale === "bn" ? "উপমোট" : "Subtotal", sale.subtotal],
    [locale === "bn" ? "ছাড়" : "Discount", sale.discount],
    [locale === "bn" ? "কর" : "Tax / VAT", sale.tax],
    [locale === "bn" ? "পরিবহন" : "Shipping", sale.shipping],
    [locale === "bn" ? "সর্বমোট" : "Grand Total", sale.grandTotal],
    [locale === "bn" ? "পরিশোধিত" : "Paid", sale.paidAmount],
    [locale === "bn" ? "বাকি" : "Due", sale.dueAmount],
  ];

  let ty = finalY;
  rows.forEach(([label, value], idx) => {
    if (idx === 4) doc.setFont("helvetica", "bold");
    else doc.setFont("helvetica", "normal");
    doc.text(String(label), rightX - 55, ty);
    doc.text(`BDT ${Number(value).toFixed(2)}`, rightX, ty, { align: "right" });
    ty += 6;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `${locale === "bn" ? "কথায়" : "In words"}: ${amountInWords(sale.grandTotal, locale)}`,
    14,
    ty + 4,
    { maxWidth: pageW - 28 },
  );

  ty += 22;
  doc.line(14, ty, 70, ty);
  doc.line(pageW - 70, ty, pageW - 14, ty);
  doc.text(locale === "bn" ? "গ্রহণকারীর স্বাক্ষর" : "Receiver Signature", 14, ty + 5);
  doc.text(locale === "bn" ? "অনুমোদিত স্বাক্ষর" : "Authorized Signature", pageW - 70, ty + 5);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    locale === "bn"
      ? "ব্যবসার জন্য ধন্যবাদ | কম্পিউটার জেনারেটেড চালান"
      : "Thank you for your business | Computer generated invoice",
    pageW / 2,
    287,
    { align: "center" },
  );

  const pdf = doc.output("arraybuffer");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sale.invoiceNo}.pdf"`,
    },
  });
}

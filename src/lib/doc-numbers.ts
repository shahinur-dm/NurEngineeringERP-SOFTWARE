import { Business, Sale, nextSeq } from "@/models";
import { generateDocNo } from "@/lib/utils";

function currentYear() {
  return new Date().getFullYear();
}

/** NES + YEAR + 5-digit sequence, unique per year (atomic counter). */
export async function nextQuotationNo() {
  const year = currentYear();
  const seq = await nextSeq(`nes_qtn_${year}`);
  return `NES${year}${String(seq).padStart(5, "0")}`;
}

/** NES + YEAR + 6-digit sequence starting at 101 → NES2026000101. */
export async function nextReferenceNo() {
  const year = currentYear();
  const seq = await nextSeq(`nes_ref_${year}`, 100);
  return `NES${year}${String(seq).padStart(6, "0")}`;
}

export async function nextSalesOrderNo() {
  return generateDocNo("SO", await nextSeq("sales_order"));
}

export async function nextInvoiceNo() {
  const business = await Business.findOne().lean();
  return generateDocNo(business?.invoicePrefix || "INV", await nextSeq("sale"));
}

export async function nextChallanNo() {
  return generateDocNo("DC", await nextSeq("shipment"));
}

let saleIndexesReady = false;

/** Quotations omit Bill No; sparse unique indexes allow that without colliding on null. */
export async function ensureSaleNumberIndexes() {
  if (saleIndexesReady) return;
  try {
    const indexes = await Sale.collection.indexes();
    const inv = indexes.find((i) => i.key && (i.key as { invoiceNo?: number }).invoiceNo === 1);
    if (inv?.name && !inv.sparse) {
      await Sale.collection.dropIndex(inv.name);
    }
    const qtn = indexes.find((i) => i.key && (i.key as { quotationNo?: number }).quotationNo === 1);
    if (qtn?.name && (qtn as { partialFilterExpression?: { status?: string } }).partialFilterExpression?.status !== "quotation") {
      await Sale.collection.dropIndex(qtn.name);
    }
    const ref = indexes.find((i) => i.key && (i.key as { referenceNo?: number }).referenceNo === 1);
    if (ref?.name && !ref.partialFilterExpression) {
      await Sale.collection.dropIndex(ref.name);
    }
  } catch {
    /* first boot / missing collection */
  }
  try {
    await Sale.collection.createIndex({ invoiceNo: 1 }, { unique: true, sparse: true });
    await Sale.collection.createIndex(
      { quotationNo: 1 },
      { unique: true, sparse: true, partialFilterExpression: { status: "quotation" } },
    );
    await Sale.collection.createIndex({ salesOrderNo: 1 }, { unique: true, sparse: true });
    await Sale.collection.createIndex(
      { referenceNo: 1 },
      { unique: true, sparse: true, partialFilterExpression: { sourceQuotationId: { $exists: false } } },
    );
  } catch {
    /* already exists */
  }
  saleIndexesReady = true;
}

export { DEFAULT_QUOTATION_TERMS } from "@/lib/default-document-body";

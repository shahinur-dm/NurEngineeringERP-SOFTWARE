import { Business, Sale, nextSeq } from "@/models";
import { generateDocNo } from "@/lib/utils";

export async function nextQuotationNo() {
  return generateDocNo("QTN", await nextSeq("quotation"));
}

export async function nextReferenceNo() {
  return generateDocNo("REF", await nextSeq("sale_ref"));
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
  } catch {
    /* first boot / missing collection */
  }
  try {
    await Sale.collection.createIndex({ invoiceNo: 1 }, { unique: true, sparse: true });
    await Sale.collection.createIndex({ quotationNo: 1 }, { unique: true, sparse: true });
    await Sale.collection.createIndex({ salesOrderNo: 1 }, { unique: true, sparse: true });
    await Sale.collection.createIndex({ referenceNo: 1 });
  } catch {
    /* already exists */
  }
  saleIndexesReady = true;
}

export const DEFAULT_QUOTATION_TERMS = [
  "Term of validity: 15 days.",
  "Payment: 100% advance for order confirmation OR as per company policy.",
  "Delivery area: Items delivered from stock area in Dhaka (customer's own arrangement).",
  "Delivery Time: Ready stock item.",
  "VAT, Tax etc.: Excluded.",
  "Please sign back to us if you confirm this P.I / Quotation.",
].join("\n");

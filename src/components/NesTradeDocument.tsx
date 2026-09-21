"use client";

import { paymentStatusFromAmounts } from "@/lib/sale-finance";
import { amountInWords, formatDateBD } from "@/lib/utils";
import { DEFAULT_DOCUMENT_BODY } from "@/lib/default-document-body";
import { resolveDocumentSubject } from "@/lib/document-subject";

export type TradeDocKind = "bill" | "quotation" | "challan";

export type TradeItem = {
  name?: string;
  sku?: string;
  unit?: string;
  description?: string;
  imageUrl?: string;
  qty?: number;
  unitPrice?: number;
  discount?: number;
  lineTotal?: number;
  remarks?: string;
};

export type TradeSale = {
  _id?: string;
  invoiceNo?: string;
  quotationNo?: string;
  salesOrderNo?: string;
  referenceNo?: string;
  poNo?: string;
  poDate?: string;
  subject?: string;
  documentBody?: string;
  terms?: string;
  status?: string;
  customerName?: string;
  customerMobile?: string;
  customerAddress?: string;
  items?: TradeItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  note?: string;
  soldByName?: string;
  saleDate?: string;
};

export type TradeBusiness = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
};

export type TradeChallan = {
  shipmentNo?: string;
  shippedDate?: string;
  items?: TradeItem[];
};

function dash(value?: string | number | null) {
  if (value === 0) return "0";
  if (value == null || value === "") return "";
  return String(value);
}

function formatEnDate(value?: string) {
  if (!value) return "";
  return formatDateBD(value, "en");
}

function taka(n?: number) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}/-`;
}

function paymentLabel(grandTotal?: number, paidAmount?: number) {
  const status = paymentStatusFromAmounts(grandTotal || 0, paidAmount || 0);
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial Paid";
  return "Due";
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
  if (!v) return fallback;
  if (/[^\u0000-\u007f]/.test(v)) return fallback;
  if (/admin/i.test(v)) return fallback;
  return v;
}

function wechatId(phone?: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `nurul${digits.replace(/^880/, "")}` : "";
}

export function NesTradeDocument({
  kind,
  sale,
  business,
  challan,
  showChrome = true,
}: {
  kind: TradeDocKind;
  sale: TradeSale;
  business?: TradeBusiness | null;
  challan?: TradeChallan | null;
  locationName?: string;
  showChrome?: boolean;
}) {
  const bizName = companyLetterhead(business?.name);
  const bizAddress = business?.address || "";
  const items = (kind === "challan" && challan?.items?.length ? challan.items : sale.items) || [];
  const docDate = kind === "challan" ? challan?.shippedDate || sale.saleDate : sale.saleDate;
  const terms = (sale.terms || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const qtyTotal = items.reduce((a, i) => a + Number(i.qty || 0), 0);
  const wechat = wechatId(business?.phone);
  const signName = englishName(sale.soldByName);
  const ITEMS_PER_PAGE = 999;
  const itemPages: TradeItem[][] = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    itemPages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  if (!itemPages.length) itemPages.push([]);

  const metaRows: { label: string; value: string }[] =
    kind === "bill"
      ? [
          { label: "Bill No", value: dash(sale.invoiceNo) },
          { label: "Challan No", value: dash(challan?.shipmentNo) },
          { label: "Ref. No", value: dash(sale.referenceNo) },
          { label: "PO/Order No", value: dash(sale.poNo || sale.salesOrderNo) },
          { label: "PO/Order Date", value: formatEnDate(sale.poDate) },
        ]
      : kind === "challan"
        ? [
            { label: "Challan No", value: dash(challan?.shipmentNo) },
            { label: "PI No", value: dash(sale.quotationNo) },
            { label: "Ref. No", value: dash(sale.referenceNo) },
            { label: "PO/Order No", value: dash(sale.poNo || sale.salesOrderNo) },
            { label: "PO/Order Date", value: formatEnDate(sale.poDate) },
          ]
        : [
            { label: "Date", value: formatEnDate(docDate) },
            { label: "Quotation /PI No", value: dash(sale.quotationNo) },
            { label: "Ref. No.", value: dash(sale.referenceNo) },
          ];

  const title = kind === "bill" ? "Bill" : kind === "challan" ? "Delivery Challan" : "";
  const subject = resolveDocumentSubject({
    stored: sale.subject,
    terms: sale.terms,
    note: sale.note,
    items,
  });
  const documentBody =
    sale.documentBody === undefined || sale.documentBody === null
      ? DEFAULT_DOCUMENT_BODY
      : String(sale.documentBody);
  const documentBodyParas = documentBody.split(/\r?\n/);

  return (
    <>
      {itemPages.map((pageItems, pageIdx) => {
        const isLast = pageIdx === itemPages.length - 1;
        const slOffset = pageIdx * ITEMS_PER_PAGE;
        return (
    <article
      key={pageIdx}
      className={`nes-sheet nes-${kind}${showChrome ? "" : " nes-no-chrome"}`}
    >
      {showChrome ? (
        <div className="nes-watermark" aria-hidden>
          Nur Engineering Solution
        </div>
      ) : null}

      <header className="nes-head">
        <div className="nes-logo">
          {business?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt="" />
          ) : (
            <span className="nes-logo-mark">
              NES
              <small>NUR ENGINEERING SOLUTION</small>
            </span>
          )}
        </div>
        <div className="nes-brand">
          <p className="nes-company">{bizName}</p>
          <p className="nes-tagline">Machine, Spare parts and Technical Service Provider</p>
        </div>
        <div className="nes-office">
          {bizAddress ? (
            <p>
              <b>Office:</b> {bizAddress}
            </p>
          ) : null}
          {business?.email ? (
            <p>
              <b>Email:</b> <span className="nes-mail">{business.email}</span>
            </p>
          ) : null}
          {business?.phone ? (
            <p>
              <b>Mobile:</b> {business.phone}
            </p>
          ) : null}
        </div>
      </header>
      <div className="nes-rule" />

      <div className="nes-body">
      {pageIdx === 0 ? (
        kind !== "quotation" ? (
        <div className="nes-docband">
          <p className="nes-date">
            <b>Date:</b> {formatEnDate(docDate)}
          </p>
          <p className="nes-title">{title}</p>
          <table className="nes-idbox">
            <tbody>
              {metaRows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}:</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="nes-quote-top">
          <div className="nes-party">
            <p className="nes-to">
              <b>To</b>
              <br />
              {sale.customerName || ""}
              {sale.customerAddress ? (
                <>
                  <br />
                  {sale.customerAddress}
                </>
              ) : null}
            </p>
          </div>
          <table className="nes-idbox">
            <tbody>
              {metaRows.map((row) => (
                <tr key={row.label}>
                  <th>{row.label}:</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      ) : null}

      {pageIdx === 0 && subject ? (
        <p className="nes-subject">
          <b>Subject:</b> {subject}
        </p>
      ) : null}

      {pageIdx === 0 ? (
        <>
        {kind !== "quotation" ? (
        <table className="nes-custbar">
          <tbody>
            <tr>
              <td>
                <b>Customer:</b> {sale.customerName || ""}
              </td>
              <td>
                <b>Contact:</b> {sale.customerMobile || ""}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}
        {documentBody.trim() ? (
        <div className="nes-intro">
          {documentBodyParas.map((para, idx) => (
            <p key={`body-${idx}`}>{para.trim() ? para : "\u00a0"}</p>
          ))}
        </div>
      ) : null}
        </>
      ) : null}

      <p className="nes-items-label">{kind === "quotation" ? "Quotation" : "Items/Services:"}</p>
      <table className="nes-grid">
        <thead>
          <tr>
            <th className="c-sl">SL No.</th>
            <th className="c-name">Item Name</th>
            <th className="c-desc">Description</th>
            <th className="c-qty">Quantity (Piece)</th>
            {kind !== "challan" ? (
              <>
                <th className="c-price">Unit Price (Taka)</th>
                <th className="c-total">Total Price (Taka)</th>
              </>
            ) : (
              <th className="c-remarks">Remarks</th>
            )}
          </tr>
        </thead>
        <tbody>
          {pageItems.map((item, idx) => (
            <tr key={`${slOffset}-${idx}`}>
              <td className="c-sl">{slOffset + idx + 1}</td>
              <td className="c-name">{item.name}</td>
              <td className="c-desc">{item.description || ""}</td>
              <td className="c-qty">{item.qty ?? 0}</td>
              {kind !== "challan" ? (
                <>
                  <td className="c-price">{Number(item.unitPrice || 0).toLocaleString("en-IN")}</td>
                  <td className="c-total">{Number(item.lineTotal || 0).toLocaleString("en-IN")}</td>
                </>
              ) : (
                <td className="c-remarks">{item.remarks || ""}</td>
              )}
            </tr>
          ))}
          {isLast && kind === "bill" && Number(sale.discount || 0) ? (
            <tr>
              <td colSpan={5} className="nes-total-lab">
                Discount
              </td>
              <td className="c-total">{taka(sale.discount)}</td>
            </tr>
          ) : null}
          {isLast && kind === "bill" && Number(sale.tax || 0) ? (
            <tr>
              <td colSpan={5} className="nes-total-lab">
                Tax
              </td>
              <td className="c-total">{taka(sale.tax)}</td>
            </tr>
          ) : null}
          {isLast && kind === "bill" && Number(sale.shipping || 0) ? (
            <tr>
              <td colSpan={5} className="nes-total-lab">
                Shipping
              </td>
              <td className="c-total">{taka(sale.shipping)}</td>
            </tr>
          ) : null}
          {isLast && kind !== "challan" ? (
            <tr>
              <td colSpan={5} className="nes-total-lab">
                {kind === "quotation" ? "Total Price =" : "Total Bill ="}
              </td>
              <td className="c-total">
                <b>{taka(sale.grandTotal)}</b>
              </td>
            </tr>
          ) : isLast ? (
            <tr>
              <td colSpan={3} className="nes-total-lab">
                Total =
              </td>
              <td className="c-qty">
                <b>{qtyTotal}</b>
              </td>
              <td />
            </tr>
          ) : null}
        </tbody>
      </table>

      {isLast && kind !== "challan" ? (
        <p className="nes-words">
          <b>In Word:</b> {amountInWords(sale.grandTotal || 0, "en")}
        </p>
      ) : null}

      {isLast && kind === "bill" ? (
        <p className="nes-payline">
          <b>Paid Amount:</b> {taka(sale.paidAmount)} &nbsp;&nbsp;
          <b>Due Amount:</b> {taka(sale.dueAmount)} &nbsp;&nbsp;
          <b>Payment Status:</b> {paymentLabel(sale.grandTotal, sale.paidAmount)}
        </p>
      ) : null}

      {isLast && terms.length > 0 ? (
        <div className="nes-terms">
          <p>
            <b>Terms &amp; Conditions</b>
          </p>
          {terms.map((line) => (
            <p key={line}>
              <span className="nes-diamond">◆</span> {line.replace(/^[-•◆]\s*/, "")}
            </p>
          ))}
          {kind === "quotation" ? (
            <p>Please sign back to us if you confirm this P.I/Quotation.</p>
          ) : null}
        </div>
      ) : isLast && kind !== "quotation" ? (
        <p className="nes-note">
          Already we have supplied these services/items with good condition to your company. Now
          please check our bill and take necessary action to pay our bill accordingly. If you have
          any confusion or have any query then please inform to us feel freely and we will support
          you accordingly.
          <span className="nes-note-sign">- {bizName}</span>
        </p>
      ) : null}

      {isLast && kind !== "quotation" ? (
        <p className="nes-slogan">
          <span>24/7 Best Deal, Best Service</span>
        </p>
      ) : null}

      </div>

      {isLast ? (
      <div className="nes-signs">
        <div>
          <div className="nes-signline" />
          <p>{kind === "quotation" ? "(Customer Signature)" : "(Receiver Signature)"}</p>
        </div>
        <div className="nes-sign-right">
          <div className="nes-signline" />
          <p>
            <b>{signName}</b>
            <br />
            Proprietor, {bizName}
          </p>
        </div>
      </div>
      ) : null}

      <footer className="nes-foot">
        <p>
          <b>Office Address :</b> {bizAddress || "—"}
        </p>
        <p>
          {business?.phone ? (
            <>
              <b>Mobile/WhatsApp:</b> {business.phone}
            </>
          ) : null}
          {wechat ? (
            <>
              {" "}
              , <b>Wechat:</b> {wechat}
            </>
          ) : null}
          {business?.website ? (
            <>
              {" "}
              , <b>Website:</b> {business.website}
            </>
          ) : null}
          {business?.email ? (
            <>
              {" "}
              , <b>Email:</b> {business.email}
            </>
          ) : null}
        </p>
      </footer>
    </article>
        );
      })}
    </>
  );
}

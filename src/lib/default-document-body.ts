const COMPANY_PLACEHOLDER = "[COMPANY_NAME]";
const QUOTATION_FOR_RE = /We are submitting Quotation for .+?\./;

export function defaultDocumentBody(
  companyName = "",
  section = "Injection molding Section.",
  subject = "Quotation for Ejector part making and Seat cover making mould servicing of Injection molding machine.",
) {
  const name = companyName.trim() || COMPANY_PLACEHOLDER;
  return [
    `Section: ${section}`,
    `Subject: ${subject}`,
    "Dear Sir,",
    `Thank you for your valued inquiry. We are submitting Quotation for ${name}.`,
    "Nur Engineering Solution is very professional and pioneer in PLC Automation and machineries like Servo system (Servo motor, Servo Drive, Hydraulic Pump), PLC conversion, spare parts, Robotics and some others automation especially in the field of Injection Molding machine, Extrusion Blow Molding machine, Vertical Injection Molding machine, Die Casting Machine, D.C Machine, Industrial Chiller, Air Compressor etc.",
    "Continuously we are supplying many machineries, spare parts and Technical Support to many companies in Bangladesh. We are working with many remarkable companies in Bangladesh like RFL, ACI, Walton, Bengal Plastics, Esquire Plastics, Super Star Group, Akij Group, Meghna Group and some others companies.",
  ].join("\n\n");
}

export const DEFAULT_DOCUMENT_BODY = defaultDocumentBody();

export const DEFAULT_QUOTATION_TERMS = [
  "Term of validity: 15 days.",
  "Payment: 100% advance for order confirmation OR as per company policy.",
  "Delivery Time: Ready stock item.",
  "VAT, Tax etc.: Excluded.",
  "Delivery Time: 7-10 days",
  "Delivery area: Items delivered from stock area in Dhaka (customer's own arrangement).",
].join("\n");

/** Replace only the company name in the "Quotation for …" sentence. */
export function withQuotationCompanyName(body: string, companyName: string) {
  const name = companyName.trim();
  if (!name) return body;
  if (QUOTATION_FOR_RE.test(body)) {
    return body.replace(QUOTATION_FOR_RE, `We are submitting Quotation for ${name}.`);
  }
  if (body.includes(COMPANY_PLACEHOLDER)) {
    return body.replace(COMPANY_PLACEHOLDER, name);
  }
  return body;
}

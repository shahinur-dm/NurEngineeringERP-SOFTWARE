const COMPANY_PLACEHOLDER = "[COMPANY_NAME]";
const QUOTATION_FOR_RE = /We are submitting Quotation for .+?\./;

export function defaultDocumentBody(companyName = "") {
  const name = companyName.trim() || COMPANY_PLACEHOLDER;
  return [
    "Dear Sir,",
    `Thank you for your valued inquiry. We are submitting Quotation for ${name}.`,
    "Nur Engineering Solution is very professional and pioneer in PLC Automation and machineries like Servo system (Servo motor, Servo Drive, Hydraulic Pump), PLC conversion, spare parts, Robotics and some others automation especially in the field of Injection Molding machine, Extrusion Blow Molding machine, Vertical Injection Molding machine, Die Casting Machine, D.C Machine, Industrial Chiller, Air Compressor etc.",
    "Continuously we are supplying many machineries, spare parts and Technical Support to many companies in Bangladesh. We are working with many remarkable companies in Bangladesh like RFL, ACI, Walton, Bengal Plastics, Esquire Plastics, Super Star Group, Akij Group, Meghna Group and some others companies.",
  ].join("\n");
}

export const DEFAULT_DOCUMENT_BODY = defaultDocumentBody();

/** Replace only the company name in the "Quotation for …" sentence. */
export function withQuotationCompanyName(body: string, companyName: string) {
  const name = companyName.trim();
  if (!name || !QUOTATION_FOR_RE.test(body)) return body;
  return body.replace(QUOTATION_FOR_RE, `We are submitting Quotation for ${name}.`);
}

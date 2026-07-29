import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number, _locale: string = "bn") {
  const value = Number.isFinite(amount) ? amount : 0;
  const num = value.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `৳${num}`;
}

export function formatDateBD(date: Date | string, locale: string = "bn") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Convert number to Bangla/English amount-in-words (crore/lakh system) */
export function amountInWords(amount: number, locale: "bn" | "en" = "bn"): string {
  const onesEn = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tensEn = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const onesBn = [
    "", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়",
    "দশ", "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোল", "সতেরো", "আঠারো", "উনিশ",
  ];
  const tensBn = ["", "", "বিশ", "ত্রিশ", "চল্লিশ", "পঞ্চাশ", "ষাট", "সত্তর", "আশি", "নব্বই"];

  const ones = locale === "bn" ? onesBn : onesEn;
  const tens = locale === "bn" ? tensBn : tensEn;
  const hundred = locale === "bn" ? "শত" : "Hundred";
  const thousand = locale === "bn" ? "হাজার" : "Thousand";
  const lakh = locale === "bn" ? "লাখ" : "Lakh";
  const crore = locale === "bn" ? "কোটি" : "Crore";
  const and = locale === "bn" ? "" : "and ";
  const takaOnly = locale === "bn" ? "টাকা মাত্র" : "Taka Only";

  const n = Math.floor(Math.abs(amount));
  if (n === 0) return locale === "bn" ? `শূন্য ${takaOnly}` : `Zero ${takaOnly}`;

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    return `${tens[Math.floor(num / 10)]}${num % 10 ? (locale === "bn" ? " " : " ") + ones[num % 10] : ""}`.trim();
  }

  function threeDigits(num: number): string {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    let out = "";
    if (h) out += `${ones[h]} ${hundred}`;
    if (rest) out += `${out ? " " : ""}${locale === "en" && h ? and : ""}${twoDigits(rest)}`;
    return out.trim();
  }

  const cr = Math.floor(n / 10000000);
  const lk = Math.floor((n % 10000000) / 100000);
  const th = Math.floor((n % 100000) / 1000);
  const rem = n % 1000;

  const parts: string[] = [];
  if (cr) parts.push(`${threeDigits(cr)} ${crore}`);
  if (lk) parts.push(`${twoDigits(lk)} ${lakh}`);
  if (th) parts.push(`${twoDigits(th)} ${thousand}`);
  if (rem) parts.push(threeDigits(rem));

  return `${parts.join(" ")} ${takaOnly}`;
}

export function generateDocNo(prefix: string, seq: number) {
  const y = new Date().getFullYear();
  return `${prefix}-${y}-${String(seq).padStart(5, "0")}`;
}

import type { Metadata } from "next";
import { Manrope, Noto_Sans_Bengali, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-en",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-display-en",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-bn",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const notoBengaliDisplay = Noto_Sans_Bengali({
  variable: "--font-display-bn",
  subsets: ["bengali", "latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DIT POS",
  description:
    "Lightweight bilingual ERP & POS for EEE students — lab instruments, machinery & electrical equipment sales",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${plusJakarta.variable} ${manrope.variable} ${notoBengali.variable} ${notoBengaliDisplay.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

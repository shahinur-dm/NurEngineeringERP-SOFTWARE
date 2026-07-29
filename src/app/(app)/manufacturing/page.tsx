"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function ManufacturingPage() {
  const t = useTranslations();
  return (
    <div>
      <PageHeader title={t("manufacturing.title")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="gp-card p-6">
          <p className="text-2xl font-bold">{t("manufacturing.recipes")}</p>
          <p className="mt-2 text-muted">BOM / recipe engine connected to Mongo models.</p>
        </div>
        <div className="gp-card p-6">
          <p className="text-2xl font-bold">{t("manufacturing.production")}</p>
          <p className="mt-2 text-muted">Production runs will consume ingredient stock (FIFO).</p>
        </div>
      </div>
    </div>
  );
}

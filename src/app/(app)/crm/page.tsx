"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui";

export default function CrmPage() {
  const t = useTranslations();
  return (
    <div>
      <PageHeader title={t("crm.title")} subtitle="Leads · Follow-ups · Campaigns" />
      <div className="grid gap-4 md:grid-cols-3">
        {[t("crm.leads"), t("crm.followups"), t("crm.campaigns")].map((title) => (
          <div key={title} className="gp-card p-6">
            <p className="text-2xl font-bold">{title}</p>
            <p className="mt-2 text-muted">
              {t("common.noData")} — module scaffold ready for pipeline expansion.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { ModulePage } from "@/components/ModulePage";
import { resolveModuleFromPath } from "@/lib/path-module-map";

const ADD_REDIRECTS: Record<string, string> = {
  "products-add": "/products",
  "purchases-add": "/purchases",
  "sales-add": "/pos",
  "sales-draft-add": "/pos",
  "sales-quote-add": "/pos",
  "expenses-add": "/expenses",
  "stock-transfers-add": "/stock/transfers",
  "stock-adjustments-add": "/stock/adjustments",
};

export default async function CatchAllModulePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const moduleId = resolveModuleFromPath(slug);
  if (!moduleId) notFound();
  if (ADD_REDIRECTS[moduleId]) redirect(ADD_REDIRECTS[moduleId]);
  return <ModulePage moduleId={moduleId} />;
}

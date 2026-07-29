import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PageAnimator } from "@/components/ui";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/login");

  return (
    <AppShell userName={session.name}>
      <PageAnimator>{children}</PageAnimator>
    </AppShell>
  );
}

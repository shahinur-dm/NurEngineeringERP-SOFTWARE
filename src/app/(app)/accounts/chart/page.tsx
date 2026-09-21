import { redirect } from "next/navigation";

export default function ChartRedirect() {
  redirect("/accounts/list");
}

import Workbench from "@/components/workbench";
import { redirect } from "next/navigation";
import { hasPageSession } from "@/lib/page-session";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ demo?: string | string[] }>;
}) {
  const { demo } = await searchParams;
  if (demo !== '1' && !(await hasPageSession())) redirect('/login');
  return <Workbench />;
}

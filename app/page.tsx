import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Nav");
  return { title: translate("dashboard") };
}

export default function HomePage() {
  redirect("/dashboard");
}

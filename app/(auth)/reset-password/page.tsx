import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { countUsers } from "@/lib/db/users";
import { findValidResetToken } from "@/lib/db/users";

import { ResetPasswordForm } from "./reset-password-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const translate = await getTranslations("Auth");
  return { title: translate("reset.title") };
}

type ResetPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPageProps) {
  if ((await countUsers()) === 0) {
    redirect("/setup");
  }
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  const { token } = await searchParams;
  const translate = await getTranslations("Auth.reset");

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate("title")}</CardTitle>
          <CardDescription>{translate("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {translate("missing")}{" "}
            <Link href="/forgot-password" className="hover:underline">
              {translate("forgotLink")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  const user = await findValidResetToken(token);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate("title")}</CardTitle>
          <CardDescription>{translate("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {translate("expired")}{" "}
            <Link href="/forgot-password" className="hover:underline">
              {translate("forgotLink")}
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("title")}</CardTitle>
        <CardDescription>{translate("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 text-sm">
          {translate("forUser", { email: user.email })}
        </p>
        <ResetPasswordForm token={token} />
      </CardContent>
    </Card>
  );
}

import { getFormatter, getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBuildInfo, getUptimeSeconds } from "@/lib/build-info";
import { prisma } from "@/lib/prisma";

async function getDbStatus(): Promise<"ok" | "error"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

type UptimeUnits = {
  days: string;
  hours: string;
  minutes: string;
  lessThanMinute: string;
};

function formatUptime(seconds: number, units: UptimeUnits): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}${units.days}`);
  if (hours > 0) parts.push(`${hours}${units.hours}`);
  if (minutes > 0) parts.push(`${minutes}${units.minutes}`);
  return parts.length > 0 ? parts.join(" ") : units.lessThanMinute;
}

export async function HealthTab() {
  const translate = await getTranslations("Admin.health");
  const formatter = await getFormatter();
  const build = getBuildInfo();
  const uptime = getUptimeSeconds();
  const dbStatus = await getDbStatus();
  const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{translate("application")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{translate("status")}</span>
            <Badge variant="default">{translate("running")}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translate("version")}
            </span>
            <span className="font-mono text-xs">{build.version}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{translate("commit")}</span>
            <span className="font-mono text-xs">
              {build.commit !== "unknown" ? build.commit : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translate("buildTime")}
            </span>
            <span className="text-xs">
              {build.buildTime
                ? formatter.dateTime(new Date(build.buildTime), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{translate("uptime")}</span>
            <span className="text-xs">
              {formatUptime(uptime, {
                days: translate("uptimeUnits.days"),
                hours: translate("uptimeUnits.hours"),
                minutes: translate("uptimeUnits.minutes"),
                lessThanMinute: translate("uptimeUnits.lessThanMinute"),
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{translate("memory")}</span>
            <span className="text-xs">{memoryUsage} MB</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{translate("database")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {translate("connection")}
            </span>
            <Badge variant={dbStatus === "ok" ? "default" : "destructive"}>
              {dbStatus === "ok" ? translate("connected") : translate("error")}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

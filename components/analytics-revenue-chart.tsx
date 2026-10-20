"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFormatter, useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type RevenueChartPoint = {
  label: string;
  collected: number;
  currency: string;
};

type RevenueChartProps = {
  data: RevenueChartPoint[];
};

export function RevenueChart({ data }: RevenueChartProps) {
  const translate = useTranslations("Analytics.charts");
  const formatter = useFormatter();
  const currency = data[0]?.currency ?? "USD";
  const formatMoney = (cents: number) =>
    formatter.number(cents / 100, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("revenueTitle")}</CardTitle>
        <CardDescription>{translate("revenueDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.every((point) => point.collected === 0) ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {translate("revenueEmpty")}
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: number) => formatMoney(value)}
                />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Bar
                  dataKey="collected"
                  name={translate("collected")}
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

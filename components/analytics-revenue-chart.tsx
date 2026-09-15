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

function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

export function RevenueChart({ data }: RevenueChartProps) {
  const currency = data[0]?.currency ?? "USD";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue — last 6 months</CardTitle>
        <CardDescription>
          Payments recorded per month (cash basis).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.every((point) => point.collected === 0) ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No payments recorded in this period yet.
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
                  tickFormatter={(value: number) =>
                    formatMoney(value, currency)
                  }
                />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value), currency)}
                />
                <Bar
                  dataKey="collected"
                  name="Collected"
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

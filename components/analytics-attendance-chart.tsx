"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type AttendanceChartPoint = {
  label: string;
  attendances: number;
  uniqueAttendees: number;
};

type AttendanceChartProps = {
  data: AttendanceChartPoint[];
};

export function AttendanceChart({ data }: AttendanceChartProps) {
  const translate = useTranslations("Analytics.charts");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("attendanceTitle")}</CardTitle>
        <CardDescription>{translate("attendanceDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {data.every((point) => point.attendances === 0) ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            {translate("attendanceEmpty")}
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16 }}>
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
                />
                <Tooltip />
                <Bar
                  dataKey="attendances"
                  name={translate("attendances")}
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="uniqueAttendees"
                  name={translate("uniqueMembers")}
                  fill="var(--color-chart-2)"
                  radius={[4, 4, 0, 0]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

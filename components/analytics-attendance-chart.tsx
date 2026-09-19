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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance — last 12 weeks</CardTitle>
        <CardDescription>
          Marks per week (Present/Late). A member training two classes in a week
          counts once per class — the lighter bar shows unique members. The
          current week is partial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.every((point) => point.attendances === 0) ? (
          <p className="text-muted-foreground py-12 text-center text-sm">
            No attendance recorded in this period yet.
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
                  name="Attendances"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="uniqueAttendees"
                  name="Unique members"
                  fill="var(--primary)"
                  fillOpacity={0.45}
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

"use client";

import React, { useMemo } from "react";
import { Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useReach } from "@/lib/reach-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function TodayActivityFeedCard() {
  const { leads } = useReach();

  // Compute stats for the last 7 days
  const chartData = useMemo(() => {
    const daysOfWeek = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysOfWeek[d.getDay()];

      // Get YYYY-MM-DD local format prefix
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const datePrefix = `${year}-${month}-${day}`;

      // Count leads created on this day
      const created = leads.filter((l) => l.createdAt && l.createdAt.startsWith(datePrefix)).length;

      // Count leads won on this day
      const won = leads.filter(
        (l) => l.status === "Won" && l.updatedAt && l.updatedAt.startsWith(datePrefix)
      ).length;

      result.push({
        name: dayName,
        created,
        won,
      });
    }

    return result;
  }, [leads]);

  const hasData = chartData.some(d => d.created > 0 || d.won > 0);

  return (
    <Card className="border border-[#e5e5e0] bg-white shadow-none overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669]/10 text-[#059669]">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Activité hebdomadaire</CardTitle>
            <CardDescription className="text-xs">Leads créés vs leads gagnés par jour</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        {!hasData ? (
          <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-[#807d72]">
            <Activity className="h-6 w-6 opacity-30" aria-hidden="true" />
            <p className="text-xs font-medium">Aucune activité sur les 7 derniers jours</p>
          </div>
        ) : (
          <div className="w-full h-[220px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#807d72", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#807d72", fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e5e0",
                    borderRadius: "10px",
                    fontSize: "11px",
                    color: "#26251e",
                    boxShadow: "none",
                  }}
                  labelStyle={{ fontWeight: "bold", color: "#26251e" }}
                />
                <Legend
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "10px", paddingTop: "12px", color: "#807d72" }}
                />
                <Bar dataKey="created" name="Leads créés" fill="#6ee7b7" radius={[3, 3, 0, 0]} barSize={14} strokeWidth={0} />
                <Bar dataKey="won" name="Leads gagnés" fill="#059669" radius={[3, 3, 0, 0]} barSize={14} strokeWidth={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiProps {
  title: string;
  value: string;
  change?: string;
  subtitle: string;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
}

function valueSizeClass(value: string): string {
  const len = value.length;
  if (len <= 7) return "text-2xl";
  if (len <= 10) return "text-xl";
  if (len <= 13) return "text-lg";
  return "text-base";
}

export default function KpiCard({
  title,
  value,
  change,
  subtitle,
  trend = "neutral",
  isLoading,
}: KpiProps) {
  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
      ? "text-red-500"
      : "text-gray-500";

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm text-gray-500">{title}</h3>
      {isLoading ? (
        <div className="flex items-center mt-2 h-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between mt-2">
            <p className={cn("font-semibold tabular-nums", valueSizeClass(value))}>
              {value}
            </p>
            {change && (
              <span className={cn("text-xs font-medium shrink-0 ml-2", trendColor)}>
                {change}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </>
      )}
    </div>
  );
}

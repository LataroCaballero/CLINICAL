"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReporteCardProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icono?: React.ReactNode;
  variacion?: number;
  variacionLabel?: string;
  loading?: boolean;
  className?: string;
  colorClase?: string;
}

export function ReporteCard({
  titulo,
  valor,
  subtitulo,
  icono,
  variacion,
  variacionLabel,
  loading = false,
  className,
  colorClase = "text-gray-900",
}: ReporteCardProps) {
  const getTrendIcon = () => {
    if (variacion === undefined || variacion === 0) {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
    if (variacion > 0) {
      return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    }
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getTrendColor = () => {
    if (variacion === undefined || variacion === 0) return "text-gray-500";
    if (variacion > 0) return "text-emerald-600";
    return "text-red-600";
  };

  return (
    <Card className={cn("border shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{titulo}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <p className={cn("text-2xl font-bold mt-1", colorClase)}>
                {valor}
              </p>
            )}
            {subtitulo && !loading && (
              <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>
            )}
          </div>
          {icono && (
            <div className="p-2 bg-gray-50 rounded-lg">
              {icono}
            </div>
          )}
        </div>

        {variacion !== undefined && !loading && (
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
            {getTrendIcon()}
            <span className={cn("text-sm font-medium", getTrendColor())}>
              {variacion > 0 ? "+" : ""}
              {variacion.toFixed(1)}%
            </span>
            {variacionLabel && (
              <span className="text-xs text-gray-400 ml-1">
                {variacionLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ReporteCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function ReporteCardGrid({ children, columns = 4 }: ReporteCardGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
  };

  return (
    <div className={cn("grid grid-cols-2 gap-4", gridCols[columns])}>
      {children}
    </div>
  );
}

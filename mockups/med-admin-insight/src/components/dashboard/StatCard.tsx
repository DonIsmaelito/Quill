import React from "react";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  cardBgColor?: string;
  cardTextColor?: string;
  sparklineData?: number[];
}

export function StatCard({
  title,
  value,
  change,
  icon,
  bgColor,
  textColor,
  cardBgColor = "bg-white",
  cardTextColor,
  sparklineData,
}: StatCardProps) {
  const isPositive = change >= 0;

  const contentTextColor = cardTextColor
    ? cardTextColor
    : cardBgColor !== "bg-white"
    ? "text-white"
    : textColor;
  const subContentTextColor = cardTextColor
    ? cardTextColor
    : cardBgColor !== "bg-white"
    ? "text-gray-200"
    : "text-medical-subtext";
  const changeTextColor = cardTextColor
    ? cardTextColor
    : isPositive
    ? cardBgColor !== "bg-white"
      ? "text-green-300"
      : "text-green-600"
    : cardBgColor !== "bg-white"
    ? "text-red-300"
    : "text-red-600";
  const sparklineStrokeColor =
    cardBgColor !== "bg-white" ? "rgba(255,255,255,0.7)" : textColor;

  return (
    <div
      className={cn(
        "rounded-xl p-5 shadow-lg flex flex-col hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer",
        cardBgColor
      )}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3
            className={cn(
              "text-sm font-medium tracking-wide",
              subContentTextColor
            )}
          >
            {title}
          </h3>
          <p className={cn("text-3xl font-semibold mt-1", contentTextColor)}>
            {value}
          </p>
        </div>
        <div
          className={cn(
            "p-3 rounded-lg",
            cardBgColor !== "bg-white" ? "bg-white/20" : bgColor
          )}
        >
          {React.cloneElement(icon as React.ReactElement, {
            className: cn(
              "h-6 w-6",
              cardBgColor !== "bg-white" ? "text-white" : textColor
            ),
          })}
        </div>
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 mb-1 h-10 w-full opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData.map((val) => ({ value: val }))}>
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.7)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                }}
                itemStyle={{ color: "white", fontSize: "10px" }}
                labelStyle={{ display: "none" }}
                cursor={{
                  stroke: sparklineStrokeColor,
                  strokeWidth: 1,
                  opacity: 0.5,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={sparklineStrokeColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div
        className={cn(
          "flex items-center mt-auto pt-2 text-sm",
          sparklineData ? "" : "mt-4"
        )}
      >
        <div className={cn("flex items-center font-medium", changeTextColor)}>
          {isPositive ? (
            <ArrowUp className="h-4 w-4 mr-1 stroke-current" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-1 stroke-current" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
        <span className={cn("ml-1.5", subContentTextColor)}>vs last month</span>
      </div>
    </div>
  );
}

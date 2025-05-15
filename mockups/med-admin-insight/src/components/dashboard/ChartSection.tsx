import React, { useState, useEffect } from "react";
import { FormCompletionChart, FormTypeChart } from "./Charts";
import SkeletonCard from "@/components/ui/SkeletonCard";

export function ChartSection({
  onMonthSelect,
}: {
  onMonthSelect?: (month: string | null) => void;
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-in fade-in duration-500">
      <FormCompletionChart onMonthSelect={onMonthSelect} />
      <FormTypeChart />
    </div>
  );
}

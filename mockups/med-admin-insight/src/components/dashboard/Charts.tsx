import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import React, { useState } from "react";

// Form Completion Data
const formCompletionData = [
  { month: "Jan", completed: 25, pending: 15 },
  { month: "Feb", completed: 30, pending: 20 },
  { month: "Mar", completed: 35, pending: 25 },
  { month: "Apr", completed: 40, pending: 30 },
  { month: "May", completed: 45, pending: 35 },
  { month: "Jun", completed: 50, pending: 40 },
  { month: "Jul", completed: 55, pending: 45 },
  { month: "Aug", completed: 60, pending: 50 },
  { month: "Sep", completed: 65, pending: 55 },
  { month: "Oct", completed: 70, pending: 60 },
  { month: "Nov", completed: 75, pending: 65 },
  { month: "Dec", completed: 80, pending: 70 },
];

// Form Type Data - UPDATED COLORS
const formTypeData = [
  { name: "Insurance", value: 35, color: "#0033A0" }, // medical.primary (Strong Blue)
  { name: "Medical History", value: 25, color: "#2D9CDB" }, // medical.button (Lighter Blue)
  { name: "Consent", value: 20, color: "#38BDF8" }, // Tailwind sky-400 (Even Lighter Blue)
  { name: "Intake", value: 20, color: "#8A8F98" }, // medical.subtext (Gray)
];

// Custom center label for Donut Chart
const DonutCenterLabel = ({
  activeIndex,
  data,
}: {
  activeIndex: number | null;
  data: typeof formTypeData;
}) => {
  if (activeIndex === null || activeIndex < 0 || activeIndex >= data.length) {
    // Show total or default text if no slice is active
    const total = data.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <g>
        <text
          x="50%"
          y="47%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-medical-text dark:fill-white font-semibold text-xl"
        >
          Total
        </text>
        <text
          x="50%"
          y="57%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-medical-subtext dark:fill-gray-300 text-sm"
        >
          {total} Forms
        </text>
      </g>
    );
  }
  const activeEntry = data[activeIndex];
  const percentage = (
    (activeEntry.value / data.reduce((sum, entry) => sum + entry.value, 0)) *
    100
  ).toFixed(0);

  return (
    <>
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-medical-text dark:fill-white font-semibold text-lg"
        style={{ fill: activeEntry.color }}
      >
        {activeEntry.name}
      </text>
      <text
        x="50%"
        y="57%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-medical-subtext dark:fill-gray-300 text-base"
      >
        {percentage}%
      </text>
    </>
  );
};

export function FormCompletionChart({
  onMonthSelect,
}: {
  onMonthSelect?: (month: string | null) => void;
}) {
  const handleBarClick = (data: any) => {
    if (
      data &&
      data.activePayload &&
      data.activePayload.length > 0 &&
      onMonthSelect
    ) {
      const month = data.activePayload[0].payload.month;
      onMonthSelect(month);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 ease-out">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-medical-text dark:text-white leading-tight">
          Form Completion Rates
        </h3>
        <div className="text-sm text-medical-subtext dark:text-gray-300">2025</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formCompletionData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            onClick={handleBarClick}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb dark:stroke-gray-600" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "currentColor" }} className="dark:text-gray-300" />
            <YAxis tick={{ fontSize: 12, fill: "currentColor" }} className="dark:text-gray-300" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                borderRadius: "0.5rem",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              }}
              itemStyle={{ color: "#1A1A1A" }}
              cursor={{ fill: "rgba(200, 200, 200, 0.2)" }}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#0033A0" // medical.primary (Strong Blue)
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={700}
              className={onMonthSelect ? "cursor-pointer" : ""}
            />
            <Bar
              dataKey="pending"
              name="Pending"
              fill="#2D9CDB" // UPDATED: medical.button (Lighter Blue)
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationDuration={700}
              className={onMonthSelect ? "cursor-pointer" : ""}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center mt-2 text-sm dark:text-gray-300">
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 rounded-full bg-medical-primary mr-1"></div>{" "}
          {/* Matches 'Completed' bar */}
          <span>Completed 75%</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-medical-button mr-1"></div>{" "}
          {/* UPDATED: Matches 'Pending' bar (medical.button) */}
          <span>Pending 25%</span>
        </div>
      </div>
    </div>
  );
}

export function FormTypeChart() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const totalValue = formTypeData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 ease-out">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-medical-text dark:text-white leading-tight">
          Form Types Distribution
        </h3>
        <button className="text-medical-subtext dark:text-gray-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
      <div className="h-64 flex justify-center items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formTypeData} // This will now use the updated colors
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              isAnimationActive={true}
              animationDuration={500}
            >
              {formTypeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color} // Colors from updated formTypeData
                  stroke={activeIndex === index ? entry.color : "none"}
                  strokeWidth={3}
                  style={{
                    filter:
                      activeIndex === index
                        ? `drop-shadow(0px 0px 6px ${entry.color})`
                        : "none",
                    transform:
                      activeIndex === index ? "scale(1.03)" : "scale(1)",
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease-out, filter 0.2s ease-out",
                  }}
                />
              ))}
            </Pie>
            <DonutCenterLabel activeIndex={activeIndex} data={formTypeData} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderRadius: "0.5rem",
                boxShadow: "0 3px 15px rgba(0,0,0,0.1)",
                border: "1px solid rgba(0,0,0,0.05)",
              }}
              itemStyle={{ color: "#1A1A1A" }}
              formatter={(value: number, name: string) => [
                `${value} (${((value / totalValue) * 100).toFixed(0)}%)`,
                name,
              ]}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

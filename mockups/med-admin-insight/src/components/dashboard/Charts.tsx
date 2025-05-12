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

// Form Type Data
const formTypeData = [
  { name: "Insurance", value: 35, color: "#0033A0" },
  { name: "Medical History", value: 25, color: "#EB5757" },
  { name: "Consent", value: 20, color: "#F2C94C" },
  { name: "Intake", value: 20, color: "#2D9CDB" },
];

export function FormCompletionChart() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-medical-text">
          Form Completion Rates
        </h3>
        <div className="text-sm text-medical-subtext">2025</div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formCompletionData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar
              dataKey="completed"
              name="Completed"
              fill="#0033A0"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="pending"
              name="Pending"
              fill="#F2C94C"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center mt-2 text-sm">
        <div className="flex items-center mr-4">
          <div className="w-3 h-3 rounded-full bg-medical-primary mr-1"></div>
          <span>Completed 75%</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-medical-info mr-1"></div>
          <span>Pending 25%</span>
        </div>
      </div>
    </div>
  );
}

export function FormTypeChart() {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-medical-text">
          Form Types Distribution
        </h3>
        <button className="text-medical-subtext">
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
      <div className="h-64 flex justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formTypeData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {formTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
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

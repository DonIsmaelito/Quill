import { FileText, CheckCircle, Clock, Users } from "lucide-react";
import { StatCard } from "./StatCard";

export function StatCards() {
  // Dummy sparkline data (replace with actual data)
  const sparkline1 = [5, 10, 5, 20, 8, 15];
  const sparkline2 = [10, 12, 8, 14, 10, 16];
  const sparkline3 = [15, 8, 12, 10, 13, 7];
  const sparkline4 = [8, 9, 12, 10, 11, 13];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Forms Sent"
        value="250"
        change={40}
        icon={<FileText />}
        bgColor="bg-sky-100 dark:bg-sky-900/30"
        textColor="text-sky-600 dark:text-sky-400"
        cardBgColor="bg-white dark:bg-gray-800"
        sparklineData={sparkline1}
      />
      <StatCard
        title="Completed Forms"
        value="156"
        change={35}
        icon={<CheckCircle />}
        bgColor="bg-green-100 dark:bg-green-900/30"
        textColor="text-green-600 dark:text-green-400"
        cardBgColor="bg-white dark:bg-gray-800"
        sparklineData={sparkline2}
      />
      <StatCard
        title="Patient Minutes Saved"
        value="198"
        change={-15}
        icon={<Clock />}
        bgColor="bg-yellow-100 dark:bg-yellow-900/30"
        textColor="text-yellow-600 dark:text-yellow-400"
        cardBgColor="bg-white dark:bg-gray-800"
        sparklineData={sparkline3}
      />
      <StatCard
        title="Patients Logged In"
        value="100"
        change={25}
        icon={<Users />}
        bgColor="bg-purple-100 dark:bg-purple-900/30"
        textColor="text-purple-600 dark:text-purple-400"
        cardBgColor="bg-white dark:bg-gray-800"
        sparklineData={sparkline4}
      />
    </div>
  );
}

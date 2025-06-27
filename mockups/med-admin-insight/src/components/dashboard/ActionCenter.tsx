import React, { useState } from "react";
import { ActionItem, ActionItemProps, ActionItemStatus } from "./ActionItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Dummy data for Action Center
const initialActionItems: ActionItemProps[] = [
  {
    id: "form1",
    title: "Insurance Verification",
    patientName: "Sarah Johnson",
    dueDate: "Due Today",
    status: "overdue",
    month: "Jan",
  },
  {
    id: "form2",
    title: "Medical History Update",
    patientName: "Emily Davis",
    status: "waiting",
    month: "Jan",
  },
  {
    id: "form3",
    title: "Consent Form - Procedure X",
    patientName: "Michael Brown",
    status: "ready",
    month: "Feb",
  },
  {
    id: "form4",
    title: "Pre-Appointment Survey",
    patientName: "Jessica Williams",
    dueDate: "1 day overdue",
    status: "overdue",
    month: "Mar",
  },
  {
    id: "form5",
    title: "Follow-up Questionnaire",
    patientName: "David Wilson",
    status: "waiting",
    month: "Mar",
  },
];

export const ActionCenter: React.FC<{
  selectedMonthFilter?: string | null;
  onClearMonthFilter?: () => void;
}> = ({ selectedMonthFilter, onClearMonthFilter }) => {
  const [actionItems, setActionItems] =
    useState<ActionItemProps[]>(initialActionItems);
  const [activeTab, setActiveTab] = useState<ActionItemStatus | "all">("all");

  const handleRemind = (id: string) => {
    console.log(`Remind patient for item: ${id}`);
    // Add logic to send reminder, perhaps update item status or add a note
  };

  const handleMarkComplete = (id: string) => {
    console.log(`Mark item as complete: ${id}`);
    setActionItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, status: "ready" } : item
      )
    );
    // If it was overdue/waiting and now complete, it might move to 'ready' or be archived
  };

  const handleArchive = (id: string) => {
    console.log(`Archive item: ${id}`);
    setActionItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const filteredByTab =
    activeTab === "all"
      ? actionItems
      : actionItems.filter((item) => item.status === activeTab);

  const finalFilteredItems = selectedMonthFilter
    ? filteredByTab.filter((item) => item.month === selectedMonthFilter)
    : filteredByTab;

  const getTabCount = (status: ActionItemStatus | "all") => {
    if (status === "all") return actionItems.length;
    return actionItems.filter((item) => item.status === status).length;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xl font-semibold text-medical-text dark:text-white">
          Action Center
        </h3>
        {selectedMonthFilter && onClearMonthFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearMonthFilter}
            className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear Month Filter ({selectedMonthFilter})
          </Button>
        )}
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as ActionItemStatus | "all")
        }
        className="flex-grow flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-4 mb-4 dark:bg-gray-700">
          <TabsTrigger value="all" className="dark:text-gray-300 dark:data-[state=active]:bg-gray-600 dark:data-[state=active]:text-white">All ({getTabCount("all")})</TabsTrigger>
          <TabsTrigger
            value="overdue"
            className="data-[state=active]:text-red-600 data-[state=active]:border-red-600 dark:text-gray-300 dark:data-[state=active]:text-red-400 dark:data-[state=active]:border-red-400 dark:data-[state=active]:bg-gray-600"
          >
            🔴 Overdue ({getTabCount("overdue")})
          </TabsTrigger>
          <TabsTrigger
            value="waiting"
            className="data-[state=active]:text-amber-600 data-[state=active]:border-amber-600 dark:text-gray-300 dark:data-[state=active]:text-amber-400 dark:data-[state=active]:border-amber-400 dark:data-[state=active]:bg-gray-600"
          >
            🟠 Waiting ({getTabCount("waiting")})
          </TabsTrigger>
          <TabsTrigger
            value="ready"
            className="data-[state=active]:text-green-600 data-[state=active]:border-green-600 dark:text-gray-300 dark:data-[state=active]:text-green-400 dark:data-[state=active]:border-green-400 dark:data-[state=active]:bg-gray-600"
          >
            🟢 Ready ({getTabCount("ready")})
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-grow">
          {" "}
          {/* Make ScrollArea take remaining space */}
          <div className="space-y-3 pr-2">
            {" "}
            {/* Added pr-2 for scrollbar gap */}
            {finalFilteredItems.length > 0 ? (
              finalFilteredItems.map((item) => (
                <ActionItem
                  key={item.id}
                  {...item}
                  onRemind={handleRemind}
                  onMarkComplete={handleMarkComplete}
                  onArchive={handleArchive}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {selectedMonthFilter
                  ? `No items for ${selectedMonthFilter} in this category.`
                  : "No items in this category."}
              </p>
            )}
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

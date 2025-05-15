import { Search as SearchIcon, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar() {
  return (
    <div className="relative w-full max-w-md">
      <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        type="search"
        placeholder="Search Patient by Name, MRN, Phone..."
        className="pl-10 pr-10 py-2 h-10 text-sm border-gray-300 rounded-lg focus:border-medical-primary focus:ring-1 focus:ring-medical-primary w-full shadow-sm hover:shadow-md transition-shadow"
      />
      <ChevronsUpDown className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 opacity-60 pointer-events-none" />
    </div>
  );
}

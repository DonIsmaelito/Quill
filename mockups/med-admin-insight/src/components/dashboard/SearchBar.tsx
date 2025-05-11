
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-medical-subtext" />
      <Input
        type="search"
        placeholder="Search here..."
        className="pl-10 bg-gray-50 border-gray-200 rounded-lg w-full"
      />
    </div>
  );
}

import React from "react";

interface SkeletonCardProps {
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className }) => {
  return (
    <div className={className}>
      <div className="bg-gray-200 p-6 rounded-xl shadow-lg animate-pulse">
        {/* Mimic title area */}
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-4"></div>
        {/* Mimic chart area */}
        <div className="h-64 bg-gray-300 rounded"></div>
        {/* Mimic legend/footer area */}
        <div className="flex justify-between mt-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;

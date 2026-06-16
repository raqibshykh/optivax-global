import React from "react";

interface PlaceholderProps {
  message?: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({
  message = "No available actions or data due to permissions.",
}) => {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-6 px-4 text-center dark:border-gray-700 dark:bg-white/2">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
};

export default Placeholder;

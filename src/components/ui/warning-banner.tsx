import { TriangleAlert } from "lucide-react";

export function WarningBanner() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm font-serif mb-6">
      <TriangleAlert className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
      <p className="text-yellow-800 dark:text-yellow-200">
        All legislation content is under active development and may contain
        errors. If you spot anything wrong, please use the{" "}
        <span className="font-medium">report icon</span> in the bottom-right
        corner.
      </p>
    </div>
  );
}

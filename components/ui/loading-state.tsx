import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type LoadingStateProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export function LoadingState({
  label = "Loading...",
  className,
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center justify-center gap-2 text-muted-foreground",
        compact ? "py-2 text-xs" : "min-h-24 py-6 text-sm",
        className
      )}
    >
      <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

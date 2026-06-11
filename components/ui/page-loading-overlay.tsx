import { LoaderCircle } from "lucide-react";

export function PageLoadingOverlay() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center bg-transparent">
      <div className="flex size-24 items-center justify-center rounded-full bg-card/25 shadow-lg shadow-primary/10 ring-1 ring-border/50 backdrop-blur-md">
        <LoaderCircle
          className="size-16 animate-spin text-primary drop-shadow-sm"
          aria-label="Loading page"
        />
      </div>
    </div>
  );
}

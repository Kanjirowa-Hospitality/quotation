import { LoaderCircle } from "lucide-react";

export function PageLoadingOverlay() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center bg-transparent [@media_(min-width:1024px)_and_(max-width:1300px)_and_(max-height:620px)]:min-h-[calc(100dvh-5rem)]">
      <div className="flex size-24 items-center justify-center rounded-full bg-card/25 shadow-lg shadow-primary/10 ring-1 ring-border/50 backdrop-blur-md [@media_(min-width:1024px)_and_(max-width:1300px)_and_(max-height:620px)]:size-20">
        <LoaderCircle
          className="size-16 animate-spin text-primary drop-shadow-sm [@media_(min-width:1024px)_and_(max-width:1300px)_and_(max-height:620px)]:size-12"
          aria-label="Loading page"
        />
      </div>
    </div>
  );
}

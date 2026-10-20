import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/50 border border-slate-800 border-dashed rounded-2xl">
      <div className="p-4 bg-slate-800/80 text-slate-400 rounded-full mb-4">
        <Inbox className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 border border-rose-900/30 rounded-2xl text-rose-200">
      <AlertCircle className="h-8 w-8 text-rose-400 mb-3" />
      <h3 className="text-base font-semibold text-rose-100 mb-1">{title}</h3>
      <p className="text-xs text-rose-300 max-w-md mb-4">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="border-rose-800 text-rose-200 hover:bg-rose-950/40 gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl">
          <Skeleton className="h-5 w-40 bg-slate-800" />
          <Skeleton className="h-5 w-24 bg-slate-800" />
          <Skeleton className="h-5 w-32 bg-slate-800" />
          <Skeleton className="h-5 w-16 bg-slate-800 ml-auto" />
        </div>
      ))}
    </div>
  );
}

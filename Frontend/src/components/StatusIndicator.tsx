import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { AnalysisStatus } from "@/types/analysis";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: AnalysisStatus;
  message?: string;
}

export const StatusIndicator = ({ status, message }: StatusIndicatorProps) => {
  const statusConfig = {
    idle: {
      icon: Clock,
      color: "text-muted-foreground",
      bg: "bg-muted",
      text: "Ready to analyze",
    },
    uploading: {
      icon: Loader2,
      color: "text-primary",
      bg: "bg-primary/10",
      text: "Uploading files...",
    },
    processing: {
      icon: Loader2,
      color: "text-primary",
      bg: "bg-primary/10",
      text: "Processing documents...",
    },
    success: {
      icon: CheckCircle,
      color: "text-success",
      bg: "bg-success/10",
      text: "Analysis complete!",
    },
    error: {
      icon: AlertCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      text: "Analysis failed",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isLoading = status === "uploading" || status === "processing";

  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-lg", config.bg)}>
      <Icon
        className={cn("h-5 w-5 flex-shrink-0", config.color, {
          "animate-spin": isLoading,
        })}
      />
      <div className="flex-1">
        <p className={cn("text-sm font-medium", config.color)}>
          {message || config.text}
        </p>
        {isLoading && (
          <p className="text-xs text-muted-foreground mt-0.5">
            This may take 10-60 seconds depending on document size
          </p>
        )}
      </div>
    </div>
  );
};

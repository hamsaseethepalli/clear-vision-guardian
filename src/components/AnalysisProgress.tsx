import { cn } from "@/lib/utils";
import type { AnalysisStep } from "@/lib/types";
import { Check, Loader2 } from "lucide-react";

interface AnalysisProgressProps {
  steps: AnalysisStep[];
}

export function AnalysisProgress({ steps }: AnalysisProgressProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
          step.status === 'active' && "bg-accent",
          step.status === 'complete' && "bg-accent/50",
          step.status === 'pending' && "opacity-40"
        )}>
          <div className="flex-shrink-0">
            {step.status === 'complete' && (
              <div className="h-6 w-6 rounded-full bg-success flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-success-foreground" />
              </div>
            )}
            {step.status === 'active' && (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            )}
            {step.status === 'pending' && (
              <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
            )}
          </div>
          <span className={cn(
            "text-sm font-medium",
            step.status === 'active' && "text-foreground",
            step.status === 'complete' && "text-muted-foreground",
            step.status === 'pending' && "text-muted-foreground"
          )}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

import { cn } from "@/lib/utils";
import { GRADE_LABELS } from "@/lib/mockAI";

interface GradeScaleProps {
  activeGrade?: number;
  confidence?: number;
  compact?: boolean;
}

const gradeColorClasses = [
  "bg-grade-0",
  "bg-grade-1",
  "bg-grade-2",
  "bg-grade-3",
  "bg-grade-4",
];

export function GradeScale({ activeGrade, confidence, compact = false }: GradeScaleProps) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex items-center justify-between">
        <h4 className="font-display font-semibold text-foreground text-sm">
          Clinical Grading Scale
        </h4>
      </div>
      <div className="flex gap-1">
        {GRADE_LABELS.map((label, i) => (
          <div key={i} className="flex-1 space-y-1">
            <div
              className={cn(
                "h-3 rounded-sm transition-all duration-300",
                gradeColorClasses[i],
                activeGrade === i ? "ring-2 ring-foreground ring-offset-1 ring-offset-background scale-y-150" : "opacity-40"
              )}
            />
            {!compact && (
              <p className={cn(
                "text-[10px] leading-tight",
                activeGrade === i ? "text-foreground font-semibold" : "text-muted-foreground"
              )}>
                {label}
              </p>
            )}
          </div>
        ))}
      </div>
      {activeGrade !== undefined && (
        <div className={cn(
          "rounded-md px-3 py-2 text-sm font-medium",
          gradeColorClasses[activeGrade],
          "text-primary-foreground"
        )}>
          Detected: {GRADE_LABELS[activeGrade]}
        </div>
      )}
    </div>
  );
}

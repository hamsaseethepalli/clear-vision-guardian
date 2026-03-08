import { cn } from "@/lib/utils";
import type { Report } from "@/lib/types";
import { GradeScale } from "./GradeScale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

interface ReportCardProps {
  report: Report;
  onClick?: () => void;
  showPatientInfo?: boolean;
}

const statusConfig = {
  pending_review: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

export function ReportCard({ report, onClick, showPatientInfo = false }: ReportCardProps) {
  const status = statusConfig[report.status];
  const StatusIcon = status.icon;

  return (
    <Card
      className={cn(
        "shadow-card hover:shadow-elevated transition-all duration-300 cursor-pointer border-border/50",
        onClick && "hover:-translate-y-0.5"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            {showPatientInfo && (
              <p className="text-xs text-muted-foreground mb-1">
                Patient: {report.patientName}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Report #{report.id.slice(0, 8)}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(report.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="outline" className={cn("text-xs", status.className)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <GradeScale activeGrade={report.grade} confidence={report.confidence} compact />
      </CardContent>
    </Card>
  );
}

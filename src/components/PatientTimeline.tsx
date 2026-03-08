import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradeScale } from "@/components/GradeScale";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, FileText } from "lucide-react";

interface TimelineReport {
  id: string;
  grade: number;
  confidence: number;
  grade_label: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface PatientTimelineProps {
  reports: TimelineReport[];
  patientName: string;
}

const statusIcons = {
  pending_review: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
};

const statusColors = {
  pending_review: "text-warning",
  approved: "text-success",
  rejected: "text-destructive",
};

export function PatientTimeline({ reports, patientName }: PatientTimelineProps) {
  if (reports.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No history for this patient.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Patient History — {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {reports.map((report, i) => {
              const StatusIcon = statusIcons[report.status as keyof typeof statusIcons] || Clock;
              const statusColor = statusColors[report.status as keyof typeof statusColors] || "text-muted-foreground";

              return (
                <div key={report.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2.5 top-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
                    report.status === 'approved' ? 'bg-success' :
                    report.status === 'rejected' ? 'bg-destructive' :
                    'bg-warning'
                  }`} />

                  <div className="rounded-lg border border-border/50 p-4 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                        <span className="text-xs font-medium text-foreground">
                          {new Date(report.created_at).toLocaleDateString("en", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <Badge variant="outline" className={
                        report.status === 'approved' ? "bg-success/10 text-success border-success/20 text-xs" :
                        report.status === 'rejected' ? "bg-destructive/10 text-destructive border-destructive/20 text-xs" :
                        "bg-warning/10 text-warning border-warning/20 text-xs"
                      }>
                        {report.status === 'pending_review' ? 'Pending' : report.status}
                      </Badge>
                    </div>
                    <GradeScale activeGrade={report.grade} confidence={report.confidence} compact />
                    {report.reviewed_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Reviewed: {new Date(report.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

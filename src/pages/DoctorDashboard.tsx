import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GradeScale } from "@/components/GradeScale";
import { Badge } from "@/components/ui/badge";
import type { Report } from "@/lib/types";
import logo from "@/assets/retino-logo.png";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut, Search, CheckCircle2, XCircle, Clock,
  FileText, Users, TrendingUp, AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MOCK_CASES: Report[] = [
  {
    id: "rpt-101-abc",
    patientId: "PAT-2024-001",
    patientName: "Rahul Verma",
    imageUrl: "",
    grade: 2,
    confidence: 0.93,
    gradeLabel: "Moderate NPDR",
    riskLevel: "Moderate",
    explanation: "Multiple microaneurysms, dot-blot hemorrhages, and hard exudates observed.",
    recommendations: ["Refer to ophthalmologist within 3-6 months", "Strict blood sugar management"],
    status: "pending_review",
    createdAt: "2026-03-07T10:30:00Z",
  },
  {
    id: "rpt-102-def",
    patientId: "PAT-2024-002",
    patientName: "Priya Sharma",
    imageUrl: "",
    grade: 0,
    confidence: 0.97,
    gradeLabel: "No Diabetic Retinopathy",
    riskLevel: "Low",
    explanation: "No signs of diabetic retinopathy detected.",
    recommendations: ["Continue regular annual eye examinations"],
    status: "pending_review",
    createdAt: "2026-03-07T11:00:00Z",
  },
  {
    id: "rpt-103-ghi",
    patientId: "PAT-2024-003",
    patientName: "Amit Patel",
    imageUrl: "",
    grade: 3,
    confidence: 0.89,
    gradeLabel: "Severe NPDR",
    riskLevel: "High",
    explanation: "Extensive hemorrhages, venous beading, and intraretinal microvascular abnormalities present.",
    recommendations: ["Urgent ophthalmology referral within 2-4 weeks"],
    status: "pending_review",
    createdAt: "2026-03-06T09:00:00Z",
  },
  {
    id: "rpt-104-jkl",
    patientId: "PAT-2024-004",
    patientName: "Sunita Devi",
    imageUrl: "",
    grade: 1,
    confidence: 0.95,
    gradeLabel: "Mild NPDR",
    riskLevel: "Low-Moderate",
    explanation: "A few microaneurysms are present.",
    recommendations: ["Schedule follow-up in 9-12 months"],
    status: "approved",
    createdAt: "2026-03-05T14:00:00Z",
    reviewedAt: "2026-03-05T16:00:00Z",
    reviewedBy: "Dr. Mehta",
  },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cases, setCases] = useState<Report[]>(MOCK_CASES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = cases.filter(c => c.status === 'pending_review').length;
  const approvedCount = cases.filter(c => c.status === 'approved').length;

  const handleDecision = (reportId: string, decision: 'approved' | 'rejected') => {
    setCases(prev => prev.map(c =>
      c.id === reportId
        ? { ...c, status: decision, reviewedAt: new Date().toISOString(), reviewedBy: "Dr. Mehta" }
        : c
    ));
    setSelectedCase(null);
    toast({
      title: decision === 'approved' ? "Report Approved" : "Report Rejected",
      description: `Decision has been permanently locked.`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Retino AI" className="h-8 w-8" />
            <span className="font-display font-bold text-foreground">Doctor Console</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-warning" },
            { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "text-success" },
            { label: "Total Cases", value: cases.length, icon: Users, color: "text-info" },
            { label: "High Risk", value: cases.filter(c => c.grade >= 3).length, icon: AlertTriangle, color: "text-destructive" },
          ].map((stat, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Patient ID or Name..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'pending_review', 'approved', 'rejected'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Cases Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Patient Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredCases.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedCase(c)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-sm text-foreground">{c.patientName}</p>
                      <p className="text-xs text-muted-foreground">{c.patientId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <GradeScale activeGrade={c.grade} compact />
                    <Badge variant="outline" className={
                      c.status === 'pending_review' ? "bg-warning/10 text-warning border-warning/20" :
                      c.status === 'approved' ? "bg-success/10 text-success border-success/20" :
                      "bg-destructive/10 text-destructive border-destructive/20"
                    }>
                      {c.status === 'pending_review' ? 'Pending' : c.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {filteredCases.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No cases match your search.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Decision Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              Case Review — {selectedCase?.patientName}
            </DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-6">
              {/* Patient info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Patient ID</p>
                  <p className="font-medium text-sm text-foreground">{selectedCase.patientId}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium text-sm text-foreground">
                    {new Date(selectedCase.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* AI Grade */}
              <GradeScale activeGrade={selectedCase.grade} confidence={selectedCase.confidence} />

              {/* Explanation */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">AI Explanation</p>
                <p className="text-sm text-foreground">{selectedCase.explanation}</p>
              </div>

              {/* Recommendations */}
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">Recommendations</p>
                <ul className="space-y-1">
                  {selectedCase.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-primary">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decision Panel */}
              {selectedCase.status === 'pending_review' ? (
                <div className="border-t border-border pt-4">
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3">
                    Decision Panel
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Once submitted, this decision is <strong>permanently locked</strong> and cannot be modified.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() => handleDecision(selectedCase.id, 'approved')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Report
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleDecision(selectedCase.id, 'rejected')}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-sm text-foreground">
                    <strong>Decision locked:</strong> {selectedCase.status === 'approved' ? 'Approved' : 'Rejected'} by {selectedCase.reviewedBy} on {selectedCase.reviewedAt ? new Date(selectedCase.reviewedAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

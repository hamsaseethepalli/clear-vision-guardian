import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportCard } from "@/components/ReportCard";
import { GradeScale } from "@/components/GradeScale";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { simulateAIAnalysis, type AIResult } from "@/lib/mockAI";
import type { Report, AnalysisStep } from "@/lib/types";
import logo from "@/assets/retino-logo.png";
import { Upload, LogOut, FileText, Eye, AlertCircle, Download, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MOCK_REPORTS: Report[] = [
  {
    id: "rpt-001-abc",
    patientId: "p-001",
    patientName: "You",
    imageUrl: "",
    grade: 0,
    confidence: 0.96,
    gradeLabel: "No Diabetic Retinopathy",
    riskLevel: "Low",
    explanation: "No signs detected.",
    recommendations: ["Continue annual screening"],
    status: "approved",
    createdAt: "2026-02-15T10:00:00Z",
    reviewedAt: "2026-02-16T09:00:00Z",
    reviewedBy: "Dr. Sharma",
  },
  {
    id: "rpt-002-def",
    patientId: "p-001",
    patientName: "You",
    imageUrl: "",
    grade: 1,
    confidence: 0.91,
    gradeLabel: "Mild NPDR",
    riskLevel: "Low-Moderate",
    explanation: "Mild signs detected.",
    recommendations: ["Follow up in 9-12 months"],
    status: "pending_review",
    createdAt: "2026-03-01T14:00:00Z",
  },
];

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { label: "Uploading Image...", status: "pending" },
    { label: "Analyzing Retina...", status: "pending" },
    { label: "Generating Report...", status: "pending" },
  ]);

  const updateStep = (index: number, status: AnalysisStep['status']) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setAnalyzing(true);
    setAiResult(null);
    setSteps([
      { label: "Uploading Image...", status: "active" },
      { label: "Analyzing Retina...", status: "pending" },
      { label: "Generating Report...", status: "pending" },
    ]);

    // Step 1: Upload
    await new Promise(r => setTimeout(r, 1200));
    updateStep(0, "complete");
    updateStep(1, "active");

    // Step 2: AI Analysis
    const result = await simulateAIAnalysis();

    updateStep(1, "complete");
    updateStep(2, "active");
    await new Promise(r => setTimeout(r, 800));
    updateStep(2, "complete");

    setAiResult(result);

    const newReport: Report = {
      id: `rpt-${Date.now()}`,
      patientId: "p-001",
      patientName: "You",
      imageUrl: URL.createObjectURL(file),
      grade: result.grade,
      confidence: result.confidence,
      gradeLabel: result.gradeLabel,
      riskLevel: result.riskLevel,
      explanation: result.explanation,
      recommendations: result.recommendations,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    setReports(prev => [newReport, ...prev]);
    toast({ title: "Analysis Complete", description: `Grade ${result.grade} — ${result.gradeLabel}` });
  }, [toast]);

  const resetUpload = () => {
    setAnalyzing(false);
    setAiResult(null);
    setUploadedFile(null);
    setSteps([
      { label: "Uploading Image...", status: "pending" },
      { label: "Analyzing Retina...", status: "pending" },
      { label: "Generating Report...", status: "pending" },
    ]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Retino AI" className="h-8 w-8" />
            <span className="font-display font-bold text-foreground">Patient Portal</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Retinal Screening</h1>
              <p className="text-muted-foreground text-sm mt-1">Upload a retinal fundus image for AI analysis</p>
            </div>

            {!analyzing && !aiResult && (
              <Card className="shadow-card border-dashed border-2 border-primary/30 bg-accent/20">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                    Upload Retinal Image
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Supported formats: JPEG, PNG. The image will be analyzed by our AI model locally.
                  </p>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <Button variant="hero" size="lg" asChild>
                      <span>Choose Image</span>
                    </Button>
                  </label>
                </CardContent>
              </Card>
            )}

            {analyzing && !aiResult && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Analyzing...
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {uploadedFile && (
                    <div className="relative rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
                      <img
                        src={URL.createObjectURL(uploadedFile)}
                        alt="Uploaded retina"
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-primary/5">
                        <div className="h-0.5 bg-primary/40 animate-scan-line" />
                      </div>
                    </div>
                  )}
                  <AnalysisProgress steps={steps} />
                </CardContent>
              </Card>
            )}

            {aiResult && (
              <Card className="shadow-elevated border-primary/20">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Analysis Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <GradeScale activeGrade={aiResult.grade} confidence={aiResult.confidence} />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                      <p className="font-semibold text-foreground">{aiResult.riskLevel}</p>
                    </div>
                    <div className="rounded-lg bg-muted p-4">
                      <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                      <p className="font-semibold text-foreground">{Math.round(aiResult.confidence * 100)}%</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-2">Clinical Explanation</p>
                    <p className="text-sm text-foreground">{aiResult.explanation}</p>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-2">Recommendations</p>
                    <ul className="space-y-1">
                      {aiResult.recommendations.map((r, i) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                    <p className="text-sm text-foreground">
                      This report is <strong>pending doctor review</strong>. Download will be available after approval.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={resetUpload}>
                      New Scan
                    </Button>
                    <Button disabled>
                      <Download className="h-4 w-4 mr-2" /> Download Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg text-foreground">Your Reports</h2>
            </div>
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => setSelectedReport(report)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Report #{selectedReport?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <GradeScale activeGrade={selectedReport.grade} confidence={selectedReport.confidence} />
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">Explanation</p>
                <p className="text-sm text-foreground">{selectedReport.explanation}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="text-sm text-foreground capitalize">{selectedReport.status.replace('_', ' ')}</p>
              </div>
              {selectedReport.status === 'approved' && (
                <Button className="w-full" variant="hero">
                  <Download className="h-4 w-4 mr-2" /> Download Report
                </Button>
              )}
              {selectedReport.status === 'rejected' && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-foreground">
                  This report requires re-evaluation. Please upload a new retinal image.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

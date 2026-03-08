import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportCard } from "@/components/ReportCard";
import { GradeScale } from "@/components/GradeScale";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { analyzeRetinalImage, preloadModel, type ONNXResult } from "@/lib/onnxInference";
import type { Report, AnalysisStep } from "@/lib/types";
import logo from "@/assets/retino-logo.png";
import { Upload, LogOut, FileText, Eye, AlertCircle, Download, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<ONNXResult | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { label: "Uploading Image...", status: "pending" },
    { label: "Analyzing Retina...", status: "pending" },
    { label: "Generating Report...", status: "pending" },
  ]);

  // Preload ONNX model in background
  useEffect(() => { preloadModel(); }, []);

  // Load reports from database
  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setReports(data.map(r => ({
          id: r.id,
          patientId: r.patient_id,
          patientName: "You",
          imageUrl: r.image_path,
          grade: r.grade as 0|1|2|3|4,
          confidence: Number(r.confidence),
          gradeLabel: r.grade_label,
          riskLevel: r.risk_level,
          explanation: r.explanation,
          recommendations: r.recommendations || [],
          status: r.status as Report['status'],
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at || undefined,
          reviewedBy: r.reviewed_by || undefined,
          doctorNotes: r.doctor_notes || undefined,
        })));
      }
      setLoadingReports(false);
    };
    fetchReports();
  }, [user]);

  const updateStep = (index: number, status: AnalysisStep['status']) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadedFile(file);
    setAnalyzing(true);
    setAiResult(null);
    setSteps([
      { label: "Uploading Image...", status: "active" },
      { label: "Analyzing Retina...", status: "pending" },
      { label: "Generating Report...", status: "pending" },
    ]);

    // Step 1: Upload to Supabase Storage
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("retinal-images")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setAnalyzing(false);
      return;
    }

    updateStep(0, "complete");
    updateStep(1, "active");

    // Step 2: AI Analysis using ONNX model
    let result: ONNXResult;
    try {
      result = await analyzeRetinalImage(file);
    } catch (err) {
      toast({ title: "Analysis failed", description: "AI model could not process this image. Please try again.", variant: "destructive" });
      setAnalyzing(false);
      return;
    }

    updateStep(1, "complete");
    updateStep(2, "active");

    // Step 3: Save report to database
    const { data: reportData, error: reportError } = await supabase
      .from("reports")
      .insert({
        patient_id: user.id,
        image_path: filePath,
        grade: result.grade,
        confidence: result.confidence,
        grade_label: result.gradeLabel,
        risk_level: result.riskLevel,
        explanation: result.explanation,
        recommendations: result.recommendations,
        status: "pending_review",
      })
      .select()
      .single();

    updateStep(2, "complete");
    setAiResult(result);

    if (reportData) {
      const newReport: Report = {
        id: reportData.id,
        patientId: reportData.patient_id,
        patientName: "You",
        imageUrl: filePath,
        grade: reportData.grade as Report['grade'],
        confidence: Number(reportData.confidence),
        gradeLabel: reportData.grade_label,
        riskLevel: reportData.risk_level,
        explanation: reportData.explanation,
        recommendations: reportData.recommendations || [],
        status: reportData.status as Report['status'],
        createdAt: reportData.created_at,
      };
      setReports(prev => [newReport, ...prev]);
    }

    // Log to audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "image_uploaded",
      entity_type: "report",
      entity_id: reportData?.id,
      details: { grade: result.grade, confidence: result.confidence },
    });

    toast({ title: "Analysis Complete", description: `Grade ${result.grade} — ${result.gradeLabel}` });
  }, [toast, user]);

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

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Retino AI" className="h-8 w-8" />
            <span className="font-display font-bold text-foreground">Patient Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
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
                    Supported formats: JPEG, PNG. The image will be analyzed by our AI model.
                  </p>
                  <label>
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
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
                    <Button variant="outline" onClick={resetUpload}>New Scan</Button>
                    <Button disabled><Download className="h-4 w-4 mr-2" /> Download Report</Button>
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
            {loadingReports ? (
              <p className="text-sm text-muted-foreground">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet. Upload your first retinal image.</p>
            ) : (
              reports.map((report) => (
                <ReportCard key={report.id} report={report} onClick={() => setSelectedReport(report)} />
              ))
            )}
          </div>
        </div>
      </main>

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

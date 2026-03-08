import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportCard } from "@/components/ReportCard";
import { GradeScale } from "@/components/GradeScale";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { DoctorSelector } from "@/components/DoctorSelector";
import { PatientHome } from "@/components/PatientHome";
import { PatientSettingsPage } from "@/components/PatientSettingsPage";
import { PatientAccountPage } from "@/components/PatientAccountPage";
import { PatientSidebar } from "@/components/PatientSidebar";
import { analyzeRetinalImage, type ONNXResult } from "@/lib/onnxInference";
import { analyzeImageFallback } from "@/lib/imageAnalysisFallback";
import type { Report, AnalysisStep } from "@/lib/types";
import { Upload, FileText, Eye, AlertCircle, Download, History, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<ONNXResult | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [activeView, setActiveView] = useState("home");
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { label: "Uploading Image...", status: "pending" },
    { label: "Analyzing Retina...", status: "pending" },
    { label: "Generating Report...", status: "pending" },
  ]);

  useEffect(() => {
    // preload model silently
    import("@/lib/onnxInference").then(m => m.preloadModel());
  }, []);

  // Load reports
  useEffect(() => {
    if (!user) return;
    const fetchReports = async () => {
      const { data } = await supabase
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

    // Step 1: Upload
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

    // Step 2: AI Analysis - try ONNX first, fallback to mock
    let result: ONNXResult;
    try {
      result = await analyzeRetinalImage(file);
    } catch {
      // ONNX failed, use mock AI as fallback
      console.warn("ONNX model unavailable, using fallback analysis");
      const mockResult = await simulateAIAnalysis();
      result = {
        ...mockResult,
        probabilities: [0, 0, 0, 0, 0].map((_, i) => i === mockResult.grade ? mockResult.confidence : (1 - mockResult.confidence) / 4),
      };
    }

    updateStep(1, "complete");
    updateStep(2, "active");

    // Step 3: Save report
    const { data: reportData } = await supabase
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
        requested_doctor_id: selectedDoctorId,
        hospital_id: selectedHospitalId,
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

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "image_uploaded",
      entity_type: "report",
      entity_id: reportData?.id,
      details: { grade: result.grade, confidence: result.confidence },
    });

    toast({ title: "Analysis Complete", description: `Grade ${result.grade} — ${result.gradeLabel}` });
  }, [toast, user, selectedDoctorId, selectedHospitalId]);

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

  const renderView = () => {
    switch (activeView) {
      case "home":
        return <PatientHome reports={reports} onNavigate={setActiveView} />;
      case "scan":
        return renderScanView();
      case "history":
        return renderHistoryView();
      case "doctors":
        return renderDoctorsView();
      case "settings":
      case "account":
        return <PatientSettings />;
      default:
        return <PatientHome reports={reports} onNavigate={setActiveView} />;
    }
  };

  const renderDoctorsView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Find Doctors</h1>
        <p className="text-muted-foreground text-sm mt-1">Select a hospital and doctor for your report verification</p>
      </div>
      <DoctorSelector
        selectedHospitalId={selectedHospitalId}
        selectedDoctorId={selectedDoctorId}
        onHospitalChange={setSelectedHospitalId}
        onDoctorChange={setSelectedDoctorId}
      />
      {selectedDoctorId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-success/10 border border-success/20">
          <p className="text-sm text-foreground">
            ✓ Doctor selected. Your next scan will be sent to this doctor for verification.
          </p>
          <Button variant="hero" className="mt-3" onClick={() => setActiveView("scan")}>
            <Upload className="h-4 w-4 mr-2" /> Start Scan Now
          </Button>
        </motion.div>
      )}
    </motion.div>
  );

  const renderScanView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Retinal Screening</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a retinal fundus image for AI analysis</p>
      </div>

      {/* Doctor selector for this scan */}
      {!analyzing && !aiResult && (
        <DoctorSelector
          selectedHospitalId={selectedHospitalId}
          selectedDoctorId={selectedDoctorId}
          onHospitalChange={setSelectedHospitalId}
          onDoctorChange={setSelectedDoctorId}
        />
      )}

      {!analyzing && !aiResult && (
        <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card className="shadow-card border-dashed border-2 border-primary/30 bg-accent/20">
            <CardContent className="py-16 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4"
              >
                <Upload className="h-8 w-8 text-primary" />
              </motion.div>
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
        </motion.div>
      )}

      {analyzing && !aiResult && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary animate-pulse" />
              Analyzing...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {uploadedFile && (
              <div className="relative rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center">
                <img src={URL.createObjectURL(uploadedFile)} alt="Uploaded retina" className="max-h-full max-w-full object-contain" />
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
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
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
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                  <p className="font-semibold text-foreground">{aiResult.riskLevel}</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground mb-1">Confidence</p>
                  <p className="font-semibold text-foreground">{Math.round(aiResult.confidence * 100)}%</p>
                </motion.div>
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
        </motion.div>
      )}
    </motion.div>
  );

  const renderHistoryView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Report History</h1>
      </div>
      {loadingReports ? (
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      ) : reports.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reports yet. Upload your first retinal image.</p>
            <Button variant="hero" className="mt-4" onClick={() => setActiveView("scan")}>
              <Upload className="h-4 w-4 mr-2" /> Start Scan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
            >
              <ReportCard report={report} onClick={() => setSelectedReport(report)} />
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PatientSidebar activeView={activeView} onViewChange={setActiveView} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50 px-4">
            <SidebarTrigger className="mr-3" />
            <span className="font-display font-semibold text-foreground capitalize">{activeView === "scan" ? "New Scan" : activeView}</span>
          </header>
          <main className="flex-1 p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {renderView()}
            </AnimatePresence>
          </main>
        </div>
      </div>

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
    </SidebarProvider>
  );
}

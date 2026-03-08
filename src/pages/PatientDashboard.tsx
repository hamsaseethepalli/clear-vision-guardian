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
import type { ONNXResult } from "@/lib/onnxInference";
import type { Report, AnalysisStep } from "@/lib/types";
import { Upload, FileText, Eye, AlertCircle, Download, History, BookOpen, Phone, HelpCircle, Bell } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";

async function fileToBase64(file: File): Promise<string> {
  // Resize image to max 1024px to avoid base64 size issues with AI gateway
  const bitmap = await createImageBitmap(file);
  const maxDim = 1024;
  let w = bitmap.width;
  let h = bitmap.height;
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.split(",")[1];
}

export default function PatientDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, language } = useI18n();
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

    // Step 2: AI Analysis via Gemini Vision
    let result: ONNXResult;
    try {
      const imageBase64 = await fileToBase64(file);
      const { data: aiData, error: aiError } = await supabase.functions.invoke("analyze-retina", {
        body: { imageBase64, language },
      });

      if (aiError) throw new Error(aiError.message);
      if (aiData?.error) throw new Error(aiData.error);

      result = {
        grade: aiData.grade as 0|1|2|3|4,
        confidence: aiData.confidence,
        gradeLabel: aiData.gradeLabel,
        riskLevel: aiData.riskLevel,
        explanation: aiData.explanation,
        recommendations: aiData.recommendations,
        probabilities: [0, 1, 2, 3, 4].map(g => g === aiData.grade ? aiData.confidence : (1 - aiData.confidence) / 4),
      };
    } catch (err) {
      console.error("AI analysis error:", err);
      toast({ title: "Analysis failed", description: "Could not analyze the image. Please try again.", variant: "destructive" });
      setAnalyzing(false);
      return;
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
  }, [toast, user, selectedDoctorId, selectedHospitalId, language]);

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

  const viewTitles: Record<string, string> = {
    home: t("nav.home"),
    scan: t("nav.scan"),
    history: t("nav.history"),
    doctors: t("nav.doctors"),
    settings: t("nav.settings"),
    account: t("nav.account"),
    notifications: t("nav.notifications"),
    education: t("nav.education"),
    emergency: t("nav.emergency"),
    help: t("nav.help"),
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
        return <PatientSettingsPage />;
      case "account":
        return <PatientAccountPage />;
      case "notifications":
        return renderNotificationsView();
      case "education":
        return renderEducationView();
      case "emergency":
        return renderEmergencyView();
      case "help":
        return renderHelpView();
      default:
        return <PatientHome reports={reports} onNavigate={setActiveView} />;
    }
  };

  const renderNotificationsView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("nav.notifications")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("notifications.stayUpdated")}</p>
      </div>
      {reports.filter(r => r.status === "approved" || r.status === "rejected").length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("notifications.noNotifications")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.filter(r => r.status !== "pending_review").map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer" onClick={() => setSelectedReport(r)}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${r.status === "approved" ? "bg-success" : "bg-destructive"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Report #{r.id.slice(0, 8)} — {r.status === "approved" ? `${t("home.approved")} ✓` : "✗"}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.gradeLabel} · {new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderEducationView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("education.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("education.subtitle")}</p>
      </div>
      {[
        { title: t("education.whatIsDR"), content: t("education.whatIsDRDesc"), color: "from-primary/10 to-accent" },
        { title: t("education.grades"), content: t("education.gradesDesc"), color: "from-warning/10 to-accent" },
        { title: t("education.prevention"), content: t("education.preventionDesc"), color: "from-success/10 to-accent" },
        { title: t("education.whenToSee"), content: t("education.whenToSeeDesc"), color: "from-destructive/10 to-accent" },
      ].map((card, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -2 }}>
          <Card className={`shadow-card bg-gradient-to-br ${card.color}`}>
            <CardHeader>
              <CardTitle className="font-display text-base text-foreground">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80 leading-relaxed">{card.content}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );

  const renderEmergencyView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("emergency.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("emergency.subtitle")}</p>
      </div>
      <Card className="shadow-card border-destructive/30 bg-destructive/5">
        <CardContent className="py-6">
          <div className="text-center space-y-4">
            <Phone className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="font-display font-bold text-lg text-foreground">{t("emergency.eyeCare")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t("emergency.seekHelp")}</p>
            <div className="grid sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <Button variant="destructive" size="lg" asChild>
                <a href="tel:108">Call 108</a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="tel:1800-599-0019">AIIMS Helpline</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-base">{t("emergency.warningSigns")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {["emergency.sign1", "emergency.sign2", "emergency.sign3", "emergency.sign4", "emergency.sign5", "emergency.sign6"].map((key, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-destructive mt-0.5 font-bold">!</span> {t(key)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );

  const faqItems = [
    { q: t("faq.q1"), a: t("faq.a1") },
    { q: t("faq.q2"), a: t("faq.a2") },
    { q: t("faq.q3"), a: t("faq.a3") },
    { q: t("faq.q4"), a: t("faq.a4") },
    { q: t("faq.q5"), a: t("faq.a5") },
    { q: t("faq.q6"), a: t("faq.a6") },
    { q: t("faq.q7"), a: t("faq.a7") },
    { q: t("faq.q8"), a: t("faq.a8") },
  ];

  const renderHelpView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("help.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("help.subtitle")}</p>
      </div>
      <Card className="shadow-card">
        <CardContent className="py-2">
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-foreground hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderDoctorsView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("doctors.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("doctors.subtitle")}</p>
      </div>
      <DoctorSelector
        selectedHospitalId={selectedHospitalId}
        selectedDoctorId={selectedDoctorId}
        onHospitalChange={setSelectedHospitalId}
        onDoctorChange={setSelectedDoctorId}
      />
      {selectedDoctorId && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-success/10 border border-success/20">
          <p className="text-sm text-foreground">✓ {t("doctors.selected")}</p>
          <Button variant="hero" className="mt-3" onClick={() => setActiveView("scan")}>
            <Upload className="h-4 w-4 mr-2" /> {t("doctors.startScan")}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );

  const renderScanView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("scan.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("scan.subtitle")}</p>
      </div>

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
              <h3 className="font-display font-semibold text-lg text-foreground mb-2">{t("scan.upload")}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{t("scan.formats")}</p>
              <label>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="hero" size="lg" asChild>
                  <span>{t("scan.choose")}</span>
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
              {t("scan.analyzing")}
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
                {t("scan.result")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <GradeScale activeGrade={aiResult.grade} confidence={aiResult.confidence} />
              <div className="grid sm:grid-cols-2 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground mb-1">{t("scan.riskLevel")}</p>
                  <p className="font-semibold text-foreground">{aiResult.riskLevel}</p>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} className="rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground mb-1">{t("scan.confidence")}</p>
                  <p className="font-semibold text-foreground">{Math.round(aiResult.confidence * 100)}%</p>
                </motion.div>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">{t("scan.explanation")}</p>
                <p className="text-sm text-foreground">{aiResult.explanation}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">{t("scan.recommendations")}</p>
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
                <p className="text-sm text-foreground">{t("scan.pendingReview")}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={resetUpload}>{t("scan.newScan")}</Button>
                <Button disabled><Download className="h-4 w-4 mr-2" /> {t("scan.download")}</Button>
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
        <h1 className="font-display text-2xl font-bold text-foreground">{t("history.title")}</h1>
      </div>
      {loadingReports ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : reports.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("history.empty")}</p>
            <Button variant="hero" className="mt-4" onClick={() => setActiveView("scan")}>
              <Upload className="h-4 w-4 mr-2" /> {t("history.startScan")}
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
            <span className="font-display font-semibold text-foreground">{viewTitles[activeView] || activeView}</span>
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
                <p className="text-xs text-muted-foreground mb-1">{t("scan.explanation")}</p>
                <p className="text-sm text-foreground">{selectedReport.explanation}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("common.status")}</p>
                <p className="text-sm text-foreground capitalize">{selectedReport.status.replace('_', ' ')}</p>
              </div>
              {selectedReport.status === 'approved' && (
                <Button className="w-full" variant="hero">
                  <Download className="h-4 w-4 mr-2" /> {t("scan.download")}
                </Button>
              )}
              {selectedReport.status === 'rejected' && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-foreground">
                  {t("report.rejectedMsg")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

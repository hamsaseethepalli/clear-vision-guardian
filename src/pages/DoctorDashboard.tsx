import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GradeScale } from "@/components/GradeScale";
import { Badge } from "@/components/ui/badge";
import { DoctorAnalytics } from "@/components/DoctorAnalytics";
import { PatientTimeline } from "@/components/PatientTimeline";
import { DoctorSidebar } from "@/components/DoctorSidebar";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Search, CheckCircle2, XCircle, Clock,
  FileText, Users, AlertTriangle, BarChart3, History, Bell,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";

interface CaseReport {
  id: string;
  patient_id: string;
  patient_name: string;
  image_path: string;
  grade: number;
  confidence: number;
  grade_label: string;
  risk_level: string;
  explanation: string;
  recommendations: string[];
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  requested_doctor_id: string | null;
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const [cases, setCases] = useState<CaseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("home");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    const { data } = await supabase
      .from("reports")
      .select(`
        *,
        profiles:patient_id(first_name, last_name)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setCases(data.map((r: any) => ({
        id: r.id,
        patient_id: r.patient_id,
        patient_name: r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : "Unknown",
        image_path: r.image_path,
        grade: r.grade,
        confidence: Number(r.confidence),
        grade_label: r.grade_label,
        risk_level: r.risk_level,
        explanation: r.explanation,
        recommendations: r.recommendations || [],
        status: r.status,
        created_at: r.created_at,
        reviewed_at: r.reviewed_at,
        reviewed_by: r.reviewed_by,
        requested_doctor_id: r.requested_doctor_id,
      })));
    }
    setLoading(false);
  };

  // Requests specifically for this doctor
  const myRequests = useMemo(() => {
    if (!user) return [];
    return cases.filter(c => c.requested_doctor_id === user.id && c.status === 'pending_review');
  }, [cases, user]);

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patient_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = cases.filter(c => c.status === 'pending_review').length;
  const approvedCount = cases.filter(c => c.status === 'approved').length;

  const selectedPatientReports = useMemo(() => {
    if (!selectedPatientId) return [];
    return cases
      .filter(c => c.patient_id === selectedPatientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [cases, selectedPatientId]);

  const selectedPatientName = useMemo(() => {
    if (!selectedPatientId) return "";
    return cases.find(c => c.patient_id === selectedPatientId)?.patient_name || "Unknown";
  }, [cases, selectedPatientId]);

  const uniquePatients = useMemo(() => {
    const map = new Map<string, { id: string; name: string; caseCount: number; lastGrade: number }>();
    cases.forEach(c => {
      const existing = map.get(c.patient_id);
      if (!existing) {
        map.set(c.patient_id, { id: c.patient_id, name: c.patient_name, caseCount: 1, lastGrade: c.grade });
      } else {
        existing.caseCount++;
      }
    });
    return Array.from(map.values());
  }, [cases]);

  const handleDecision = async (reportId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;
    const { error } = await supabase
      .from("reports")
      .update({ status: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", reportId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: `report_${decision}`,
      entity_type: "report",
      entity_id: reportId,
      details: { decision },
    });

    setCases(prev => prev.map(c =>
      c.id === reportId
        ? { ...c, status: decision, reviewed_at: new Date().toISOString(), reviewed_by: user.id }
        : c
    ));
    setSelectedCase(null);
    toast({
      title: decision === 'approved' ? "Report Approved" : "Report Rejected",
      description: "Decision has been permanently locked.",
    });
  };

  const handleLogout = async () => { await signOut(); navigate("/"); };

  const renderView = () => {
    switch (activeView) {
      case "home": return renderHomeView();
      case "requests": return renderRequestsView();
      case "cases": return renderCasesView();
      case "patients": return renderPatientsView();
      case "analytics": return <DoctorAnalytics cases={cases} />;
      case "history": return renderHistoryView();
      case "settings": return renderSettingsPlaceholder("Settings");
      case "account": return renderSettingsPlaceholder("Account");
      default: return renderHomeView();
    }
  };

  const renderSettingsPlaceholder = (title: string) => (
    <div className="text-center py-16">
      <p className="text-muted-foreground">{title} — coming soon</p>
    </div>
  );

  const renderHomeView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-warning" },
          { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "text-success" },
          { label: "Total Cases", value: cases.length, icon: Users, color: "text-info" },
          { label: "My Requests", value: myRequests.length, icon: Bell, color: "text-destructive" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.03, y: -2 }}>
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => {
              if (stat.label === "My Requests") setActiveView("requests");
              else if (stat.label === "Total Cases") setActiveView("cases");
            }}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick requests preview */}
      {myRequests.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-destructive" /> Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myRequests.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-accent/30 cursor-pointer hover:bg-accent/50 transition-all" onClick={() => setSelectedCase(c)}>
                  <div>
                    <p className="font-medium text-sm text-foreground">{c.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <GradeScale activeGrade={c.grade} compact />
                </div>
              ))}
              {myRequests.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveView("requests")}>
                  View all {myRequests.length} requests
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );

  const renderRequestsView = () => (
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid sm:grid-cols-4 gap-4"
        >
          {[
            { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-warning" },
            { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "text-success" },
            { label: "Total Cases", value: cases.length, icon: Users, color: "text-info" },
            { label: "My Requests", value: myRequests.length, icon: Bell, color: "text-destructive" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03, y: -2 }}
            >
              <Card className="shadow-card hover:shadow-elevated transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center">
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="requests" className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" /> Requests
              {myRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                  {myRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> All Cases
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="h-4 w-4" /> Patient History
            </TabsTrigger>
          </TabsList>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> Verification Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Loading...</p>
                  ) : myRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                      <p className="text-muted-foreground">No pending verification requests</p>
                      <p className="text-xs text-muted-foreground mt-1">All caught up! Check the "All Cases" tab for other pending reports.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myRequests.map((c, i) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-4 rounded-xl border-2 border-primary/20 bg-accent/30 hover:bg-accent/50 cursor-pointer transition-all"
                          onClick={() => setSelectedCase(c)}
                        >
                          <div>
                            <p className="font-medium text-sm text-foreground">{c.patient_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(c.created_at).toLocaleDateString()} · Specifically requested you
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <GradeScale activeGrade={c.grade} compact />
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              Review Now
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by Patient ID or Name..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex gap-2">
                {(['all', 'pending_review', 'approved', 'rejected'] as const).map(f => (
                  <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
                    {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Patient Cases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">Loading cases...</p>
                ) : (
                  <div className="space-y-3">
                    {filteredCases.map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedCase(c)}
                      >
                        <div>
                          <p className="font-medium text-sm text-foreground">{c.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{c.patient_id.slice(0, 8)}</p>
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
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                    {filteredCases.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        {cases.length === 0 ? "No cases yet." : "No cases match your search."}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <DoctorAnalytics cases={cases} />
          </TabsContent>

          {/* Patient History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="shadow-card lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Patients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {uniquePatients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No patients yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {uniquePatients.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPatientId(p.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedPatientId === p.id
                              ? 'border-primary bg-accent'
                              : 'border-border/50 hover:bg-accent/30'
                          }`}
                        >
                          <p className="font-medium text-sm text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.caseCount} report{p.caseCount !== 1 ? 's' : ''} · ID: {p.id.slice(0, 8)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                {selectedPatientId ? (
                  <PatientTimeline
                    reports={selectedPatientReports.map(r => ({
                      id: r.id,
                      grade: r.grade,
                      confidence: r.confidence,
                      grade_label: r.grade_label,
                      status: r.status,
                      created_at: r.created_at,
                      reviewed_at: r.reviewed_at,
                    }))}
                    patientName={selectedPatientName}
                  />
                ) : (
                  <Card className="shadow-card">
                    <CardContent className="py-16 text-center">
                      <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Select a patient to view their history timeline.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Decision Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Case Review — {selectedCase?.patient_name}</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {selectedCase.requested_doctor_id === user?.id && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-foreground font-medium">
                    ⚡ This patient specifically requested your review
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Patient ID</p>
                  <p className="font-medium text-sm text-foreground">{selectedCase.patient_id.slice(0, 8)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium text-sm text-foreground">{new Date(selectedCase.created_at).toLocaleString()}</p>
                </div>
              </div>
              <GradeScale activeGrade={selectedCase.grade} confidence={selectedCase.confidence} />
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">AI Explanation</p>
                <p className="text-sm text-foreground">{selectedCase.explanation}</p>
              </div>
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

              {selectedCase.status === 'pending_review' ? (
                <div className="border-t border-border pt-4">
                  <h4 className="font-display font-semibold text-sm text-foreground mb-3">Decision Panel</h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Once submitted, this decision is <strong>permanently locked</strong>.
                  </p>
                  <div className="flex gap-3">
                    <Button variant="success" className="flex-1" onClick={() => handleDecision(selectedCase.id, 'approved')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Approve Report
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleDecision(selectedCase.id, 'rejected')}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject Report
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-accent p-4">
                  <p className="text-sm text-foreground">
                    <strong>Decision locked:</strong> {selectedCase.status === 'approved' ? 'Approved' : 'Rejected'}
                    {selectedCase.reviewed_at && ` on ${new Date(selectedCase.reviewed_at).toLocaleString()}`}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search, CheckCircle2, XCircle, Clock,
  FileText, Users, Bell, History, Building2, Settings, User, LogOut, Stethoscope,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

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

interface DoctorProfile {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  hospital_city: string | null;
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
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  useEffect(() => {
    fetchCases();
    fetchDoctorProfile();
  }, [user]);

  const fetchDoctorProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone, hospital_id, hospitals:hospital_id(name, city)")
      .eq("user_id", user.id)
      .single();

    if (data) {
      const h = data.hospitals as any;
      setDoctorProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        hospital_id: data.hospital_id,
        hospital_name: h?.name || null,
        hospital_city: h?.city || null,
      });
    }
  };

  const fetchCases = async () => {
    const { data } = await supabase
      .from("reports")
      .select(`*, profiles:patient_id(first_name, last_name)`)
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

  // ── Views ──

  const renderHomeView = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Doctor Info Banner */}
      {doctorProfile && (
        <Card className="shadow-card border-primary/20 bg-gradient-to-r from-primary/5 to-accent/30">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-bold text-foreground">
                  Dr. {doctorProfile.first_name} {doctorProfile.last_name}
                </h2>
                {doctorProfile.hospital_name && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {doctorProfile.hospital_name}
                      {doctorProfile.hospital_city && `, ${doctorProfile.hospital_city}`}
                    </span>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 hidden sm:flex">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-warning", view: "cases" },
          { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "text-success", view: "cases" },
          { label: "Total Cases", value: cases.length, icon: Users, color: "text-info", view: "cases" },
          { label: "My Requests", value: myRequests.length, icon: Bell, color: "text-destructive", view: "requests" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ scale: 1.03, y: -2 }}>
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer" onClick={() => setActiveView(stat.view)}>
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
              <p className="text-xs text-muted-foreground mt-1">All caught up!</p>
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
                    <Badge className="bg-primary/10 text-primary border-primary/20">Review Now</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderCasesView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
    </motion.div>
  );

  const renderPatientsView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> All Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {uniquePatients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No patients yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uniquePatients.map(p => (
                <Card key={p.id} className="cursor-pointer hover:shadow-elevated transition-all" onClick={() => { setSelectedPatientId(p.id); setActiveView("history"); }}>
                  <CardContent className="py-4">
                    <p className="font-medium text-sm text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.caseCount} report{p.caseCount !== 1 ? 's' : ''} · ID: {p.id.slice(0, 8)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderHistoryView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
    </motion.div>
  );

  const renderSettingsView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Hospital Affiliation</h3>
            <div className="p-4 rounded-xl bg-accent/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {doctorProfile?.hospital_name || "Not assigned"}
                  </p>
                  {doctorProfile?.hospital_city && (
                    <p className="text-xs text-muted-foreground">{doctorProfile.hospital_city}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 bg-muted rounded-lg p-2">
                🔒 Hospital affiliation is set during registration and cannot be changed. Contact admin for transfers.
              </p>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <p className="text-sm text-muted-foreground">
              You will receive notifications when patients request your review.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderAccountView = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {doctorProfile?.first_name?.[0]}{doctorProfile?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Dr. {doctorProfile?.first_name} {doctorProfile?.last_name}
              </h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm text-foreground">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hospital</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <p className="text-sm text-foreground">
                  {doctorProfile?.hospital_name || "Not assigned"}
                  {doctorProfile?.hospital_city && ` — ${doctorProfile.hospital_city}`}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <p className="text-sm text-foreground">{doctorProfile?.phone || "Not provided"}</p>
            </div>
          </div>
          <Separator />
          <Button variant="destructive" onClick={async () => { await signOut(); navigate("/"); }} className="w-full">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderView = () => {
    switch (activeView) {
      case "home": return renderHomeView();
      case "requests": return renderRequestsView();
      case "cases": return renderCasesView();
      case "patients": return renderPatientsView();
      case "analytics": return <DoctorAnalytics cases={cases} />;
      case "history": return renderHistoryView();
      case "settings": return renderSettingsView();
      case "account": return renderAccountView();
      default: return renderHomeView();
    }
  };

  const viewTitles: Record<string, string> = {
    home: "Dashboard",
    requests: "Verification Requests",
    cases: "All Cases",
    patients: "Patients",
    analytics: "Analytics",
    history: "Patient History",
    settings: "Settings",
    account: "Account",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DoctorSidebar activeView={activeView} onViewChange={setActiveView} requestCount={myRequests.length} />
        <main className="flex-1 overflow-auto">
          <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-40 px-4 h-14 flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="font-display font-semibold text-foreground">{viewTitles[activeView] || "Dashboard"}</h1>
            {doctorProfile?.hospital_name && (
              <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {doctorProfile.hospital_name}
              </div>
            )}
          </header>
          <div className="p-6">
            {renderView()}
          </div>
        </main>
      </div>

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
    </SidebarProvider>
  );
}

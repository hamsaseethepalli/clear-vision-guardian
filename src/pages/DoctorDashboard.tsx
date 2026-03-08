import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GradeScale } from "@/components/GradeScale";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/retino-logo.png";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Search, CheckCircle2, XCircle, Clock,
  FileText, Users, TrendingUp, AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    const { data, error } = await supabase
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
      })));
    }
    setLoading(false);
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.patient_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = cases.filter(c => c.status === 'pending_review').length;
  const approvedCount = cases.filter(c => c.status === 'approved').length;

  const handleDecision = async (reportId: string, decision: 'approved' | 'rejected') => {
    if (!user) return;

    const { error } = await supabase
      .from("reports")
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Audit log
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
            <span className="font-display font-bold text-foreground">Doctor Console</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
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

        {/* Cases */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Patient Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading cases...</p>
            ) : (
              <div className="space-y-3">
                {filteredCases.map(c => (
                  <div
                    key={c.id}
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
                  </div>
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
      </main>

      {/* Decision Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              Case Review — {selectedCase?.patient_name}
            </DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Patient ID</p>
                  <p className="font-medium text-sm text-foreground">{selectedCase.patient_id.slice(0, 8)}</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium text-sm text-foreground">
                    {new Date(selectedCase.created_at).toLocaleString()}
                  </p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

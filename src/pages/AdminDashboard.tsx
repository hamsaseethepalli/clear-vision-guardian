import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/retino-logo.png";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Shield, CheckCircle2, XCircle, Users, FileCheck, Clock } from "lucide-react";

interface DoctorApplication {
  id: string;
  name: string;
  email: string;
  license: string;
  specialization: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

const MOCK_APPLICATIONS: DoctorApplication[] = [
  { id: "d-001", name: "Dr. Anjali Gupta", email: "anjali@clinic.com", license: "MCI-78901", specialization: "Ophthalmology", status: "pending", submittedAt: "2026-03-07" },
  { id: "d-002", name: "Dr. Ravi Kumar", email: "ravi@hospital.com", license: "MCI-45678", specialization: "Retinal Surgery", status: "pending", submittedAt: "2026-03-06" },
  { id: "d-003", name: "Dr. Meera Shah", email: "meera@eye.com", license: "MCI-12345", specialization: "Ophthalmology", status: "approved", submittedAt: "2026-03-01" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);

  const handleDecision = (id: string, decision: 'approved' | 'rejected') => {
    setApplications(prev => prev.map(a =>
      a.id === id ? { ...a, status: decision } : a
    ));
    toast({
      title: decision === 'approved' ? "Doctor Approved" : "Doctor Rejected",
      description: "The decision has been recorded in the audit log.",
    });
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Retino AI" className="h-8 w-8" />
            <span className="font-display font-bold text-foreground">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending Verifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-info" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{applications.length}</p>
                  <p className="text-xs text-muted-foreground">Total Applications</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{applications.filter(a => a.status === 'approved').length}</p>
                  <p className="text-xs text-muted-foreground">Verified Doctors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor Verification */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Doctor Verification Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {applications.map(app => (
                <div key={app.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-foreground">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.email}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        License: {app.license}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {app.specialization}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.status === 'pending' ? (
                      <>
                        <Button size="sm" variant="success" onClick={() => handleDecision(app.id, 'approved')}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDecision(app.id, 'rejected')}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </>
                    ) : (
                      <Badge className={
                        app.status === 'approved'
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      } variant="outline">
                        {app.status === 'approved' ? 'Verified' : 'Rejected'}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

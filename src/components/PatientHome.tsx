import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Eye, Shield, Clock, TrendingUp } from "lucide-react";
import type { Report } from "@/lib/types";

interface PatientHomeProps {
  reports: Report[];
  onNavigate: (view: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function PatientHome({ reports, onNavigate }: PatientHomeProps) {
  const pendingCount = reports.filter(r => r.status === "pending_review").length;
  const approvedCount = reports.filter(r => r.status === "approved").length;
  const latestGrade = reports.length > 0 ? reports[0].grade : null;

  const stats = [
    { label: "Total Scans", value: reports.length, icon: FileText, color: "text-info" },
    { label: "Pending Review", value: pendingCount, icon: Clock, color: "text-warning" },
    { label: "Approved", value: approvedCount, icon: Shield, color: "text-success" },
    { label: "Latest Grade", value: latestGrade !== null ? `Grade ${latestGrade}` : "—", icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Welcome Banner */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl gradient-hero p-8 text-primary-foreground">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 h-32 w-32 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-4 left-8 h-24 w-24 rounded-full bg-info blur-2xl" />
        </div>
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-bold mb-2">Welcome to Retino AI</h1>
          <p className="text-primary-foreground/70 max-w-md mb-6">
            Upload retinal fundus images for instant AI-powered diabetic retinopathy screening.
          </p>
          <Button variant="hero" size="lg" onClick={() => onNavigate("scan")}>
            <Upload className="h-5 w-5 mr-2" /> Start New Scan
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.03, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-default">
              <CardContent className="p-5">
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

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { title: "Upload Retinal Image", desc: "AI-powered screening in seconds", icon: Upload, view: "scan", gradient: "from-primary/10 to-accent" },
            { title: "View Reports", desc: "Track your screening history", icon: FileText, view: "history", gradient: "from-info/10 to-accent" },
            { title: "Find a Doctor", desc: "Select doctor for verification", icon: Eye, view: "doctors", gradient: "from-success/10 to-accent" },
          ].map((action) => (
            <motion.div
              key={action.title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`shadow-card hover:shadow-elevated transition-all cursor-pointer border-border/50 bg-gradient-to-br ${action.gradient}`}
                onClick={() => onNavigate(action.view)}
              >
                <CardContent className="p-6">
                  <action.icon className="h-8 w-8 text-primary mb-3" />
                  <h3 className="font-display font-semibold text-foreground mb-1">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-foreground">Recent Reports</h2>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("history")}>
              View All →
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.slice(0, 3).map((report, i) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -3 }}
              >
                <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-muted-foreground">#{report.id.slice(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        report.status === "approved" ? "bg-success/10 text-success" :
                        report.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-warning/10 text-warning"
                      }`}>
                        {report.status === "pending_review" ? "Pending" : report.status}
                      </span>
                    </div>
                    <p className="font-display font-semibold text-foreground">{report.gradeLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(report.createdAt).toLocaleDateString()} · {Math.round(report.confidence * 100)}% confidence
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

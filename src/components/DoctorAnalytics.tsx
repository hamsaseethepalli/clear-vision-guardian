import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { TrendingUp, PieChart as PieIcon, BarChart3, Activity } from "lucide-react";

interface CaseData {
  grade: number;
  confidence: number;
  status: string;
  created_at: string;
  patient_id: string;
}

const GRADE_COLORS = [
  "hsl(152, 60%, 40%)",  // grade 0
  "hsl(80, 50%, 45%)",   // grade 1
  "hsl(38, 92%, 50%)",   // grade 2
  "hsl(15, 80%, 50%)",   // grade 3
  "hsl(0, 72%, 51%)",    // grade 4
];

const GRADE_NAMES = ["No DR", "Mild", "Moderate", "Severe", "Proliferative"];

interface DoctorAnalyticsProps {
  cases: CaseData[];
}

export function DoctorAnalytics({ cases }: DoctorAnalyticsProps) {
  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    cases.forEach(c => { if (c.grade >= 0 && c.grade <= 4) counts[c.grade]++; });
    return counts.map((count, i) => ({
      name: GRADE_NAMES[i],
      value: count,
      fill: GRADE_COLORS[i],
    }));
  }, [cases]);

  // Cases over time (last 30 days, grouped by day)
  const casesOverTime = useMemo(() => {
    const now = new Date();
    const days: Record<string, { date: string; cases: number; highRisk: number }> = {};
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: d.toLocaleDateString("en", { month: "short", day: "numeric" }), cases: 0, highRisk: 0 };
    }

    cases.forEach(c => {
      const key = c.created_at.slice(0, 10);
      if (days[key]) {
        days[key].cases++;
        if (c.grade >= 3) days[key].highRisk++;
      }
    });

    return Object.values(days);
  }, [cases]);

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const counts = { pending_review: 0, approved: 0, rejected: 0 };
    cases.forEach(c => {
      if (c.status in counts) counts[c.status as keyof typeof counts]++;
    });
    return [
      { name: "Pending", value: counts.pending_review, fill: "hsl(38, 92%, 50%)" },
      { name: "Approved", value: counts.approved, fill: "hsl(152, 60%, 40%)" },
      { name: "Rejected", value: counts.rejected, fill: "hsl(0, 72%, 51%)" },
    ];
  }, [cases]);

  // Average confidence by grade
  const confidenceByGrade = useMemo(() => {
    const sums = [0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0];
    cases.forEach(c => {
      if (c.grade >= 0 && c.grade <= 4) {
        sums[c.grade] += c.confidence;
        counts[c.grade]++;
      }
    });
    return GRADE_NAMES.map((name, i) => ({
      name,
      confidence: counts[i] > 0 ? Math.round((sums[i] / counts[i]) * 100) : 0,
      fill: GRADE_COLORS[i],
    }));
  }, [cases]);

  if (cases.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Analytics will appear once reports are submitted.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Cases Over Time */}
      <Card className="shadow-card md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Cases Over Time (30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={casesOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="hsl(210, 15%, 46%)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(210, 15%, 46%)" />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(210, 20%, 90%)", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="cases" stroke="hsl(174, 62%, 38%)" strokeWidth={2} dot={false} name="Total Cases" />
              <Line type="monotone" dataKey="highRisk" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} name="High Risk (Grade 3-4)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Grade Distribution */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Grade Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeDistribution}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(210, 15%, 46%)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(210, 15%, 46%)" />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(210, 20%, 90%)", fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Cases">
                {gradeDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-primary" />
            Review Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
                fontSize={11}
              >
                {statusBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Confidence by Grade */}
      <Card className="shadow-card md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Average AI Confidence by Grade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={confidenceByGrade} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(210, 15%, 46%)" unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} stroke="hsl(210, 15%, 46%)" />
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="confidence" radius={[0, 4, 4, 0]} name="Confidence">
                {confidenceByGrade.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

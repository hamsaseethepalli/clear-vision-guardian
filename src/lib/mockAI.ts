// Simulated AI analysis for retinal images
export interface AIResult {
  grade: 0 | 1 | 2 | 3 | 4;
  confidence: number;
  gradeLabel: string;
  riskLevel: string;
  explanation: string;
  recommendations: string[];
}

const GRADE_DATA: Record<number, Omit<AIResult, 'confidence'>> = {
  0: {
    grade: 0,
    gradeLabel: "No Diabetic Retinopathy",
    riskLevel: "Low",
    explanation: "No signs of diabetic retinopathy detected. The retinal vasculature appears normal with no microaneurysms, hemorrhages, or exudates.",
    recommendations: ["Continue regular annual eye examinations", "Maintain blood sugar control", "Monitor HbA1c levels"],
  },
  1: {
    grade: 1,
    gradeLabel: "Mild NPDR",
    riskLevel: "Low-Moderate",
    explanation: "Mild non-proliferative diabetic retinopathy detected. A few microaneurysms are present in the retinal vasculature.",
    recommendations: ["Schedule follow-up in 9-12 months", "Optimize glycemic control", "Monitor blood pressure"],
  },
  2: {
    grade: 2,
    gradeLabel: "Moderate NPDR",
    riskLevel: "Moderate",
    explanation: "Moderate non-proliferative diabetic retinopathy detected. Multiple microaneurysms, dot-blot hemorrhages, and hard exudates observed.",
    recommendations: ["Refer to ophthalmologist within 3-6 months", "Strict blood sugar management", "Consider lipid-lowering therapy"],
  },
  3: {
    grade: 3,
    gradeLabel: "Severe NPDR",
    riskLevel: "High",
    explanation: "Severe non-proliferative diabetic retinopathy detected. Extensive hemorrhages, venous beading, and intraretinal microvascular abnormalities present.",
    recommendations: ["Urgent ophthalmology referral within 2-4 weeks", "Consider panretinal photocoagulation", "Intensive metabolic management"],
  },
  4: {
    grade: 4,
    gradeLabel: "Proliferative DR",
    riskLevel: "Critical",
    explanation: "Proliferative diabetic retinopathy detected. Neovascularization and/or vitreous/preretinal hemorrhage identified. Immediate treatment required.",
    recommendations: ["Emergency ophthalmology referral", "Panretinal photocoagulation or anti-VEGF therapy", "Consider vitrectomy if vitreous hemorrhage present"],
  },
};

export async function simulateAIAnalysis(): Promise<AIResult> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Weighted random grade (more likely to be 0-2)
  const weights = [0.35, 0.25, 0.20, 0.12, 0.08];
  const random = Math.random();
  let cumulative = 0;
  let grade = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      grade = i;
      break;
    }
  }
  
  const confidence = 0.85 + Math.random() * 0.14; // 85-99%
  const data = GRADE_DATA[grade];
  
  return {
    ...data,
    grade: grade as AIResult['grade'],
    confidence: Math.round(confidence * 100) / 100,
  };
}

export const GRADE_COLORS = [
  "bg-grade-0",
  "bg-grade-1", 
  "bg-grade-2",
  "bg-grade-3",
  "bg-grade-4",
] as const;

export const GRADE_LABELS = [
  "Grade 0 — No DR",
  "Grade 1 — Mild",
  "Grade 2 — Moderate",
  "Grade 3 — Severe",
  "Grade 4 — Proliferative",
] as const;

export type UserRole = 'patient' | 'doctor' | 'admin';

export type ReportStatus = 'pending_review' | 'approved' | 'rejected';

export interface Report {
  id: string;
  patientId: string;
  patientName: string;
  imageUrl: string;
  grade: number;
  confidence: number;
  gradeLabel: string;
  riskLevel: string;
  explanation: string;
  recommendations: string[];
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  doctorNotes?: string;
}

export interface AnalysisStep {
  label: string;
  status: 'pending' | 'active' | 'complete';
}

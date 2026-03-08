import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Stethoscope, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface Hospital {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
}

interface Doctor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  hospital_id: string | null;
}

interface DoctorSelectorProps {
  selectedHospitalId: string | null;
  selectedDoctorId: string | null;
  onHospitalChange: (id: string | null) => void;
  onDoctorChange: (id: string | null) => void;
}

export function DoctorSelector({
  selectedHospitalId,
  selectedDoctorId,
  onHospitalChange,
  onDoctorChange,
}: DoctorSelectorProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data } = await supabase.from("hospitals").select("*").order("name");
      if (data) setHospitals(data);
      setLoadingHospitals(false);
    };
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (!selectedHospitalId) {
      setDoctors([]);
      return;
    }
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      // Get doctors with the selected hospital
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, hospital_id")
        .eq("hospital_id", selectedHospitalId);

      // Filter only those with doctor role
      if (data && data.length > 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "doctor")
          .in("user_id", data.map(d => d.user_id));

        const doctorUserIds = new Set(roles?.map(r => r.user_id) || []);
        setDoctors(data.filter(d => doctorUserIds.has(d.user_id)));
      } else {
        setDoctors([]);
      }
      setLoadingDoctors(false);
    };
    fetchDoctors();
  }, [selectedHospitalId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Select Hospital & Doctor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Hospital</label>
            <Select
              value={selectedHospitalId || ""}
              onValueChange={(v) => {
                onHospitalChange(v || null);
                onDoctorChange(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingHospitals ? "Loading..." : "Choose a hospital"} />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span>{h.name}</span>
                      {h.city && (
                        <Badge variant="outline" className="text-[10px] ml-1">
                          <MapPin className="h-2 w-2 mr-0.5" />{h.city}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedHospitalId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <label className="text-xs text-muted-foreground font-medium">Doctor</label>
              <Select
                value={selectedDoctorId || ""}
                onValueChange={(v) => onDoctorChange(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    loadingDoctors ? "Loading doctors..." :
                    doctors.length === 0 ? "No doctors at this hospital" :
                    "Choose a doctor"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.user_id} value={d.user_id}>
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-3 w-3 text-muted-foreground" />
                        <span>Dr. {d.first_name} {d.last_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {doctors.length === 0 && !loadingDoctors && (
                <p className="text-xs text-muted-foreground italic">
                  No verified doctors are currently available at this hospital. Your report will be reviewed by any available doctor.
                </p>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

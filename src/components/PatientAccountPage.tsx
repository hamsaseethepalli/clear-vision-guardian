import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Save, Loader2, KeyRound, Lock } from "lucide-react";

export function PatientAccountPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setPhone(data.phone || "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, phone })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("account.profileUpdated"), description: t("account.savedDesc") });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: t("account.passwordMinLength"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: t("account.passwordMismatch"), variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("account.passwordChanged"), description: "" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  if (loading) return <p className="text-muted-foreground text-center py-12">{t("common.loading")}</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{t("account.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("account.subtitle")}</p>
      </div>

      {/* Avatar Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="shadow-card">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display font-semibold text-foreground text-lg">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Patient"}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("account.memberSince")} {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Personal Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> {t("account.personalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t("account.firstName")}</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t("account.lastName")}</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("account.email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" value={user?.email || ""} disabled className="pl-10 opacity-60" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("account.phone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." className="pl-10" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t("account.save")}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security — Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> {t("account.security")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("account.newPassword")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("account.confirmPassword")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="w-full sm:w-auto">
              {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
              {t("account.changePassword")}
            </Button>
            <Separator className="my-3" />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{t("account.twoFactor")}</p>
                <p className="text-xs text-muted-foreground">{t("account.twoFactorDesc")}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                {t("common.comingSoon")}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

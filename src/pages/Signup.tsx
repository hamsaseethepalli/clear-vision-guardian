import { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logo from "@/assets/retino-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Building2 } from "lucide-react";
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  licenseSchema,
  specializationSchema,
  otpSchema,
  checkRateLimit,
} from "@/lib/security";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Step = "info" | "otp" | "done";

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("info");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [license, setLicense] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hospitalId, setHospitalId] = useState("");
  const [hospitals, setHospitals] = useState<{ id: string; name: string; city: string | null }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchHospitals = async () => {
      const { data } = await supabase.from("hospitals").select("id, name, city").order("name");
      if (data) setHospitals(data);
    };
    fetchHospitals();
  }, []);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    const fn = nameSchema.safeParse(firstName);
    if (!fn.success) errs.firstName = fn.error.issues[0].message;
    const ln = nameSchema.safeParse(lastName);
    if (!ln.success) errs.lastName = ln.error.issues[0].message;
    const em = emailSchema.safeParse(email);
    if (!em.success) errs.email = em.error.issues[0].message;
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) errs.password = pw.error.issues[0].message;
    if (role === "doctor") {
      const lic = licenseSchema.safeParse(license);
      if (!lic.success) errs.license = lic.error.issues[0].message;
      const sp = specializationSchema.safeParse(specialization);
      if (!sp.success) errs.specialization = sp.error.issues[0].message;
      if (!hospitalId) errs.hospital = "Please select your hospital";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [firstName, lastName, email, password, role, license, specialization]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!checkRateLimit(`signup:${email}`, 3, 120_000)) {
      toast({ title: "Too many attempts", description: "Please wait before trying again.", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Create unverified account — Supabase sends OTP email automatically
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    setLoading(false);

    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return;
    }

    // Store doctor application intent
    if (role === "doctor") {
      localStorage.setItem(
        "pending_doctor_application",
        JSON.stringify({ license_number: license.trim(), specialization: specialization.trim() })
      );
    }

    toast({ title: "Verification code sent!", description: `Check your inbox at ${email}` });
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      toast({ title: "Invalid code", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }

    if (!checkRateLimit(`verify:${email}`, 5, 120_000)) {
      toast({ title: "Too many attempts", description: "Please wait before trying again.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: "signup",
    });

    setLoading(false);

    if (error) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      return;
    }

    setStep("done");
    toast({ title: "Email verified!", description: "Your account is now active." });

    // Redirect based on role after short delay
    setTimeout(() => {
      navigate(role === "doctor" ? "/doctor" : "/patient");
    }, 1500);
  };

  const handleResendOtp = async () => {
    if (!checkRateLimit(`resend:${email}`, 2, 120_000)) {
      toast({ title: "Too many resend attempts", description: "Please wait 2 minutes.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
    if (error) {
      toast({ title: "Resend failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Code resent!", description: "Check your inbox again." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-elevated border-border/50">
        <CardHeader className="text-center space-y-4 pb-2">
          <Link to="/" className="inline-flex items-center justify-center gap-2">
            <img src={logo} alt="Retino AI" className="h-12 w-auto" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {step === "info" && "Create Account"}
              {step === "otp" && "Verify Email"}
              {step === "done" && "Welcome!"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "info" && "Select your account type to get started"}
              {step === "otp" && `Enter the 6-digit code sent to ${email}`}
              {step === "done" && "Your account has been verified successfully"}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {/* ── Step 1: Information ── */}
          {step === "info" && (
            <>
              {/* Role selector */}
              <div className="flex gap-2 mb-6">
                {(["patient", "doctor"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                      role === r
                        ? "gradient-primary text-primary-foreground shadow-glow"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {r === "patient" ? "🏥 Patient" : "🩺 Doctor"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      aria-invalid={!!errors.firstName}
                    />
                    {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      aria-invalid={!!errors.lastName}
                    />
                    {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 chars, upper, lower, number, special"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      aria-invalid={!!errors.password}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>

                {role === "doctor" && (
                  <>
                    <div className="space-y-2">
                      <Label>Medical License Number</Label>
                      <Input
                        placeholder="e.g. MCI-12345"
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        aria-invalid={!!errors.license}
                      />
                      {errors.license && <p className="text-xs text-destructive">{errors.license}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Specialization</Label>
                      <Input
                        placeholder="e.g. Ophthalmology"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        aria-invalid={!!errors.specialization}
                      />
                      {errors.specialization && <p className="text-xs text-destructive">{errors.specialization}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground bg-accent/50 rounded-lg p-3">
                      <Shield className="inline h-3 w-3 mr-1" />
                      Doctor accounts require admin verification before activation.
                    </p>
                  </>
                )}

                <Button type="submit" className="w-full" variant="hero" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...
                    </>
                  ) : (
                    "Send Verification Code"
                  )}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}

          {/* ── Step 2: OTP Verification ── */}
          {step === "otp" && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full"
                variant="hero"
                disabled={loading || otp.length !== 6}
                onClick={handleVerifyOtp}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify & Create Account"
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={() => { setStep("info"); setOtp(""); }}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <button onClick={handleResendOtp} className="text-primary hover:underline">
                  Resend code
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Success ── */}
          {step === "done" && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
              <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

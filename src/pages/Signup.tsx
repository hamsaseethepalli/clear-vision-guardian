import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import logo from "@/assets/retino-logo.png";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Account created!", description: role === 'doctor' ? "Your account is pending verification." : "Welcome to Retino AI." });
      navigate(role === 'doctor' ? "/login" : "/patient");
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-elevated border-border/50">
        <CardHeader className="text-center space-y-4 pb-2">
          <Link to="/" className="inline-flex items-center justify-center gap-2">
            <img src={logo} alt="Retino AI" className="h-10 w-10" />
            <span className="font-display font-bold text-xl text-foreground">Retino AI</span>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join Retino AI for clinical screening</p>
          </div>
        </CardHeader>
        <CardContent>
          {/* Role selector */}
          <div className="flex gap-2 mb-6">
            {(['patient', 'doctor'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                  role === r
                    ? 'gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {r === 'patient' ? '🏥 Patient' : '🩺 Doctor'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input placeholder="John" required />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input placeholder="Doe" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="Min. 8 characters" required />
            </div>
            {role === 'doctor' && (
              <>
                <div className="space-y-2">
                  <Label>Medical License Number</Label>
                  <Input placeholder="e.g. MCI-12345" required />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input placeholder="e.g. Ophthalmology" required />
                </div>
                <p className="text-xs text-muted-foreground bg-accent/50 rounded-lg p-3">
                  Doctor accounts require admin verification before activation. You'll need to upload your medical certificate after signup.
                </p>
              </>
            )}
            <Button type="submit" className="w-full" variant="hero" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

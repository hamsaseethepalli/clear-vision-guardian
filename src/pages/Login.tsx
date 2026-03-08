import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import logo from "@/assets/retino-logo.png";
import { Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Mock login - route based on email pattern
    setTimeout(() => {
      setLoading(false);
      if (email.includes("doctor")) {
        navigate("/doctor");
      } else if (email.includes("admin")) {
        navigate("/admin");
      } else {
        navigate("/patient");
      }
      toast({ title: "Welcome back!", description: "You have been logged in successfully." });
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
            <h1 className="font-display text-2xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" variant="hero" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Tip: Use "doctor@" for doctor view, "admin@" for admin
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

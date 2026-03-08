import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-retina.jpg";
import logo from "@/assets/retino-logo.png";
import { Eye, Shield, Brain, ArrowRight, Upload, FileCheck, Stethoscope } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Retino AI" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Sign In
            </Button>
            <Button variant="hero" onClick={() => navigate("/signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="gradient-hero">
          <div className="container mx-auto px-4 py-24 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 animate-slide-up">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  <Brain className="h-4 w-4" />
                  AI-Powered Clinical Screening
                </div>
                <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight text-primary-foreground leading-tight">
                  Retinal Screening,{" "}
                  <span className="text-primary">Reimagined</span>
                </h1>
                <p className="text-lg text-primary-foreground/70 max-w-lg">
                  Clinical-grade AI analysis for diabetic retinopathy detection.
                  Upload a retinal image and receive instant, accurate grading with
                  doctor-verified reports.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button variant="hero" size="lg" onClick={() => navigate("/signup")}>
                    Start Screening <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="relative animate-fade-in">
                <div className="rounded-2xl overflow-hidden shadow-elevated border border-primary/20">
                  <img src={heroImage} alt="AI Retinal Analysis" className="w-full h-auto" />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-elevated p-4 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">HIPAA Compliant</p>
                      <p className="text-xs text-muted-foreground">Secure & Encrypted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              Three simple steps from upload to verified clinical report
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Upload, title: "Upload", desc: "Patient uploads a retinal fundus image securely" },
              { icon: Eye, title: "AI Analysis", desc: "AI model classifies diabetic retinopathy grade instantly" },
              { icon: FileCheck, title: "Doctor Review", desc: "Verified doctor approves the report for download" },
            ].map((step, i) => (
              <div key={i} className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card border border-border/50">
                <div className="mx-auto h-14 w-14 rounded-xl gradient-primary flex items-center justify-center">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {i + 1}
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-primary mb-6" />
          <h2 className="font-display text-3xl font-bold text-primary-foreground mb-4">
            Ready to Transform Retinal Care?
          </h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Join thousands of clinicians using AI-powered screening
          </p>
          <Button variant="hero" size="lg" onClick={() => navigate("/signup")}>
            Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-border/50 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <img src={logo} alt="Retino AI" className="h-10 w-auto" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Clinical-grade AI screening for diabetic retinopathy. Fast, secure, and physician-verified.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-display font-semibold text-foreground">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/signup")}>Get Started</li>
                <li className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate("/login")}>Sign In</li>
                <li>AI Screening</li>
                <li>Doctor Review</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-display font-semibold text-foreground">Compliance</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-success" /> HIPAA Compliant</li>
                <li className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-success" /> End-to-End Encryption</li>
                <li className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-success" /> OWASP Top 10 Hardened</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Retino AI. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              For clinical decision support only. Not a substitute for professional medical advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

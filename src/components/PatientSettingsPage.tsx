import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Moon, Bell, Globe, Shield, Eye } from "lucide-react";

export function PatientSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("en");
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  // Load language preference from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("language_preference")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.language_preference) setLanguage(data.language_preference);
      });
  }, [user]);

  const toggleDarkMode = (enabled: boolean) => {
    setDarkMode(enabled);
    if (enabled) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    if (user) {
      await supabase
        .from("profiles")
        .update({ language_preference: lang })
        .eq("user_id", user.id);
      toast({ title: "Language updated", description: "Your language preference has been saved." });
    }
  };

  const settingsSections = [
    {
      title: "Appearance",
      icon: Moon,
      items: [
        {
          label: "Dark Mode",
          description: "Switch between light and dark theme",
          control: <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />,
        },
        {
          label: "High Contrast",
          description: "Increase contrast for better readability",
          control: <Switch checked={highContrast} onCheckedChange={setHighContrast} />,
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          label: "Report Updates",
          description: "Get notified when a doctor reviews your report",
          control: <Switch checked={notifications} onCheckedChange={setNotifications} />,
        },
      ],
    },
    {
      title: "Analysis",
      icon: Eye,
      items: [
        {
          label: "Auto-Analyze on Upload",
          description: "Automatically start AI analysis when an image is uploaded",
          control: <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />,
        },
      ],
    },
    {
      title: "Language",
      icon: Globe,
      items: [
        {
          label: "Display Language",
          description: "Choose your preferred language",
          control: (
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="ta">தமிழ்</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
                <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
      ],
    },
    {
      title: "Privacy & Security",
      icon: Shield,
      items: [
        {
          label: "Data Encryption",
          description: "All your medical data is encrypted end-to-end",
          control: (
            <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
              Active
            </span>
          ),
        },
        {
          label: "HIPAA Compliance",
          description: "Your data is handled in compliance with HIPAA regulations",
          control: (
            <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
              Compliant
            </span>
          ),
        },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Customize your experience</p>
      </div>

      {settingsSections.map((section, si) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: si * 0.08 }}
        >
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {section.items.map((item, ii) => (
                <div key={item.label}>
                  {ii > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-foreground">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {item.control}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

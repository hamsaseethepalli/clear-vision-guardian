import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useI18n, type Language } from "@/hooks/useI18n";
import { Moon, Bell, Globe, Shield, Eye } from "lucide-react";

export function PatientSettingsPage() {
  const { t, language, setLanguage } = useI18n();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [notifications, setNotifications] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

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

  const settingsSections = [
    {
      title: "Appearance",
      icon: Moon,
      items: [
        {
          label: t("settings.darkMode"),
          description: t("settings.darkModeDesc"),
          control: <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />,
        },
        {
          label: t("settings.highContrast"),
          description: t("settings.highContrastDesc"),
          control: <Switch checked={highContrast} onCheckedChange={setHighContrast} />,
        },
      ],
    },
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          label: t("settings.notifications"),
          description: t("settings.notificationsDesc"),
          control: <Switch checked={notifications} onCheckedChange={setNotifications} />,
        },
      ],
    },
    {
      title: "Analysis",
      icon: Eye,
      items: [
        {
          label: t("settings.autoAnalyze"),
          description: t("settings.autoAnalyzeDesc"),
          control: <Switch checked={autoAnalyze} onCheckedChange={setAutoAnalyze} />,
        },
      ],
    },
    {
      title: "Language",
      icon: Globe,
      items: [
        {
          label: t("settings.language"),
          description: t("settings.languageDesc"),
          control: (
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिन्दी</SelectItem>
                <SelectItem value="ta">தமிழ்</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
                <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                <SelectItem value="ml">മലയാളം</SelectItem>
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
          label: t("settings.encryption"),
          description: t("settings.encryptionDesc"),
          control: (
            <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
              Active
            </span>
          ),
        },
        {
          label: t("settings.hipaa"),
          description: t("settings.hipaaDesc"),
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
        <h1 className="font-display text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("settings.subtitle")}</p>
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

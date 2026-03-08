import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import logo from "@/assets/retino-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Home, Upload, History, Settings, User, LogOut, Stethoscope,
  Bell, BookOpen, Phone, HelpCircle,
} from "lucide-react";

interface PatientSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function PatientSidebar({ activeView, onViewChange }: PatientSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { t } = useI18n();
  const collapsed = state === "collapsed";

  const mainMenu = [
    { id: "home", title: t("nav.home"), icon: Home },
    { id: "scan", title: t("nav.scan"), icon: Upload },
    { id: "history", title: t("nav.history"), icon: History },
    { id: "doctors", title: t("nav.doctors"), icon: Stethoscope },
  ];

  const secondaryMenu = [
    { id: "notifications", title: t("nav.notifications"), icon: Bell },
    { id: "education", title: t("nav.education"), icon: BookOpen },
    { id: "emergency", title: t("nav.emergency"), icon: Phone },
    { id: "help", title: t("nav.help"), icon: HelpCircle },
  ];

  const bottomMenu = [
    { id: "settings", title: t("nav.settings"), icon: Settings },
    { id: "account", title: t("nav.account"), icon: User },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <img src={logo} alt="Retino AI" className="h-6 w-6" />
            {!collapsed && <span className="font-display font-bold text-sidebar-foreground">Retino AI</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenu.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="mx-3 bg-sidebar-border" />}

        {/* Secondary */}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-2">
              Resources
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryMenu.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="mx-3 bg-sidebar-border" />}

        {/* Settings & Account */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomMenu.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground hover:text-sidebar-primary" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

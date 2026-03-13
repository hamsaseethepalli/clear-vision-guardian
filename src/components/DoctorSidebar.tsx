import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
  Home, FileText, BarChart3, History, Settings, User, LogOut,
  Bell, Users,
} from "lucide-react";

interface DoctorSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  requestCount?: number;
}

export function DoctorSidebar({ activeView, onViewChange, requestCount = 0 }: DoctorSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const mainMenu = [
    { id: "home", title: "Dashboard", icon: Home },
    { id: "requests", title: "Requests", icon: Bell, badge: requestCount },
    { id: "cases", title: "All Cases", icon: FileText },
    { id: "patients", title: "Patients", icon: Users },
  ];

  const secondaryMenu = [
    { id: "analytics", title: "Analytics", icon: BarChart3 },
    { id: "history", title: "Patient History", icon: History },
  ];

  const bottomMenu = [
    { id: "settings", title: "Settings", icon: Settings },
    { id: "account", title: "Account", icon: User },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "D";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <img src={logo} alt="Retino AI" className="h-6 w-6" />
            {!collapsed && <span className="font-display font-bold text-sidebar-foreground">Doctor Console</span>}
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
                    {!collapsed && (
                      <span className="flex items-center gap-2">
                        {item.title}
                        {item.badge && item.badge > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-destructive text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="mx-3 bg-sidebar-border" />}

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50 px-2">
              Insights
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

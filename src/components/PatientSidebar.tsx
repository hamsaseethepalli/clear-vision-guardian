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
import {
  Home, Upload, History, Settings, User, LogOut, Stethoscope,
} from "lucide-react";

interface PatientSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { id: "home", title: "Home", icon: Home },
  { id: "scan", title: "New Scan", icon: Upload },
  { id: "history", title: "Report History", icon: History },
  { id: "doctors", title: "Find Doctors", icon: Stethoscope },
  { id: "settings", title: "Settings", icon: Settings },
  { id: "account", title: "Account", icon: User },
];

export function PatientSidebar({ activeView, onViewChange }: PatientSidebarProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-2">
            <img src={logo} alt="Retino AI" className="h-6 w-6" />
            {!collapsed && <span className="font-display font-bold text-sidebar-foreground">Retino AI</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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

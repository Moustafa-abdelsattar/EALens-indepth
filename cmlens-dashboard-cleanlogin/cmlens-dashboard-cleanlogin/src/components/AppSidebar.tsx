import { Home, Phone, TrendingUp, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/user";
import ealensLogo from "@/assets/ealens-logo.svg";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

// Define all possible navigation items
const allItems = [
  { title: "Homepage", url: "/homepage", icon: Home, roles: [UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER] },
  { title: "Agent Calls", url: "/agent-calls", icon: Phone, roles: [UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER] },
  { title: "Sales Performance", url: "/sales-performance", icon: TrendingUp, roles: [UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER] },
  { title: "Teams Overview", url: "/teams-overview", icon: Users, roles: [UserRole.TEAM_VIEWER, UserRole.UPLOADER, UserRole.DEVELOPER] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { currentUser } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const isCollapsed = state === "collapsed";

  // Filter items based on user role
  const allowedItems = allItems.filter(item => {
    if (!currentUser || currentUser.role === undefined) return false;
    return item.roles.includes(currentUser.role as UserRole);
  });

  return (
    <Sidebar 
      className="border-r border-sidebar-border group w-16 hover:w-64 transition-all duration-300 ease-in-out overflow-hidden"
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-3">
          <img src={ealensLogo} alt="EALens Logo" className="h-10 w-10 flex-shrink-0" />
          <h2 className="text-xl font-bold bg-gradient-to-r from-sidebar-primary to-primary bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            EALens
          </h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allowedItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink 
                      to={item.url} 
                      className="flex items-center space-x-2 w-full"
                     >
                       <item.icon className="h-4 w-4 flex-shrink-0" />
                       <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.title}</span>
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
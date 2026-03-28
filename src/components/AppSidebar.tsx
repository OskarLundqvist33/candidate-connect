import { Briefcase, Users, LayoutDashboard, LogOut, UserPlus, Settings, Search, FileText } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { isAdmin, isEmployer, isJobSeeker, signOut, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const employerItems = [
    { title: t.pipeline, url: "/", icon: LayoutDashboard },
    { title: t.jobs, url: "/jobs", icon: Briefcase },
    { title: t.candidates, url: "/candidates", icon: Users },
  ];

  const jobSeekerItems = [
    { title: t.jobBoard, url: "/job-board", icon: Search },
    { title: t.myApplications, url: "/my-applications", icon: FileText },
  ];

  const adminItems = [
    { title: t.manageAccounts, url: "/admin/users", icon: UserPlus },
  ];

  // Wait for roles to load before deciding menu. Default to empty to avoid showing wrong items.
  const mainItems = isLoading
    ? []
    : isJobSeeker && !isAdmin && !isEmployer
      ? jobSeekerItems
      : employerItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {!collapsed && <span className="font-bold">TalentTrack</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t.admin}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-1">
        {!collapsed && user && (
          <p className="text-xs text-sidebar-foreground/60 truncate mb-2">{user.email}</p>
        )}
        <LanguageSwitcher collapsed={collapsed} />
        <SidebarMenuButton asChild>
          <NavLink to="/settings" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
            <Settings className="mr-2 h-4 w-4" />
            {!collapsed && <span>{t.settings}</span>}
          </NavLink>
        </SidebarMenuButton>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && t.signOut}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

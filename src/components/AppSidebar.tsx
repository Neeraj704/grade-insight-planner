import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookCopy, 
  Target, 
  User, 
  Shield, 
  GraduationCap, 
  TrendingUp 
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';

  const navigationItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Semesters', url: '/semesters', icon: BookCopy },
    { title: 'Predictions', url: '/predictions', icon: Target },
    { title: 'Profile', url: '/profile', icon: User },
  ];

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();
  
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-brand-primary text-primary-foreground hover:bg-brand-primary/90' 
      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground';

  return (
    <Sidebar>
      {/* Brand Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-brand-primary flex-shrink-0" />
          <div className="flex items-center gap-1">
            <span className="font-bold text-brand-primary">GradeInsight</span>
            <TrendingUp className="h-4 w-4 text-accent" />
          </div>
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                     <NavLink 
                       to={item.url} 
                       end={item.url === '/' || item.url === '/semesters'}
                       className={({ isActive }) => getNavCls({ isActive })}
                     >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Admin Link - Only show if user is admin */}
              {profile?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/admin" 
                      className={({ isActive }) => getNavCls({ isActive })}
                    >
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <span>Admin</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LogOut, 
  ClipboardList, 
  History,
  Calendar,
  User,
  Settings,
  PackagePlus,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { useAuth } from '@/src/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const today = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Inventario', path: '/dashboard', icon: <ClipboardList className="mr-2 h-5 w-5" /> },
    { label: 'Entradas', path: '/receipts', icon: <PackagePlus className="mr-2 h-5 w-5" /> },
    { label: 'Historial', path: '/history', icon: <History className="mr-2 h-5 w-5" /> },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', path: '/admin', icon: <Settings className="mr-2 h-5 w-5" /> });
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground">
          <ClipboardList size={24} />
        </div>
        <h1 className="font-bold text-xl tracking-tight">BarStock</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 rounded-xl font-medium transition-all ${
              location.pathname === item.path 
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' 
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-muted/50 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
            <User size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center lg:text-left">Usuario</p>
            <p className="text-sm font-bold truncate">{user?.name || 'Visitante'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex w-72 bg-card border-r border-border flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background/50 backdrop-blur-sm">
        {/* Header */}
        <header className="h-20 bg-card/80 backdrop-blur-md border-b border-border px-6 md:px-10 flex items-center justify-between shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {/* Mobile/Tablet Menu Trigger */}
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="lg:hidden active:scale-95 transition-transform">
                    <Menu size={24} />
                  </Button>
                }
              />
              <SheetContent side="left" className="p-0 w-80 bg-card border-r border-border">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navegación</SheetTitle>
                </SheetHeader>
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3 text-muted-foreground">
              <Calendar size={20} className="hidden md:block" />
              <span className="text-sm font-bold uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">{today}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <ThemeToggle />
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleLogout}
              className="h-12 px-4 md:px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl shadow-destructive/20 active:scale-95 transition-all"
            >
              <LogOut className="md:mr-2 h-5 w-5" />
              <span className="hidden md:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 bg-background/30">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Settings, 
  Package, 
  Tags, 
  Users,
  ChevronRight
} from 'lucide-react';
import { CategoryManager } from './admin/CategoryManager';
import { ProductManager } from './admin/ProductManager';
import { UserManager } from './admin/UserManager';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'categories' | 'products' | 'users'>('categories');

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  const tabs = [
    { id: 'categories', label: 'Categorías', icon: Tags },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'users', label: 'Usuarios', icon: Users },
  ] as const;

  return (
    <div className="flex flex-col h-full gap-8 md:gap-12 p-2 md:p-6 lg:p-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <Settings size={28} />
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Panel Administrativo</h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">Gestión de sistema y usuarios</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 h-full overflow-hidden">
        {/* Sidebar Tabs - Scrollable on mobile/tablet portrait */}
        <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 shrink-0 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all shrink-0 lg:w-64 active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-primary border-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105 lg:scale-110 z-10'
                  : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3 md:gap-4">
                <tab.icon size={24} className="md:w-7 md:h-7" />
                <span className="font-black text-xs md:text-sm uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
              </div>
              <ChevronRight size={20} className={`hidden lg:block transition-transform ${activeTab === tab.id ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-card/40 rounded-3xl md:rounded-[3rem] border border-border/50 backdrop-blur-md overflow-hidden flex flex-col shadow-2xl">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12">
            {activeTab === 'categories' && <CategoryManager />}
            {activeTab === 'products' && <ProductManager />}
            {activeTab === 'users' && <UserManager />}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  Calendar,
  Layers,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { inventoryService } from '@/src/services/inventoryService';
import { Product, Category, InventoryCount } from '@/src/types';
import { useUnit } from '@/src/contexts/UnitContext';
import { TracingBeam } from './ui/tracing-beam';
import { BorderBeam } from './ui/border-beam';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from './ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from './ui/tabs';

// --- Helpers ---
const getTimestamp = (u: any) => u?.toDate ? u.toDate().getTime() : (typeof u === 'string' ? new Date(u).getTime() : 0);

export const AdvancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { selectedUnitId } = useUnit();
  const [history, setHistory] = useState<InventoryCount[]>([]);
  const [currentCounts, setCurrentCounts] = useState<InventoryCount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hist, cats, prods, counts] = await Promise.all([
          inventoryService.getAllHistory(selectedUnitId),
          inventoryService.getCategories(),
          inventoryService.getProducts(),
          inventoryService.getCounts(selectedUnitId),
        ]);
        setHistory(hist);
        setCategories(cats);
        setProducts(prods);
        setCurrentCounts(counts);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedUnitId]);

  // Filter history by period
  const filteredHistory = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (period === '7d') cutoff.setDate(now.getDate() - 7);
    else if (period === '30d') cutoff.setDate(now.getDate() - 30);
    else if (period === '24h') cutoff.setHours(now.getHours() - 24);
    else return history;

    return history.filter(h => getTimestamp(h.updated_at) > cutoff.getTime());
  }, [history, period]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalEntradas = filteredHistory.filter(h => h.type === 'receipt').length;
    const totalSaidas = filteredHistory.filter(h => h.type === 'count').length;
    
    // Use currentCounts instead of logic searching history which might be slow/inaccurate
    const totalUnits = currentCounts.reduce((acc, c) => acc + (c.total_units || 0), 0);
    const critical = currentCounts.filter(c => c.is_critical).length;
    
    // Group units by day for chart
    const dailyData: Record<string, any> = {};
    const days = period === '30d' ? 30 : 7;
    for(let i=0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        dailyData[dateStr] = { date: dateStr, entradas: 0, salidas: 0 };
    }

    filteredHistory.forEach(h => {
      const date = new Date(getTimestamp(h.updated_at)).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      if (dailyData[date]) {
        if (h.type === 'receipt') dailyData[date].entradas += (h.received_boxes || 1);
        else dailyData[date].salidas += 1;
      }
    });

    const chartData = Object.values(dailyData).reverse();

    // Calculate Efficiency (products counted today / total products)
    const today = new Date();
    today.setHours(0,0,0,0);
    const countedToday = products.filter(p => {
        const h = history.find(h => h.product_id === p.id);
        return h && getTimestamp(h.updated_at) >= today.getTime();
    }).length;
    const efficiency = products.length > 0 ? Math.round((countedToday / products.length) * 100) : 0;

    // Categories breakdown
    const categoryStats = categories.map(cat => {
        const catProducts = products.filter(p => p.category_id === cat.id);
        const totalUnits = catProducts.reduce((acc, p) => {
            const c = currentCounts.find(count => count.product_id === p.id);
            return acc + (c?.total_units || 0);
        }, 0);
        const criticalCount = catProducts.filter(p => {
            const c = currentCounts.find(count => count.product_id === p.id);
            return c?.is_critical;
        }).length;

        // Get unique employees for this category from history
        const employeeIds = new Set(
            history
                .filter(h => catProducts.some(p => p.id === h.product_id))
                .map(h => h.employee_id)
        );

        return {
            ...cat,
            productCount: catProducts.length,
            totalUnits,
            criticalCount,
            isHealthy: criticalCount === 0,
            employeeCount: employeeIds.size,
            employees: Array.from(employeeIds).slice(0, 3)
        };
    }).sort((a, b) => b.totalUnits - a.totalUnits);

    // KEY DATA: Find category with most recent growth (receipts)
    const topReceiptCategory = categories.map(cat => {
        const count = filteredHistory.filter(h => 
            h.type === 'receipt' && 
            products.find(p => p.id === h.product_id)?.category_id === cat.id
        ).length;
        return { name: cat.name, count };
    }).sort((a, b) => b.count - a.count)[0];

    return {
      totalEntradas,
      totalSaidas,
      totalUnits,
      chartData,
      efficiency,
      categoryStats,
      topReceiptCategory,
      critical
    };
  }, [filteredHistory, history, currentCounts, products, categories, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Zap className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Sincronizando Datos...</p>
        </div>
      </div>
    );
  }

  return (
    <TracingBeam className="px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tighter text-foreground">Estado de <span className="text-primary italic">BarStock</span></h1>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Visualización en tiempo real del inventario</p>
            </div>
            
            <Tabs defaultValue="7d" onValueChange={setPeriod} className="w-full md:w-auto">
              <TabsList className="bg-card/50 backdrop-blur-xl border border-border">
                <TabsTrigger value="24h">24H</TabsTrigger>
                <TabsTrigger value="7d">7 DIAS</TabsTrigger>
                <TabsTrigger value="30d">30 DIAS</TabsTrigger>
                <TabsTrigger value="all">TODO</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>

        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden group">
            <BorderBeam duration={10} size={150} colorFrom="#10b981" colorTo="#3b82f6" />
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Activity size={12} className="text-emerald-500" /> Movimientos
              </CardDescription>
              <CardTitle className="text-4xl font-black tracking-tighter">{stats.totalEntradas + stats.totalSaidas}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                <ArrowUpRight size={14} /> Actividad en periodo
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group">
            <BorderBeam duration={12} size={150} colorFrom="#f59e0b" colorTo="#3b82f6" delay={2} />
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Package size={12} className="text-amber-500" /> Unidades Totales
              </CardDescription>
              <CardTitle className="text-4xl font-black tracking-tighter">{stats.totalUnits.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-medium italic">Base de existencias actual</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group">
            <BorderBeam duration={14} size={150} colorFrom="#ef4444" colorTo="#ec4899" delay={4} />
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={12} className="text-red-500" /> Alertas Críticas
              </CardDescription>
              <CardTitle className="text-4xl font-black tracking-tighter text-red-500">{stats.critical}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground font-medium">Requiere acción inmediata</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group">
             <BorderBeam duration={15} size={150} colorFrom="#6366f1" colorTo="#a855f7" delay={6} />
            <CardHeader className="pb-2">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <CheckCircle2 size={12} className="text-primary" /> Eficiencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-black tracking-tighter">{stats.efficiency}%</CardTitle>
              <p className="text-xs text-muted-foreground font-medium mt-2">Control Inventario Hoy</p>
            </CardContent>
          </Card>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <Card className="lg:col-span-2 bg-card/30 backdrop-blur-md border hover:border-primary/20 transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold tracking-tight">Flujo de Inventario</CardTitle>
                  <CardDescription>Entradas vs Conteos Diarios</CardDescription>
                </div>
                <div className="bg-primary/10 px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-primary uppercase">Alpha Insight</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full relative">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#888'}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#888'}} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(23, 23, 23, 0.8)', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)'
                      }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="entradas" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorEntradas)" 
                      strokeWidth={3} 
                      animationDuration={1500}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="salidas" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorSalidas)" 
                      strokeWidth={2} 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
             <Card className="border-l-4 border-l-primary bg-primary/5">
                <CardHeader className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                      <TrendingUp size={20} />
                    </div>
                    <CardTitle className="text-lg">Dato Clave</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stats.topReceiptCategory?.count > 0 ? (
                      <>Se registraron <span className="font-bold text-foreground">{stats.topReceiptCategory.count}</span> nuevas recepciones en <span className="italic">{stats.topReceiptCategory.name}</span> en este periodo.</>
                    ) : (
                      <>No se detectaron nuevas recepciones significativas en este periodo.</>
                    )}
                  </p>
                </CardHeader>
             </Card>

             <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Categorías Top</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-6">
                  {stats.categoryStats.slice(0, 4).map((cat, i) => {
                    const maxUnits = stats.categoryStats[0]?.totalUnits || 1;
                    const percentage = Math.round((cat.totalUnits / maxUnits) * 100);
                    return (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                          <span>{cat.name}</span>
                          <span className="text-primary">{percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${percentage}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
             </Card>
          </div>
        </section>

        {/* Categories Detail Section */}
         <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.categoryStats.map((cat, i) => (
            <div key={cat.id} className="group relative">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="relative p-6 rounded-3xl border border-border bg-card/60 backdrop-blur-sm hover:bg-accent transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      {i % 2 === 0 ? <Zap size={24} /> : <Layers size={24} />}
                    </div>
                    {cat.isHealthy ? (
                        <div className="text-[10px] font-black tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">SALUDABLE</div>
                    ) : (
                        <div className="text-[10px] font-black tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">CRÍTICO ({cat.criticalCount})</div>
                    )}
                  </div>
                  <h3 className="text-2xl font-black tracking-tighter mb-1">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-6">{cat.productCount} PRODUCTOS ACTIVOS</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex -space-x-2">
                      {cat.employees.length > 0 ? cat.employees.map((empId, j) => (
                        <div key={empId} title={empId} className="w-6 h-6 rounded-full border-2 border-card bg-primary/20 text-[8px] flex items-center justify-center font-bold">U{j+1}</div>
                      )) : (
                        <div className="text-[8px] text-muted-foreground uppercase font-bold">Sin actividad</div>
                      )}
                    </div>
                    <button 
                      onClick={() => navigate(`/category/${cat.id}`)}
                      className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1 hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                      Ver Detalles <TrendingUp size={10} />
                    </button>
                  </div>
               </div>
            </div>
          ))}
        </section>

      </div>
    </TracingBeam>
  );
};

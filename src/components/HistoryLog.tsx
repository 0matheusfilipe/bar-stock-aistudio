import React, { useState, useEffect } from 'react';
import { 
  History, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  ChevronDown, 
  ChevronUp,
  CalendarDays,
  Beer,
  CupSoda,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  Search,
  X
} from 'lucide-react';
import { inventoryService } from '@/src/services/inventoryService';
import { useUnit } from '@/src/contexts/UnitContext';
import { InventoryCount, Product, Profile, Category } from '@/src/types';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DailyProductCount {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  totalUnits: number;
  barraUnits: number;
  almacenBoxes: number;
  isCritical: boolean;
  updatedAt: Date;
  employeeName: string;
  previousTotalUnits?: number;
  receiptsToday: number;
}

interface DailyReport {
  date: string;
  products: Record<string, DailyProductCount>;
}

export const HistoryLog: React.FC = () => {
  const { selectedUnitId } = useUnit();
  const [reports, setReports] = useState<Record<string, DailyReport>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleDays, setVisibleDays] = useState(7);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allHistory, allProducts, allProfiles, allCategories] = await Promise.all([
          inventoryService.getAllHistory(selectedUnitId),
          inventoryService.getProducts(),
          inventoryService.getProfiles(),
          inventoryService.getCategories()
        ]);

        const groupedByDate: Record<string, DailyReport> = {};

        // allHistory is sorted newest first
        allHistory.forEach(item => {
          const dateObj = item.updated_at ? (typeof item.updated_at === 'string' ? new Date(item.updated_at) : (item.updated_at as any).toDate()) : new Date();
          const dateKey = format(dateObj, 'yyyy-MM-dd');
          
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = {
              date: dateKey,
              products: {}
            };
          }

          const product = allProducts.find(p => p.id === item.product_id);

          // Since it's newest first, the first time we see a product on a date, it's the final count for that day
          if (!groupedByDate[dateKey].products[item.product_id]) {
            const employee = allProfiles.find(p => p.id === item.employee_id);
            const category = allCategories.find(c => c.id === product?.category_id);

            groupedByDate[dateKey].products[item.product_id] = {
              productId: item.product_id,
              productName: product?.name || 'Producto Eliminado',
              categoryId: category?.id || 'unknown',
              categoryName: category?.name || 'Sin Categoría',
              totalUnits: item.total_units,
              barraUnits: item.barra_units,
              almacenBoxes: item.almacen_boxes,
              isCritical: item.is_critical,
              updatedAt: dateObj,
              employeeName: employee?.name || 'Desconocido',
              receiptsToday: 0
            };
          }

          // If it's a receipt, add to receiptsToday
          if (item.type === 'receipt') {
            const units = item.received_boxes || 0;
            groupedByDate[dateKey].products[item.product_id].receiptsToday += units;
          }
        });

        // Now calculate differences from previous days
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
        
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const currentDate = sortedDates[i];
          const previousDate = sortedDates[i + 1]; // The next one in the descending array is the previous date
          
          const currentProducts = groupedByDate[currentDate].products;
          const previousProducts = groupedByDate[previousDate].products;

          Object.keys(currentProducts).forEach(productId => {
            if (previousProducts[productId]) {
              currentProducts[productId].previousTotalUnits = previousProducts[productId].totalUnits;
            }
          });
        }

        setReports(groupedByDate);
        if (sortedDates.length > 0) {
          setExpandedDates([sortedDates[0]]);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedUnitId]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredDates = Object.keys(reports).sort((a, b) => b.localeCompare(a)).filter(date => {
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;

    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      return Object.values(reports[date].products).some((p: any) => p.productName.toLowerCase().includes(lowerSearch));
    }
    return true;
  });

  const visibleDates = filteredDates.slice(0, visibleDays);

  if (Object.keys(reports).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
        <div className="w-20 h-20 bg-card rounded-3xl flex items-center justify-center text-muted-foreground mb-4">
          <History size={40} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Sin historial</h2>
        <p className="text-muted-foreground max-w-md">Los inventarios finalizados aparecerán aquí organizados por fecha.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex items-center gap-3">
          <History className="text-muted-foreground" size={28} />
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Informes de Inventario</h2>
        </div>

        {/* Filters Container */}
        <div className="flex flex-col sm:flex-row gap-4 flex-1 lg:justify-end">
          {/* Date Range */}
          <div className="flex-1 lg:max-w-xs">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <CalendarDays size={12} /> Período
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full h-12 bg-card border border-border rounded-2xl px-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all cursor-pointer appearance-none"
                />
              </div>
              <span className="text-muted-foreground font-black text-xs shrink-0">hasta</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full h-12 bg-card border border-border rounded-2xl px-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none transition-all cursor-pointer appearance-none"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="h-12 w-12 shrink-0 flex items-center justify-center rounded-2xl border border-border hover:bg-destructive/10 hover:border-destructive/30 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-auto lg:max-w-xs flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Search size={12} /> Buscar Producto
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Ej. Mahou 5 Estrellas"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 bg-card border-border rounded-2xl pl-12 pr-4 text-sm font-bold text-foreground focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredDates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-bold">
            No se encontraron resultados para la búsqueda.
          </div>
        ) : (
          visibleDates.map(date => {
          const isExpanded = expandedDates.includes(date);
          const formattedDate = format(new Date(date + 'T12:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
          const report = reports[date];
          
          // Filter products inside the date and group by category for display
          const productsInDate = Object.values(report.products).filter((p: any) => {
             if (searchTerm.trim() !== '') {
               return p.productName.toLowerCase().includes(searchTerm.toLowerCase());
             }
             return true;
          });

          const productsByCategory: Record<string, { categoryName: string, products: DailyProductCount[] }> = {};
          productsInDate.forEach((p: DailyProductCount) => {
            if (!productsByCategory[p.categoryId]) {
              productsByCategory[p.categoryId] = {
                categoryName: p.categoryName,
                products: []
              };
            }
            productsByCategory[p.categoryId].products.push(p);
          });

          return (
            <div key={date} className="space-y-4">
              <button 
                onClick={() => toggleDate(date)}
                className="w-full flex items-center justify-between p-4 bg-card/50 rounded-2xl border border-border hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarIcon className="text-muted-foreground" size={20} />
                  <span className="font-bold capitalize text-foreground">{formattedDate}</span>
                  <Badge variant="outline" className="ml-2 bg-muted border-border text-muted-foreground">
                    {productsInDate.length} productos
                  </Badge>
                </div>
                {isExpanded ? <ChevronUp className="text-foreground" size={20} /> : <ChevronDown className="text-foreground" size={20} />}
              </button>

              {isExpanded && (
                <div className="grid grid-cols-1 gap-6 pl-4 border-l-2 border-border ml-6">
                  {Object.values(productsByCategory).map(cat => (
                    <Card key={cat.categoryName} className="bg-card/30 border-border/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CardTitle className="text-sm font-bold uppercase tracking-widest text-foreground">
                            {cat.categoryName}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="divide-y divide-border/50">
                          {cat.products.map((count, idx) => {
                            const diff = count.previousTotalUnits !== undefined ? count.totalUnits - (count.previousTotalUnits + count.receiptsToday) : 0;
                            
                            return (
                              <div key={idx} className="py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                                    {count.productName.toLowerCase().includes('cerveza') ? <Beer size={18} /> : <CupSoda size={18} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground">{count.productName}</p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      Por: {count.employeeName} a las {format(count.updatedAt, 'HH:mm')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Entradas</p>
                                    <p className="font-mono font-bold text-emerald-500">{count.receiptsToday > 0 ? `+${count.receiptsToday}` : '-'}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Barra (Uni)</p>
                                    <p className="font-mono font-bold text-foreground">{count.barraUnits || 0}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Alm. (Uni)</p>
                                    <p className="font-mono font-bold text-foreground">{count.almacenBoxes || 0}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Total Hoy</p>
                                    <p className="font-mono font-bold text-foreground">{count.totalUnits || 0}</p>
                                  </div>
                                  
                                  {/* Difference from previous count */}
                                  <div className="w-24 text-center">
                                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Diferencia</p>
                                    {count.previousTotalUnits === undefined ? (
                                      <span className="text-xs text-muted-foreground font-mono">-</span>
                                    ) : (
                                      <div className={`flex items-center justify-center gap-1 font-mono font-bold text-xs ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                                        {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                        {diff > 0 ? '+' : ''}{diff}
                                      </div>
                                    )}
                                  </div>

                                  <div className="w-24 flex justify-end">
                                    {count.isCritical ? (
                                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">
                                        <AlertTriangle size={10} className="mr-1" /> Faltante
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                                        <CheckCircle2 size={10} className="mr-1" /> OK
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        }))}
      </div>

      {filteredDates.length > visibleDays && (
        <div className="flex justify-center mt-12 pb-8">
          <Button 
            variant="outline"
            onClick={() => setVisibleDays(prev => prev + 7)}
            className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 border-border hover:bg-muted active:scale-95 transition-all text-muted-foreground"
          >
            Mostrar 7 días más
          </Button>
        </div>
      )}
    </div>
  );
};

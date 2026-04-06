import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Printer,
  Home,
  Clock,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/src/services/inventoryService';
import { useUnit } from '@/src/contexts/UnitContext';
import { Category, Product, InventoryCount } from '@/src/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface SummaryItem {
  product: Product;
  count?: InventoryCount;
  previousCount?: InventoryCount;
  receiptsToday?: number;
}

export const InventorySummary: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedUnitId } = useUnit();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const fetchSummary = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [cat, prods, allHistory] = await Promise.all([
          inventoryService.getCategoryById(id),
          inventoryService.getProductsByCategory(id),
          inventoryService.getAllHistory(selectedUnitId)
        ]);
        
        setCategory(cat);
        
        // Subscribe to counts and filter
        unsubscribe = inventoryService.subscribeToCounts(selectedUnitId, (allCounts) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const items = prods.map(p => {
            const count = allCounts.find(c => c.product_id === p.id);
            let validCount = undefined;
            
            if (count && count.updated_at) {
              const updatedDate = typeof count.updated_at === 'string' ? new Date(count.updated_at) : (count.updated_at as any).toDate();
              if (updatedDate >= today) {
                validCount = count;
              }
            }

            // Find previous count (first history record before today)
            const previousCount = allHistory.find(h => {
              if (h.product_id !== p.id) return false;
              const hDate = h.updated_at ? (typeof h.updated_at === 'string' ? new Date(h.updated_at) : (h.updated_at as any).toDate()) : new Date();
              return hDate < today;
            });

            // Find receipts today
            const receiptsToday = allHistory.filter(h => {
              if (h.product_id !== p.id) return false;
              if (h.type !== 'receipt') return false;
              const hDate = h.updated_at ? (typeof h.updated_at === 'string' ? new Date(h.updated_at) : (h.updated_at as any).toDate()) : new Date();
              return hDate >= today;
            }).reduce((sum, h) => sum + (h.received_boxes || 0), 0);

            return {
              product: p,
              count: validCount,
              previousCount,
              receiptsToday
            };
          });
          setSummary(items);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error fetching summary:', error);
        setLoading(false);
      }
    };

    fetchSummary();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, selectedUnitId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="animate-spin text-muted-foreground" size={48} />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Generando resumen...</p>
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="flex flex-col h-full gap-8 md:gap-12 p-2 md:p-6 lg:p-0 print:p-0">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 md:mb-0 shrink-0 gap-6 print:hidden">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <button 
            onClick={() => navigate(`/category/${id}`)}
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90 shadow-sm"
          >
            <ChevronLeft size={32} className="md:w-10 md:h-10" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em] mb-1">Inventario Completado</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground truncate">Resumen: {category.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="h-14 md:h-16 px-6 md:px-10 rounded-2xl md:rounded-3xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all"
          >
            <Home size={24} className="md:w-6 md:h-6" />
            Inicio
          </Button>
        </div>
      </div>

      {/* Summary Table */}
      <div className="flex-1 overflow-hidden bg-card/40 rounded-3xl md:rounded-[3rem] border border-border/50 backdrop-blur-md flex flex-col shadow-2xl print:bg-white print:text-black print:border-none print:p-0">
        <div className="flex-1 overflow-auto p-6 md:p-10 lg:p-12">
          <div className="hidden print:block mb-12">
            <h1 className="text-4xl font-black tracking-tight">Resumen de Inventario - {category.name}</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mt-2">Fecha: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="min-w-[1000px] lg:min-w-0">
            <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent print:border-black">
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] py-6 print:text-black">Producto</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-center py-6 print:text-black">Anterior</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-center py-6 print:text-black">Entradas</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-center py-6 print:text-black">Barra</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-center py-6 print:text-black">Almacén</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-center py-6 print:text-black">Actual</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-center py-6 print:text-black">Diferencia</TableHead>
              <TableHead className="text-muted-foreground font-black uppercase tracking-widest text-[10px] text-right py-6 print:text-black">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((item) => {
              const diff = item.count && item.previousCount 
                ? item.count.total_units - (item.previousCount.total_units + (item.receiptsToday || 0))
                : undefined;

              return (
                <TableRow key={item.product.id} className="border-border/30 hover:bg-muted/30 transition-colors print:border-black">
                  <TableCell className="py-8">
                    <div className="flex flex-col">
                      <span className="text-2xl font-black tracking-tight text-foreground print:text-black">
                        {item.product.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xl font-bold text-muted-foreground print:text-black">
                    {item.previousCount?.total_units ?? '-'}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xl font-bold text-emerald-500 print:text-black">
                    {item.receiptsToday ? `+${item.receiptsToday}` : '-'}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xl font-bold text-muted-foreground print:text-black">
                    {item.count?.barra_units || 0}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xl font-bold text-muted-foreground print:text-black">
                    {item.count?.almacen_boxes || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted text-foreground text-2xl font-black shadow-inner print:bg-gray-100 print:text-black">
                      {item.count?.total_units || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {diff !== undefined ? (
                      <div className={`inline-flex items-center justify-center gap-1.5 font-mono font-black text-xl ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        {diff > 0 ? <TrendingUp size={20} /> : diff < 0 ? <TrendingDown size={20} /> : <Minus size={20} />}
                        {diff > 0 ? '+' : ''}{diff}
                      </div>
                    ) : (
                      <span className="text-muted-foreground font-bold">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!item.count ? (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/50 text-muted-foreground font-black uppercase tracking-widest text-[10px] border border-border print:bg-transparent print:border-black">
                        <Clock size={16} />
                        Pendiente
                      </div>
                    ) : item.count.is_critical ? (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 text-amber-500 font-black uppercase tracking-widest text-[10px] border border-amber-500/20 print:bg-transparent print:border-black">
                        <AlertTriangle size={16} />
                        Faltante
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-black uppercase tracking-widest text-[10px] border border-emerald-500/20 print:bg-transparent print:border-black">
                        <CheckCircle2 size={16} />
                        OK
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  </div>

  <div className="hidden print:block mt-12 pt-8 border-t border-black">
    <div className="flex justify-between">
      <div>
        <p className="font-bold">Responsable:</p>
        <div className="mt-8 border-b border-black w-64"></div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-500">Gerado por BarStock Inventory System</p>
      </div>
    </div>
  </div>
</div>
  );
};

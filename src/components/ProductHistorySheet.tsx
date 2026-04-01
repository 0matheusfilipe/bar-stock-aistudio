import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon,
  Loader2,
  X,
  CalendarDays
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { inventoryService } from '@/src/services/inventoryService';
import { useUnit } from '@/src/contexts/UnitContext';
import { InventoryCount } from '@/src/types';
import { toast } from 'sonner';

interface ProductHistorySheetProps {
  productId: string | null;
  productName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profiles: Record<string, string>;
}

export const ProductHistorySheet: React.FC<ProductHistorySheetProps> = ({
  productId,
  productName,
  isOpen,
  onOpenChange,
  profiles
}) => {
  const { selectedUnitId } = useUnit();
  const [historyData, setHistoryData] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!productId || !isOpen) return;
      setLoading(true);
      try {
        const history = await inventoryService.getProductHistory(productId, selectedUnitId);
        setHistoryData(history);
      } catch (error) {
        console.error('Error fetching history:', error);
        toast.error('Error al cargar el historial.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [productId, isOpen, selectedUnitId]);

  const filteredHistory = historyData.filter(item => {
    const date = item.updated_at 
      ? (typeof item.updated_at === 'string' 
          ? new Date(item.updated_at) 
          : (item.updated_at as any).toDate())
      : new Date();
    
    if (dateFrom && date < new Date(dateFrom + 'T00:00:00')) return false;
    if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-border text-foreground p-0 flex flex-col">
        <div className="p-8 border-b border-border shrink-0">
          <SheetHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0">
                <HistoryIcon size={24} />
              </div>
              <div>
                <SheetTitle className="text-2xl font-black tracking-tight text-foreground truncate">{productName}</SheetTitle>
                <SheetDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                  Historial de Conteo
                </SheetDescription>
              </div>
            </div>
            
            {/* Date Filters */}
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border p-1.5 rounded-xl h-12 w-full">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-none px-2 text-[11px] font-bold text-foreground focus:outline-none transition-all cursor-pointer"
              />
              <span className="text-muted-foreground text-[9px] uppercase font-black tracking-widest px-1 shrink-0">hasta</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 min-w-0 bg-transparent border-none px-2 text-[11px] font-bold text-foreground focus:outline-none transition-all cursor-pointer"
              />
              {(dateFrom || dateTo) && (
                <button 
                  onClick={() => { setDateFrom(''); setDateTo(''); }} 
                  className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-1"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-muted-foreground" size={32} />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Buscando historial...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-2">
                  <HistoryIcon size={32} />
                </div>
                <p className="text-muted-foreground font-bold text-lg">No se encontró historial</p>
                <p className="text-muted-foreground/60 text-sm max-w-[240px]">Ajusta los filtros de fecha o espera a que se registren conteos.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Fecha</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Empleado</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] text-center">Tipo</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] text-center">Cambio</TableHead>
                    <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item, index) => {
                    const date = item.updated_at 
                      ? (typeof item.updated_at === 'string' 
                          ? new Date(item.updated_at) 
                          : (item.updated_at as any).toDate())
                      : new Date();
                    
                    const originalIndex = historyData.findIndex(h => h.id === item.id);
                    const nextItem = historyData[originalIndex + 1];
                    const change = nextItem ? item.total_units - nextItem.total_units : item.total_units;
                    const isReceipt = item.type === 'receipt';

                    return (
                      <TableRow key={item.id} className="border-border hover:bg-accent/50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-foreground text-sm">{date.toLocaleDateString()}</span>
                            <span className="text-muted-foreground text-[10px]">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground/80 text-sm font-bold">
                          {profiles[item.employee_id] || 'Desconocido'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${isReceipt ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {isReceipt ? 'Entrada' : 'Conteo'}
                          </span>
                        </TableCell>
                        <TableCell className={`text-center font-mono font-bold ${change > 0 ? 'text-emerald-500' : change < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                          {change > 0 ? '+' : ''}{change}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-black text-sm ${item.is_critical ? 'bg-amber-500 text-zinc-950' : 'bg-muted text-foreground'}`}>
                            {item.total_units}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>

        <div className="p-8 border-t border-border shrink-0">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full h-14 rounded-2xl bg-card border border-border text-foreground hover:bg-accent font-bold uppercase tracking-widest text-xs"
          >
            Cerrar Historial
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileDown, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Unit, Category, Product, InventoryCount, Profile } from '@/src/types';
import { inventoryService } from '@/src/services/inventoryService';
import { generateInventoryPDF } from '@/src/utils/pdfExport';
import { toast } from 'sonner';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  categories: Category[];
  products: Product[];
  currentCounts: InventoryCount[];
  user: Profile | null;
  dateFrom: string;
  dateTo: string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  units,
  categories,
  products,
  currentCounts,
  user,
  dateFrom,
  dateTo
}) => {
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ok', 'critical', 'pending']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedUnits(units.map(u => u.id));
      setSelectedCategories(categories.map(c => c.id));
      setSelectedStatuses(['ok', 'critical', 'pending']);
    }
  }, [isOpen, units, categories]);

  const toggleUnit = (id: string) => {
    setSelectedUnits(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };
  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };
  const toggleStatus = (id: string) => {
    setSelectedStatuses(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleExport = async () => {
    if (selectedUnits.length === 0 || selectedCategories.length === 0 || selectedStatuses.length === 0) {
      toast.error('Selecciona al menos una unidad, categoría y estado.');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Calculando cruce de inventarios...');

    try {
      // Always look up the global counts so that filtering "All Units" works flawlessly
      const globalCounts = await inventoryService.getAllCounts();

      const rows: any[] = [];
      const activeUnits = units.filter(u => selectedUnits.includes(u.id));
      const activeProducts = products.filter(p => selectedCategories.includes(p.category_id));

      activeUnits.forEach(unit => {
        activeProducts.forEach(p => {
          const count = globalCounts.find(c => c.product_id === p.id && c.unit_id === unit.id);
          
          let status = 'pending';
          if (count) {
            status = count.is_critical ? 'critical' : 'ok';
          }

          if (!selectedStatuses.includes(status)) return;

          if (count?.updated_at && (dateFrom || dateTo)) {
             const ts = typeof count.updated_at === 'string' 
               ? new Date(count.updated_at).getTime()
               : (count.updated_at as any).toMillis?.() ?? 0;
             const date = new Date(ts);
             if (dateFrom && date < new Date(dateFrom + 'T00:00:00')) return;
             if (dateTo && date > new Date(dateTo + 'T23:59:59')) return;
          } else if (!count && (dateFrom || dateTo)) {
            return; 
          }

          rows.push({
            product: p,
            category: categories.find(c => c.id === p.category_id) || { id: '', name: 'Sin categoría', created_at: '' },
            count: count,
            unitName: unit.name
          });
        });
      });

      if (rows.length === 0) {
        toast.dismiss(toastId);
        toast.error('No hay datos para exportar con estos filtros.');
        return;
      }

      // Sort rows by Unit name, then by category, then by product name
      rows.sort((a, b) => {
        if (a.unitName !== b.unitName) return a.unitName.localeCompare(b.unitName);
        if (a.category.name !== b.category.name) return a.category.name.localeCompare(b.category.name);
        return a.product.name.localeCompare(b.product.name);
      });

      generateInventoryPDF(rows, {
        unitName: selectedUnits.length === units.length ? 'Todas' : 'Selección Múltiple',
        categoryName: selectedCategories.length === categories.length ? 'Todas' : 'Selección Múltiple',
        dateFrom,
        dateTo,
        generatedBy: user?.name,
      });
      
      toast.dismiss(toastId);
      toast.success('PDF exportado correctamente.');
      onClose();
    } catch (error) {
      toast.dismiss(toastId);
      console.error(error);
      toast.error('Error al generar el documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const statusOptions = [
    { id: 'ok', label: 'OK', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { id: 'critical', label: 'Crítico', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    { id: 'pending', label: 'Pendiente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 md:p-8 border-b border-border shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary">
                  <FileDown size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight">Exportar PDF</h3>
                  <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-1">Configura los filtros de extracción</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8 overflow-y-auto">
              
              {/* Unidades */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Unidades ({selectedUnits.length}/{units.length})</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                     onClick={() => setSelectedUnits(selectedUnits.length === units.length ? [] : units.map(u => u.id))}
                     className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedUnits.length === units.length ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-muted-foreground hover:border-primary/50'}`}
                  >
                    Todo
                  </button>
                  {units.map(u => (
                    <button
                      key={u.id}
                      onClick={() => toggleUnit(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${selectedUnits.includes(u.id) ? 'bg-card border-primary text-foreground' : 'bg-transparent border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {selectedUnits.includes(u.id) && <Check size={12} className="text-primary" />}
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Estado de los productos</h4>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => toggleStatus(s.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${selectedStatuses.includes(s.id) ? s.color : 'bg-transparent border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {selectedStatuses.includes(s.id) ? <Check size={12} /> : <div className="w-3" />}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categorias */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-foreground uppercase tracking-widest">Categorías ({selectedCategories.length}/{categories.length})</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                     onClick={() => setSelectedCategories(selectedCategories.length === categories.length ? [] : categories.map(c => c.id))}
                     className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedCategories.length === categories.length ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-muted-foreground hover:border-primary/50'}`}
                  >
                    Todo
                  </button>
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleCategory(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${selectedCategories.includes(c.id) ? 'bg-card border-primary text-foreground' : 'bg-transparent border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {selectedCategories.includes(c.id) && <Check size={12} className="text-primary" />}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-6 md:p-8 border-t border-border shrink-0 bg-muted/30 flex gap-4">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExport}
                disabled={isProcessing}
                className="flex-1 h-14 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg gap-2"
              >
                <FileDown size={18} /> {isProcessing ? 'Generando...' : 'Generar PDF'}
              </Button>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

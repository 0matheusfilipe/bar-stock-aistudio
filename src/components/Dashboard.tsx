import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Filter,
  ArrowDownToLine,
  Box,
  ChevronRight,
  Database,
  Calculator,
  Save,
  X,
  ChevronDown,
  CalendarDays,
  PackageSearch,
  FileDown,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { inventoryService } from '@/src/services/inventoryService';
import { Category, Product, InventoryCount } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUnit } from '@/src/contexts/UnitContext';
import { Button } from '@/src/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { PdfExportModal } from './PdfExportModal';
import { generateInventoryPDF } from '@/src/utils/pdfExport';

// --- Sub-components ---
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub, accent = 'text-primary' }) => (
  <Card className="relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardDescription className="text-xs font-black uppercase tracking-widest">{label}</CardDescription>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted ${accent}`}>{icon}</div>
      </div>
      <CardTitle className={`text-3xl font-black tracking-tight ${accent}`}>{value}</CardTitle>
    </CardHeader>
    <CardContent>
      {sub && <p className="text-[10px] text-muted-foreground font-medium">{sub}</p>}
    </CardContent>
    <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-current ${accent}`} />
  </Card>
);

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedUnitId, units } = useUnit();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentCounts, setCurrentCounts] = useState<InventoryCount[]>([]);
  const [receiptHistory, setReceiptHistory] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Modal State
  const [modalData, setModalData] = useState({
    barra: 0,
    almacen: 0,
    faltante: 0,
    isCritical: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Carregar os dados base 1 vez
    const loadData = async () => {
      try {
        const [cats, prods] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getProducts()
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    // Carregar histórico quando mudar a unidade
    const fetchHistory = async () => {
      try {
        const hist = await inventoryService.getAllHistory(selectedUnitId);
        setReceiptHistory(hist.filter(h => h.type === 'receipt'));
      } catch (err) {
        console.error('Data load error:', err);
      }
    };
    fetchHistory();

    // Live subscription for counts when unit changes
    const unsub = inventoryService.subscribeToCounts(selectedUnitId, (counts) => {
      setCurrentCounts(counts);
    });
    return () => unsub();
  }, [selectedUnitId]);

  // Map counts to products
  const countsMap = useMemo(() => {
    const map = new Map<string, InventoryCount>();
    currentCounts.forEach(c => map.set(c.product_id, c));
    return map;
  }, [currentCounts]);

  // Filter products by selected category + date range on last count
  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category_id === selectedCategory);
    }
    if (dateFrom || dateTo) {
      result = result.filter(p => {
        const count = countsMap.get(p.id);
        if (!count?.updated_at) return !dateFrom && !dateTo;
        const ts = typeof count.updated_at === 'string'
          ? new Date(count.updated_at).getTime()
          : (count.updated_at as any).toMillis?.() ?? 0;
        const date = new Date(ts);
        if (dateFrom && date < new Date(dateFrom + 'T00:00:00')) return false;
        if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
        return true;
      });
    }
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(lowerSearch));
    }
    return result;
  }, [products, selectedCategory, countsMap, dateFrom, dateTo, searchTerm]);

  const stats = useMemo(() => {
    const entries = receiptHistory.length;
    const units = currentCounts.reduce((acc, c) => acc + (c.total_units || 0), 0);
    const critical = currentCounts.filter(c => c.is_critical).length;
    return { entries, units, critical };
  }, [receiptHistory, currentCounts]);

  const handleProductClick = (product: Product) => {
    if (!selectedUnitId || selectedUnitId === 'ALL') {
      import('sonner').then(m => m.toast.error('Debe seleccionar una unidad específica para registrar inventario, no la vista global.'));
      return;
    }
    const count = countsMap.get(product.id);
    setModalData({
      barra: count?.barra_units || 0,
      almacen: count?.almacen_boxes || 0,
      faltante: count?.faltante || 0,
      isCritical: count?.is_critical || false
    });
    setSelectedProduct(product);
  };

  const handleSave = async () => {
    if (!selectedProduct || !user || !selectedUnitId || selectedUnitId === 'ALL') return;
    setSaving(true);
    try {
      const totalUnits = Number(modalData.barra) + (Number(modalData.almacen) * (selectedProduct.units_per_box || 1));
      const autoIsCritical = totalUnits <= 10;
      await inventoryService.updateCount(
        selectedProduct.id,
        selectedUnitId,
        user.id,
        modalData.barra,
        modalData.almacen,
        totalUnits,
        modalData.faltante,
        autoIsCritical
      );
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error saving count:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Database className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Sincronizando Inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <span className="bg-primary text-primary-foreground p-2 rounded-2xl"><TrendingUp size={28} /></span>
            Inventario
          </h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] mt-2 ml-1 items-center flex gap-2">
            <Calculator size={14} className="text-primary" /> Panel de Control de Existencias
          </p>
        </div>
        <Button
          onClick={() => setIsExportModalOpen(true)}
          variant="outline"
          className="h-14 px-6 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 border-primary/30 text-primary hover:bg-primary/10 active:scale-95 transition-all shrink-0"
        >
          <FileDown size={20} />
          Exportar PDF
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<ArrowDownToLine size={20} />}
          label="Entradas Recientes"
          value={stats.entries}
          sub="pedidos registrados"
          accent="text-blue-400"
        />
        <KpiCard
          icon={<Box size={20} />}
          label="Unidades Totales"
          value={stats.units.toLocaleString()}
          sub="en stock actual"
          accent="text-emerald-400"
        />
        <KpiCard
          icon={<AlertTriangle size={20} />}
          label="Productos Críticos"
          value={stats.critical}
          sub="stock bajo detectado"
          accent={stats.critical > 0 ? 'text-red-400' : 'text-muted-foreground'}
        />
      </div>

      {/* Filters Row: Category Dropdown + Date Range + Search */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
        
        {/* Search Input */}
        <div className="flex-1 md:max-w-xs">
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

        {/* Category Dropdown */}
        <div className="flex-1 md:max-w-[200px]" ref={dropdownRef}>
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <Filter size={12} /> Categoria
          </label>
          <div className="relative">
            <button
              onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              className="w-full h-12 flex items-center justify-between px-5 rounded-2xl border border-border bg-card text-sm font-bold hover:border-primary/50 transition-all gap-2"
            >
              <span>{selectedCategory === 'all' ? 'Todas las Categorías' : categories.find(c => c.id === selectedCategory)?.name ?? '—'}</span>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {categoryDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-30 top-14 left-0 w-full bg-card border border-border rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
                >
                  {[{ id: 'all', name: 'Todas las Categorías' }, ...categories].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setCategoryDropdownOpen(false); }}
                      className={`w-full flex items-center px-5 py-3 text-sm font-bold text-left transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {selectedCategory === cat.id && <span className="w-2 h-2 rounded-full bg-primary mr-3 shrink-0" />}
                      {cat.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Date Range */}
        <div className="flex-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <CalendarDays size={12} /> Período (Último Conteo)
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

      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[3rem] border border-dashed border-border/50 bg-card/30">
          <PackageSearch className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-bold text-foreground">Ningún producto encontrado</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">No se encontraron productos que coincidan con la búsqueda actual. Intenta cambiar los filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode='popLayout'>
            {filteredProducts.map((p) => {
              const count = countsMap.get(p.id);
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleProductClick(p)}
                  className="group cursor-pointer"
                >
                  {(() => {
                    const isCrit = count && (count.total_units <= 10 || count.is_critical);
                    const isWarn = count && !isCrit && count.total_units < 20 && count.almacen_boxes === 0;
                    return (
                      <div className={`h-full p-6 rounded-3xl border border-border bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 relative overflow-hidden ${isCrit ? 'border-red-500/30 bg-red-500/5' : isWarn ? 'border-orange-500/30 bg-orange-500/5' : ''}`}>
                        {isCrit && (
                          <div className="absolute top-4 right-4 animate-pulse">
                            <AlertTriangle size={18} className="text-red-500" />
                          </div>
                        )}
                        {isWarn && (
                          <div className="absolute top-4 right-4 animate-pulse">
                            <AlertTriangle size={18} className="text-orange-500" />
                          </div>
                        )}
                        
                        <div className="mb-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">PRODUTO</div>
                    <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{p.name}</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-muted/50 rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Barra</p>
                      <p className="text-sm font-black">{count?.barra_units || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-2xl text-center">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Almacén</p>
                      <p className="text-sm font-black">{count?.almacen_boxes || 0}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-2xl text-center border border-primary/20">
                      <p className="text-[9px] font-black uppercase text-primary">Total</p>
                      <p className="text-sm font-black text-primary">{count?.total_units || 0}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase text-red-500/80">
                      {count?.faltante && count.faltante > 0 ? `Faltante: ${count.faltante}` : ''}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <ChevronRight size={18} className="text-primary" />
                    </div>
                  </div>
                </div>
                  );
                })()}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}

      {/* Edit Modal / Slide-over */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-card border border-border rounded-[3rem] shadow-2xl overflow-hidden shadow-primary/10"
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Actualizando Stock</div>
                    <h2 className="text-3xl font-black tracking-tighter">{selectedProduct.name}</h2>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="w-12 h-12 rounded-2xl bg-muted hover:bg-accent flex items-center justify-center transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase ml-1">Barra (Uni)</Label>
                    <Input
                      type="number"
                      value={modalData.barra}
                      onChange={(e) => setModalData({...modalData, barra: parseInt(e.target.value) || 0})}
                      className="h-16 rounded-2xl border-2 border-border focus:border-primary transition-all text-xl font-black px-6"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase ml-1">Almacén (Cajas)</Label>
                    <Input
                      type="number"
                      value={modalData.almacen}
                      onChange={(e) => setModalData({...modalData, almacen: parseInt(e.target.value) || 0})}
                      className="h-16 rounded-2xl border-2 border-border focus:border-primary transition-all text-xl font-black px-6"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/20">
                     <div className="text-[10px] font-black uppercase text-primary mb-2">Total Calculado</div>
                     <div className="text-4xl font-black tracking-tighter text-primary">
                       {Number(modalData.barra) + (Number(modalData.almacen) * (selectedProduct.units_per_box || 1))}
                     </div>
                     <p className="text-[8px] font-bold text-primary/60 mt-2">({selectedProduct.units_per_box} uni/caja)</p>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase ml-1">Faltante</Label>
                    <Input
                      type="number"
                      value={modalData.faltante}
                      onChange={(e) => setModalData({...modalData, faltante: parseInt(e.target.value) || 0})}
                      className="h-16 rounded-2xl border-2 border-border focus:border-primary transition-all text-xl font-black px-6 text-red-500"
                    />
                  </div>
                </div>

                {(() => {
                  const currentTotal = Number(modalData.barra) + (Number(modalData.almacen) * (selectedProduct.units_per_box || 1));
                  const isAutoCritical = currentTotal <= 10;
                  const isAutoWarning = !isAutoCritical && currentTotal < 20 && Number(modalData.almacen) === 0;
                  
                  return (
                    <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isAutoCritical ? 'bg-red-500/10 border-red-500/30' : isAutoWarning ? 'bg-orange-500/10 border-orange-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        {isAutoCritical ? <AlertTriangle size={20} className="text-red-500" /> : isAutoWarning ? <AlertTriangle size={20} className="text-orange-500" /> : <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-[10px] font-black">✓</div>}
                        <div className="flex flex-col">
                          <label className={`text-xs font-black uppercase tracking-widest ${isAutoCritical ? 'text-red-500' : isAutoWarning ? 'text-orange-500' : 'text-emerald-500'}`}>
                            {isAutoCritical ? 'Stock Crítico Detectado' : isAutoWarning ? 'Atención: Producto por Agotarse' : 'Stock Saludable'}
                          </label>
                          <span className={`text-[10px] font-bold ${isAutoCritical ? 'text-red-500/70' : isAutoWarning ? 'text-orange-500/70' : 'text-emerald-500/70'}`}>
                            {isAutoCritical ? 'Igual o menor a 10 unidades totales.' : isAutoWarning ? 'Menor a 20 unidades y sin cajas de respaldo en almacén.' : 'Más de 10 unidades en stock con respaldo suficiente.'}
                          </span>
                        </div>
                    </div>
                  );
                })()}

                <Button 
                  disabled={saving}
                  onClick={handleSave}
                  className="w-full h-20 rounded-[2rem] text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 active:scale-95 transition-all gap-3"
                >
                  {saving ? 'Guardando...' : <><Save size={24} /> Guardar Cambios</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <PdfExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        units={units}
        categories={categories}
        products={products}
        currentCounts={currentCounts}
        user={user}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
};

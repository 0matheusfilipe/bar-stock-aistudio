import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Filter,
  ArrowDownToLine,
  Box,
  Tag,
  Search,
  ChevronRight,
  Database,
  ArrowRight,
  Calculator,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { inventoryService } from '@/src/services/inventoryService';
import { Category, Product, InventoryCount } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
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

// --- Main Component ---
export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentCounts, setCurrentCounts] = useState<InventoryCount[]>([]);
  const [receiptHistory, setReceiptHistory] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Modal State
  const [modalData, setModalData] = useState({
    barra: 0,
    almacen: 0,
    faltante: 0,
    isCritical: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, prods, hist] = await Promise.all([
          inventoryService.getCategories(),
          inventoryService.getProducts(),
          inventoryService.getAllHistory()
        ]);
        setCategories(cats);
        setProducts(prods);
        setReceiptHistory(hist.filter(h => h.type === 'receipt'));
        
        if (cats.length > 0) setSelectedCategory(cats[0].id);
      } catch (err) {
        console.error('Data load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Live subscription for counts
    const unsub = inventoryService.subscribeToCounts((counts) => {
      setCurrentCounts(counts);
    });
    return () => unsub();
  }, []);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(p => p.category_id === selectedCategory);
  }, [products, selectedCategory]);

  // Map counts to products
  const countsMap = useMemo(() => {
    const map = new Map<string, InventoryCount>();
    currentCounts.forEach(c => map.set(c.product_id, c));
    return map;
  }, [currentCounts]);

  const stats = useMemo(() => {
    const entries = receiptHistory.length;
    const units = currentCounts.reduce((acc, c) => acc + (c.total_units || 0), 0);
    const critical = currentCounts.filter(c => c.is_critical).length;
    return { entries, units, critical };
  }, [receiptHistory, currentCounts]);

  const handleProductClick = (product: Product) => {
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
    if (!selectedProduct || !user) return;
    setSaving(true);
    try {
      const totalUnits = Number(modalData.barra) + (Number(modalData.almacen) * (selectedProduct.units_per_box || 1));
      await inventoryService.updateCount(
        selectedProduct.id,
        user.id,
        modalData.barra,
        modalData.almacen,
        totalUnits,
        modalData.faltante,
        modalData.isCritical
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
            <Calculator size={14} className="text-primary" /> Painel de Controle de Existências
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<ArrowDownToLine size={20} />}
          label="Entradas Recentes"
          value={stats.entries}
          sub="pedidos registrados"
          accent="text-blue-400"
        />
        <KpiCard
          icon={<Box size={20} />}
          label="Unidades Totais"
          value={stats.units.toLocaleString()}
          sub="em estoque atual"
          accent="text-emerald-400"
        />
        <KpiCard
          icon={<AlertTriangle size={20} />}
          label="Produtos Críticos"
          value={stats.critical}
          sub="estoque baixo detectado"
          accent={stats.critical > 0 ? 'text-red-400' : 'text-muted-foreground'}
        />
      </div>

      {/* Categories Horizontal Scroll */}
      <div className="relative group">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-4 ml-1">
          <Filter size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Categorias de Produtos</span>
        </div>
        <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-6 py-4 rounded-3xl text-sm font-black transition-all border ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20 scale-105'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/30'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
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
                <div className={`h-full p-6 rounded-3xl border border-border bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 relative overflow-hidden ${count?.is_critical ? 'border-red-500/30' : ''}`}>
                  {count?.is_critical && (
                    <div className="absolute top-4 right-4 animate-pulse">
                      <AlertTriangle size={18} className="text-red-500" />
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

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
                    <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Atualizando Stock</div>
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

                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="critical" 
                      checked={modalData.isCritical} 
                      onChange={(e) => setModalData({...modalData, isCritical: e.target.checked})}
                      className="w-5 h-5 rounded-md accent-primary"
                    />
                    <label htmlFor="critical" className="text-xs font-black uppercase tracking-widest cursor-pointer select-none">Marcar como Stock Crítico</label>
                </div>

                <Button 
                  disabled={saving}
                  onClick={handleSave}
                  className="w-full h-20 rounded-[2rem] text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 active:scale-95 transition-all gap-3"
                >
                  {saving ? 'Gravando...' : <><Save size={24} /> Guardar Cambios</>}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

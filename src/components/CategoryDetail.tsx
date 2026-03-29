import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Save, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  History as HistoryIcon,
  FileText
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
import { Category, Product, InventoryCount, Profile } from '@/src/types';
import { ProductListItem } from './ProductListItem';
import { ProductHistorySheet } from './ProductHistorySheet';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUnit } from '@/src/contexts/UnitContext';
import { NumericKeypad } from './NumericKeypad';
import { toast } from 'sonner';

interface ProductState {
  barra: number;
  almacen: number;
  isMissing: boolean;
  hasBeenCounted: boolean;
  isModified?: boolean;
}

export const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedUnitId } = useUnit();
  
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStates, setProductStates] = useState<Record<string, ProductState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHistoryProductId, setActiveHistoryProductId] = useState<string | null>(null);
  const [historyProductName, setHistoryProductName] = useState('');

  // Keypad State
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'barra' | 'almacen' | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [cat, prods, allProfiles, counts] = await Promise.all([
          inventoryService.getCategoryById(id),
          inventoryService.getProductsByCategory(id),
          inventoryService.getProfiles(),
          inventoryService.getCountsByCategory(id, selectedUnitId)
        ]);
        
        setCategory(cat);
        setProducts(prods);

        // Map profiles for history display
        const profileMap: Record<string, string> = {};
        allProfiles.forEach(p => {
          profileMap[p.id] = p.name;
        });
        setProfiles(profileMap);
        
        // Check if counts are from today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Initialize base states
        const initialStates: Record<string, ProductState> = {};
        prods.forEach(p => {
          const count = counts.find(c => c.product_id === p.id);
          let hasBeenCounted = false;
          let barra = 0;
          let almacen = 0;
          let isMissing = false;

          if (count && count.updated_at) {
            const updatedDate = typeof count.updated_at === 'string' ? new Date(count.updated_at) : (count.updated_at as any).toDate();
            if (updatedDate >= today) {
              hasBeenCounted = true;
              barra = count.barra_units;
              almacen = count.almacen_boxes;
              isMissing = count.is_critical;
            }
          }

          initialStates[p.id] = { barra, almacen, isMissing, hasBeenCounted };
        });

        // Load draft from localStorage
        const draftKey = `inventory_draft_category_${id}`;
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          try {
            const parsedDraft = JSON.parse(savedDraft);
            // Merge draft with initial states to ensure all current products exist
            const mergedStates = { ...initialStates };
            Object.keys(parsedDraft).forEach(pid => {
              if (mergedStates[pid]) {
                mergedStates[pid] = parsedDraft[pid];
              }
            });
            setProductStates(mergedStates);
          } catch (e) {
            console.error('Error parsing draft:', e);
            setProductStates(initialStates);
          }
        } else {
          setProductStates(initialStates);
        }
      } catch (error) {
        console.error('Error fetching category data:', error);
        toast.error('Error al cargar productos. Inténtelo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, selectedUnitId]);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    if (!id || !selectedUnitId || loading || Object.keys(productStates).length === 0) return;
    
    const draftKey = `inventory_draft_category_${id}_${selectedUnitId}`;
    localStorage.setItem(draftKey, JSON.stringify(productStates));
  }, [productStates, id, selectedUnitId, loading]);

  const handleUpdateProduct = (productId: string, field: keyof ProductState, value: any) => {
    setProductStates(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
        hasBeenCounted: true,
        isModified: true
      }
    }));
  };

  const handleInputClick = (productId: string, field: 'barra' | 'almacen') => {
    setActiveProductId(productId);
    setActiveField(field);
    setIsKeypadOpen(true);
  };

  const handleKeyPress = (key: string) => {
    if (!activeProductId || !activeField) return;
    
    const currentVal = productStates[activeProductId][activeField].toString();
    let newVal = currentVal === '0' ? key : currentVal + key;
    
    // Limit to 6 digits
    if (newVal.length > 6) newVal = newVal.slice(0, 6);
    
    handleUpdateProduct(activeProductId, activeField, parseInt(newVal, 10));
  };

  const handleKeypadChange = (val: string) => {
    if (!activeProductId || !activeField) return;
    handleUpdateProduct(activeProductId, activeField, parseInt(val || '0', 10));
  };

  const handleBackspace = () => {
    if (!activeProductId || !activeField) return;
    
    const currentVal = productStates[activeProductId][activeField].toString();
    const newVal = currentVal.length > 1 ? currentVal.slice(0, -1) : '0';
    
    handleUpdateProduct(activeProductId, activeField, parseInt(newVal, 10));
  };

  const handleNext = () => {
    if (!activeProductId || !activeField) return;

    if (activeField === 'barra') {
      setActiveField('almacen');
    } else {
      setIsKeypadOpen(false);
      setActiveProductId(null);
      setActiveField(null);
    }
  };

  const handleShowHistory = (product: Product) => {
    setHistoryProductName(product.name);
    setActiveHistoryProductId(product.id);
    setIsHistoryOpen(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Usuario no autenticado.');
      return;
    }
    if (!selectedUnitId || selectedUnitId === 'ALL') {
      toast.error('Debe seleccionar una unidad específica para realizar un conteo.');
      return;
    }

    setSaving(true);
    try {
      // Filter modified products
      const payload = (Object.entries(productStates) as [string, ProductState][])
        .filter(([_, state]) => state.isModified)
        .map(([productId, state]) => {
          const product = products.find(p => p.id === productId);
          const unitsPerBox = product?.units_per_box || 1;
          const barra = Number(state.barra) || 0;
          const almacen = Number(state.almacen) || 0;
          return {
            product_id: productId,
            unit_id: selectedUnitId,
            employee_id: user.id,
            barra_units: barra,
            almacen_boxes: almacen,
            total_units: barra + (almacen * unitsPerBox),
            is_critical: Boolean(state.isMissing)
          };
        });

      if (payload.length === 0) {
        toast.info('No hay cambios para guardar.');
        setSaving(false);
        return;
      }

      await inventoryService.saveCounts(payload);
      
      // Clear draft after successful save
      const draftKey = `inventory_draft_category_${id}_${selectedUnitId}`;
      localStorage.removeItem(draftKey);
      
      toast.success('¡Conteo guardado con éxito!');
      navigate(`/summary/${id}`);
    } catch (error) {
      console.error('Error saving counts:', error);
      toast.error('Error al guardar el conteo. Inténtelo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const activeProduct = products.find(p => p.id === activeProductId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="animate-spin text-muted-foreground" size={48} />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Cargando productos...</p>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <AlertCircle className="text-destructive" size={64} />
        <h2 className="text-3xl font-bold tracking-tight">Categoría no encontrada</h2>
        <Button onClick={() => navigate('/dashboard')} variant="outline">Volver al Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative p-2 md:p-6 lg:p-0">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 md:mb-12 shrink-0 gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90 shadow-sm"
          >
            <ChevronLeft size={32} className="md:w-10 md:h-10" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] mb-1">Inventario de</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter truncate">{category.name}</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 md:gap-8 text-muted-foreground font-black text-[10px] md:text-xs uppercase tracking-widest w-full md:w-auto justify-between md:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/summary/${id}`)}
            className="h-10 md:h-12 px-4 md:px-6 rounded-xl md:rounded-2xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-accent font-black uppercase tracking-widest text-[10px] gap-2 shadow-sm"
          >
            <FileText size={18} className="md:w-5 md:h-5" />
            Ver Resumen
          </Button>
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl border border-emerald-500/20">
            <CheckCircle2 size={20} className="md:w-6 md:h-6" />
            <span>{products.length} <span className="hidden sm:inline">Artículos</span></span>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto -mx-2 md:-mx-6 lg:mx-0 px-2 md:px-6 lg:px-0 pb-40">
        <div className="bg-card/40 rounded-3xl md:rounded-[3rem] border border-border/50 overflow-hidden backdrop-blur-md shadow-2xl">
          {products.map((product) => (
            <ProductListItem
              key={product.id}
              name={product.name}
              barra={productStates[product.id]?.barra || 0}
              almacen={productStates[product.id]?.almacen || 0}
              unitsPerBox={product.units_per_box || 1}
              isMissing={productStates[product.id]?.isMissing || false}
              isActive={activeProductId === product.id}
              activeField={activeProductId === product.id ? activeField : null}
              hasBeenCounted={productStates[product.id]?.hasBeenCounted || false}
              onInputClick={(field) => handleInputClick(product.id, field)}
              onMissingToggle={() => handleUpdateProduct(product.id, 'isMissing', !productStates[product.id]?.isMissing)}
              onHistoryClick={() => handleShowHistory(product)}
            />
          ))}
        </div>
      </div>

      {/* Fixed Footer with Save Button */}
      {!isKeypadOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-background via-background/95 to-transparent pt-24 pointer-events-none z-20">
          <div className="max-w-7xl mx-auto flex justify-end pointer-events-auto">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="h-16 md:h-20 px-10 md:px-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 transition-all active:scale-95 hover:scale-105"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  GUARDANDO...
                </>
              ) : (
                <>
                  <Save size={24} />
                  GUARDAR CONTEO
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Custom Keypad */}
      {isKeypadOpen && (
        <NumericKeypad
          value={activeProductId && activeField ? productStates[activeProductId][activeField].toString() : '0'}
          onChange={handleKeypadChange}
          onClose={() => {
            setIsKeypadOpen(false);
            setActiveProductId(null);
            setActiveField(null);
          }}
          title={activeProduct?.name || ''}
        />
      )}

      {/* History Sheet */}
      <ProductHistorySheet
        productId={activeHistoryProductId}
        productName={historyProductName}
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        profiles={profiles}
      />
    </div>
  );
};

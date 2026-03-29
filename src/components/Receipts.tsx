import React, { useState, useEffect } from 'react';
import { 
  PackagePlus, 
  Search, 
  CheckCircle2, 
  Loader2,
  Beer,
  CupSoda,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { inventoryService } from '@/src/services/inventoryService';
import { useAuth } from '@/src/contexts/AuthContext';
import { useUnit } from '@/src/contexts/UnitContext';
import { Product, Category } from '@/src/types';
import { toast } from 'sonner';

export const Receipts: React.FC = () => {
  const { user } = useAuth();
  const { selectedUnitId } = useUnit();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // State for the currently selected product to receive
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [receivedBoxes, setReceivedBoxes] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prods, cats] = await Promise.all([
          inventoryService.getProducts(),
          inventoryService.getCategories()
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectProduct = (product: Product) => {
    if (!selectedUnitId || selectedUnitId === 'ALL') {
      toast.error('Debe seleccionar una unidad antes de registrar una entrada.');
      return;
    }
    setSelectedProduct(product);
    setReceivedBoxes(0);
  };

  const handleRegisterReceipt = async () => {
    if (!selectedProduct || !user || !selectedUnitId || selectedUnitId === 'ALL') return;
    if (receivedBoxes <= 0) {
      toast.error('La cantidad debe ser mayor que cero');
      return;
    }

    setIsSubmitting(true);
    try {
      await inventoryService.registerReceipt(
        selectedProduct.id,
        selectedUnitId,
        user.id,
        receivedBoxes,
        selectedProduct.units_per_box || 1
      );
      toast.success('¡Entrada registrada con éxito!');
      setSelectedProduct(null);
      setReceivedBoxes(0);
    } catch (error) {
      console.error('Error registering receipt:', error);
      toast.error('Error al registrar entrada');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-muted-foreground" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex items-center gap-3 shrink-0">
        <PackagePlus className="text-muted-foreground" size={28} />
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Entrada de Mercancía</h2>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Column: Product Selection */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="flex gap-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input 
                placeholder="Buscar producto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-card border-border text-lg"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-14 px-4 rounded-2xl bg-card border border-border text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className={`cursor-pointer transition-all hover:scale-[1.02] ${selectedProduct?.id === product.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'}`}
                onClick={() => handleSelectProduct(product)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedProduct?.id === product.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {product.name.toLowerCase().includes('cerveza') ? <Beer size={24} /> : <CupSoda size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{product.name}</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">
                      1 Caja = {product.units_per_box || 1} Unid
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No se encontró ningún producto.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Receipt Form */}
        <div className="w-1/2 min-h-0">
          {selectedProduct ? (
            <Card className="h-full border-border/50 bg-card/50 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-full">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shrink-0">
                    <PackagePlus size={32} />
                  </div>
                  
                  <h3 className="text-2xl font-black tracking-tight text-foreground mb-1">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-6">
                    Registrar Recepción
                  </p>
  
                  <div className="w-full max-w-sm space-y-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Cantidad Recibida (Cajas)
                      </label>
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-12 h-12 rounded-xl border-2 hover:bg-muted active:scale-95 transition-all"
                          onClick={() => setReceivedBoxes(Math.max(0, receivedBoxes - 1))}
                        >
                          <Minus size={20} />
                        </Button>
                        
                        <div className="w-24 h-16 bg-background rounded-2xl border-2 border-border flex items-center justify-center">
                          <span className="text-3xl font-black font-mono">{receivedBoxes}</span>
                        </div>
  
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-12 h-12 rounded-xl border-2 hover:bg-muted active:scale-95 transition-all"
                          onClick={() => setReceivedBoxes(receivedBoxes + 1)}
                        >
                          <Plus size={20} />
                        </Button>
                      </div>
                    </div>
  
                    <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total en Unidades</span>
                      <span className="text-lg font-black font-mono text-foreground">
                        {receivedBoxes * (selectedProduct.units_per_box || 1)}
                      </span>
                    </div>
  
                    <Button 
                      className="w-full h-14 rounded-xl text-base font-bold uppercase tracking-widest"
                      disabled={receivedBoxes === 0 || isSubmitting}
                      onClick={handleRegisterReceipt}
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin mr-2" size={20} />
                      ) : (
                        <CheckCircle2 className="mr-2" size={20} />
                      )}
                      Confirmar Entrada
                    </Button>
                  </div>
                </CardContent>
              </ScrollArea>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-border rounded-[2.5rem] flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <PackagePlus size={48} className="mb-4 opacity-20" />
              <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">Seleccione un Producto</h3>
              <p className="text-sm max-w-[200px]">Elija un producto de la lista de al lado para registrar una nueva entrada de stock.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

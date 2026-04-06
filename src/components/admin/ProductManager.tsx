import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Check,
  X,
  Package,
  Search,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/src/services/inventoryService';
import { Category, Product, Profile } from '@/src/types';
import { toast } from 'sonner';

import { ConfirmModal } from '../ConfirmModal';
import { ProductHistorySheet } from '../ProductHistorySheet';

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHistoryProductId, setActiveHistoryProductId] = useState<string | null>(null);
  const [historyProductName, setHistoryProductName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    units_per_box: 24
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prods, cats, allProfiles] = await Promise.all([
        inventoryService.getProducts(),
        inventoryService.getCategories(),
        inventoryService.getProfiles()
      ]);
      setProducts(prods);
      setCategories(cats);

      const profileMap: Record<string, string> = {};
      allProfiles.forEach(p => {
        profileMap[p.id] = p.name;
      });
      setProfiles(profileMap);

      if (cats.length > 0) {
        setFormData(prev => ({ ...prev, category_id: cats[0].id }));
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.category_id) return;
    try {
      await inventoryService.createProduct(formData);
      setFormData({ name: '', category_id: categories[0]?.id || '', units_per_box: 24 });
      setIsAdding(false);
      toast.success('Producto añadido');
      fetchData();
    } catch (error) {
      toast.error('Error al añadir producto');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim() || !formData.category_id) return;
    try {
      await inventoryService.updateProduct(id, formData);
      setEditingId(null);
      toast.success('Producto actualizado');
      fetchData();
    } catch (error) {
      toast.error('Error al actualizar producto');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await inventoryService.deleteProduct(deleteId);
      toast.success('Producto eliminado');
      setDeleteId(null);
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message="¿Está seguro de que desea eliminar este producto? El historial de conteos se mantendrá, pero el producto ya no aparecerá para nuevos conteos."
      />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-foreground">Gestionar Productos</h3>
          <p className="text-muted-foreground text-sm">Registre y edite los ítems de su stock.</p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', category_id: categories[0]?.id || '', units_per_box: 24 });
            setIsAdding(true);
          }}
          className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs gap-2"
        >
          <Plus size={18} />
          Nuevo Producto
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full h-14 pl-12 pr-6 bg-card border border-border rounded-2xl text-lg font-medium text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(isAdding || editingId) && (
          <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <h4 className="text-xl font-black text-foreground">
              {isAdding ? 'Nuevo Producto' : 'Editar Producto'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nombre del Producto</label>
                <input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-lg font-bold text-foreground"
                  placeholder="Ej: Coca-Cola 330ml"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Categoría</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-lg font-bold text-foreground"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

            </div>
            <div className="flex justify-end gap-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-xs"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => isAdding ? handleAdd() : handleUpdate(editingId!)}
                className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs"
              >
                {isAdding ? 'Añadir Producto' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        )}

        {filteredProducts.map((product) => {
          const category = categories.find(c => c.id === product.category_id);
          return (
            <div 
              key={product.id}
              className="flex items-center justify-between p-6 bg-card border border-border rounded-2xl hover:bg-accent/50 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Package size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-foreground">{product.name}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-md">
                      {category?.name || 'Sin Categoría'}
                    </span>

                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setHistoryProductName(product.name);
                    setActiveHistoryProductId(product.id);
                    setIsHistoryOpen(true);
                  }}
                  className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90"
                  title="Ver Historial"
                >
                  <History size={18} />
                </button>
                <button 
                  onClick={() => {
                    setEditingId(product.id);
                    setFormData({
                      name: product.name || '',
                      category_id: product.category_id || '',
                      units_per_box: product.units_per_box || 1
                    });
                    setIsAdding(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => {
                    setDeleteId(product.id);
                    setIsConfirmOpen(true);
                  }}
                  className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

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

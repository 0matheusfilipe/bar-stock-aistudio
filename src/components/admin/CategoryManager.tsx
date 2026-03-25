import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/src/services/inventoryService';
import { Category } from '@/src/types';
import { toast } from 'sonner';

import { ConfirmModal } from '../ConfirmModal';

export const CategoryManager: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      await inventoryService.createCategory(newValue.trim());
      setNewValue('');
      setIsAdding(false);
      toast.success('Categoría añadida');
      fetchCategories();
    } catch (error) {
      toast.error('Error al añadir categoría');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim()) return;
    try {
      await inventoryService.updateCategory(id, editValue.trim());
      setEditingId(null);
      toast.success('Categoría actualizada');
      fetchCategories();
    } catch (error) {
      toast.error('Error al actualizar categoría');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await inventoryService.deleteCategory(deleteId);
      toast.success('Categoría eliminada');
      setDeleteId(null);
      fetchCategories();
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  if (loading && categories.length === 0) {
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
        title="Eliminar Categoría"
        message="¿Está seguro de que desea eliminar esta categoría? Los productos vinculados a ella no serán eliminados, pero la categoría quedará oculta."
      />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-foreground">Gestionar Categorías</h3>
          <p className="text-muted-foreground text-sm">Añada o edite las secciones de su inventario.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs gap-2"
        >
          <Plus size={18} />
          Nueva Categoría
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isAdding && (
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <input
              autoFocus
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Nombre de la categoría..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-bold text-foreground placeholder:text-muted-foreground/50"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
              <button 
                onClick={handleAdd}
                className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Check size={20} />
              </button>
            </div>
          </div>
        )}

        {categories.map((category) => (
          <div 
            key={category.id}
            className="flex items-center justify-between p-6 bg-card border border-border rounded-2xl hover:bg-accent/50 transition-all group"
          >
            {editingId === category.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-bold text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(category.id)}
              />
            ) : (
              <span className="text-xl font-bold text-foreground">{category.name}</span>
            )}

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === category.id ? (
                <>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={() => handleUpdate(category.id)}
                    className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Check size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setEditingId(category.id);
                      setEditValue(category.name);
                    }}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteId(category.id);
                      setIsConfirmOpen(true);
                    }}
                    className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

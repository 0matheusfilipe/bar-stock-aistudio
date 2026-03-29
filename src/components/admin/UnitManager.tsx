import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Check,
  X,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/src/services/inventoryService';
import { Unit } from '@/src/types';
import { toast } from 'sonner';

import { ConfirmModal } from '../ConfirmModal';
import { useUnit } from '@/src/contexts/UnitContext';

export const UnitManager: React.FC = () => {
  const { refreshUnits } = useUnit();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getUnits();
      setUnits(data);
    } catch (error) {
      toast.error('Error al cargar unidades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    try {
      await inventoryService.createUnit(newValue.trim());
      setNewValue('');
      setIsAdding(false);
      toast.success('Unidad añadida');
      fetchUnits();
      refreshUnits();
    } catch (error: any) {
      console.error('CREATE UNIT ERROR:', error);
      console.error('Error message:', error?.message);
      toast.error(`Error al añadir unidad: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.trim()) return;
    try {
      await inventoryService.updateUnit(id, editValue.trim());
      setEditingId(null);
      toast.success('Unidad actualizada');
      fetchUnits();
      refreshUnits();
    } catch (error) {
      toast.error('Error al actualizar unidad');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await inventoryService.deleteUnit(deleteId);
      toast.success('Unidad eliminada');
      setDeleteId(null);
      fetchUnits();
      refreshUnits();
    } catch (error) {
      toast.error('Error al eliminar unidad');
    }
  };

  if (loading && units.length === 0) {
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
        title="Eliminar Unidad"
        message="¿Está seguro de que desea eliminar esta unidad física? Los usuarios vinculados podrían perder su acceso."
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Store size={24} />
            Gestionar Unidades
          </h3>
          <p className="text-muted-foreground text-sm mt-1">Añada o edite las sedes físicas de su negocio.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(true)}
          className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs gap-2 shrink-0"
        >
          <Plus size={18} />
          Nueva Unidad
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isAdding && (
          <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-300">
            <input
              autoFocus
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Nombre de la unidad..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-bold text-foreground placeholder:text-muted-foreground/50"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setIsAdding(false)}
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Cancelar"
              >
                <X size={20} />
              </button>
              <button 
                onClick={handleAdd}
                className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                title="Guardar"
              >
                <Check size={20} />
              </button>
            </div>
          </div>
        )}

        {units.map((unit) => (
          <div 
            key={unit.id}
            className="flex items-center justify-between p-6 bg-card border border-border rounded-2xl hover:bg-accent/50 transition-all group"
          >
            {editingId === unit.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-bold text-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(unit.id)}
              />
            ) : (
              <span className="text-xl font-bold text-foreground">{unit.name}</span>
            )}

            <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
              {editingId === unit.id ? (
                <>
                  <button 
                    onClick={() => setEditingId(null)}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Cancelar"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={() => handleUpdate(unit.id)}
                    className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Guardar"
                  >
                    <Check size={20} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setEditingId(unit.id);
                      setEditValue(unit.name);
                    }}
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setDeleteId(unit.id);
                      setIsConfirmOpen(true);
                    }}
                    className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {units.length === 0 && !isAdding && !loading && (
          <div className="text-center py-12 px-4 shadow-sm border border-border/50 bg-card/20 rounded-2xl">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium text-lg mb-1">No hay unidades registradas</p>
            <p className="text-sm text-muted-foreground/70">Cree al menos una unidad para gestionar inventarios separados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

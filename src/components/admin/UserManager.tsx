import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Check,
  X,
  User,
  Shield,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/src/services/inventoryService';
import { Profile } from '@/src/types';
import { toast } from 'sonner';
import { useUnit } from '@/src/contexts/UnitContext';

import { ConfirmModal } from '../ConfirmModal';

export const UserManager: React.FC = () => {
  const { units } = useUnit();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    pin: '',
    role: 'user' as 'admin' | 'user',
    unit_id: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await inventoryService.getProfiles();
      setUsers(data);
    } catch (error) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim() || formData.pin.length !== 4) {
      toast.error('Complete el nombre y un PIN de 4 dígitos.');
      return;
    }
    if (formData.role === 'user' && !formData.unit_id) {
      toast.error('Debe seleccionar una unidad para el empleado.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...formData };
      if (payload.role === 'admin') {
        payload.unit_id = ''; // Admins don't have to be tied to one unit
      }
      await inventoryService.createProfile(payload);
      setFormData({ name: '', pin: '', role: 'user', unit_id: units[0]?.id || '' });
      setIsAdding(false);
      toast.success('¡Usuario añadido con éxito!');
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Error al añadir usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim() || formData.pin.length !== 4) {
      toast.error('Complete el nombre y un PIN de 4 dígitos.');
      return;
    }
    if (formData.role === 'user' && !formData.unit_id) {
      toast.error('Debe seleccionar una unidad para el empleado.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...formData };
      if (payload.role === 'admin') {
        payload.unit_id = null; // Remove lock
      }
      await inventoryService.updateProfile(id, payload);
      setEditingId(null);
      toast.success('¡Usuario actualizado con éxito!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await inventoryService.deleteProfile(deleteId);
      toast.success('Usuario eliminado');
      setDeleteId(null);
      fetchUsers();
    } catch (error) {
      toast.error('Error al eliminar usuario');
    }
  };

  if (loading && users.length === 0) {
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
        title="Eliminar Usuario"
        message="¿Está seguro de que desea eliminar este usuario? Perderá el acceso al sistema inmediatamente."
      />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-foreground">Gestionar Usuarios</h3>
          <p className="text-muted-foreground text-sm">Controle quién tiene acceso al sistema y sus permisos.</p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', pin: '', role: 'user', unit_id: units[0]?.id || '' });
            setIsAdding(true);
          }}
          className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs gap-2"
        >
          <Plus size={18} />
          Nuevo Usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(isAdding || editingId) && (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              isAdding ? handleAdd() : handleUpdate(editingId!);
            }}
            className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <h4 className="text-xl font-black text-foreground">
              {isAdding ? 'Nuevo Usuario' : 'Editar Usuario'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nombre Completo</label>
                <input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-lg font-bold text-foreground"
                  placeholder="Ej: Juan Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">PIN (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={formData.pin || ''}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-lg font-bold text-foreground"
                  placeholder="****"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cargo / Permiso</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-lg font-bold text-foreground"
                >
                  <option value="user">Empleado (Usuario)</option>
                  <option value="admin">Gerente (Admin)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Unidad</label>
                <select
                  value={formData.unit_id || ''}
                  onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                  disabled={formData.role === 'admin'}
                  className="w-full h-14 px-6 bg-card border border-border rounded-2xl text-lg font-bold text-foreground disabled:opacity-50"
                >
                  {formData.role === 'admin' && <option value="">Global (Todas)</option>}
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                  {units.length === 0 && <option value="" disabled>No hay unidades creadas</option>}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <Button 
                type="button"
                variant="ghost" 
                disabled={saving}
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-xs"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={saving}
                className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs flex items-center gap-2"
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                {isAdding ? 'Añadir Usuario' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        )}

        {users.map((u) => (
          <div 
            key={u.id}
            className="flex items-center justify-between p-6 bg-card border border-border rounded-2xl hover:bg-accent/50 transition-all group"
          >
            <div className="flex items-center gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {u.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
              </div>
              <div>
                <h4 className="text-xl font-bold text-foreground">{u.name}</h4>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                  {u.role === 'user' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-accent text-muted-foreground">
                      {units.find(un => un.id === u.unit_id)?.name || 'Sin Unidad'}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    <Key size={10} />
                    PIN: ****
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setEditingId(u.id);
                  setFormData({
                    name: u.name || '',
                    pin: u.pin || '',
                    role: u.role || 'user',
                    unit_id: u.unit_id || ''
                  });
                  setIsAdding(false);
                }}
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => {
                  setDeleteId(u.id);
                  setIsConfirmOpen(true);
                }}
                className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

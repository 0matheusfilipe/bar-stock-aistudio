import React, { createContext, useContext, useState, useEffect } from 'react';
import { Unit } from '../types';
import { inventoryService } from '../services/inventoryService';
import { useAuth } from './AuthContext';

interface UnitContextType {
  units: Unit[];
  selectedUnitId: string | undefined; // "ALL" represents all units for admins
  setSelectedUnitId: (id: string | undefined) => void;
  isLoadingUnits: boolean;
  refreshUnits: () => Promise<void>;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

export const UnitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string | undefined>(undefined);
  const [isLoadingUnits, setIsLoadingUnits] = useState(true);

  const fetchUnits = async () => {
    setIsLoadingUnits(true);
    const fetchedUnits = await inventoryService.getUnits();
    setUnits(fetchedUnits);
    setIsLoadingUnits(false);
    return fetchedUnits;
  };

  useEffect(() => {
    // Only fetch if user is logged in
    if (!user) {
      setUnits([]);
      setSelectedUnitId(undefined);
      setIsLoadingUnits(false);
      return;
    }

    fetchUnits().then((loadedUnits) => {
      // Logic for selectedUnitId
      if (user.role === 'admin') {
        // Admin default to ALL or keep existing valid selection
        if (!selectedUnitId) {
          setSelectedUnitId('ALL');
        }
      } else {
        // Normal user must use their assigned unit
        setSelectedUnitId(user.unit_id);
      }
    });
  }, [user]);

  // Ensure normal users can't change to a unit they don't own
  const handleSetSelectedUnitId = (id: string | undefined) => {
    if (user?.role === 'user') {
      if (id !== user.unit_id) {
        console.warn('User attempted to switch to unauthorized unit');
        return;
      }
    }
    setSelectedUnitId(id);
  };

  return (
    <UnitContext.Provider value={{ 
      units, 
      selectedUnitId, 
      setSelectedUnitId: handleSetSelectedUnitId, 
      isLoadingUnits,
      refreshUnits: fetchUnits
    }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = () => {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
};

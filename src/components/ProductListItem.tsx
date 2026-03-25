import React from 'react';
import { AlertTriangle, History } from 'lucide-react';

interface ProductListItemProps {
  name: string;
  barra: number;
  almacen: number;
  unitsPerBox: number;
  isMissing: boolean;
  isActive: boolean;
  activeField: 'barra' | 'almacen' | null;
  hasBeenCounted?: boolean;
  onInputClick: (field: 'barra' | 'almacen') => void;
  onMissingToggle: () => void;
  onHistoryClick: () => void;
}

export const ProductListItem: React.FC<ProductListItemProps> = ({
  name,
  barra,
  almacen,
  unitsPerBox,
  isMissing,
  isActive,
  activeField,
  hasBeenCounted,
  onInputClick,
  onMissingToggle,
  onHistoryClick,
}) => {
  const total = barra + (almacen * unitsPerBox);
  const isCounted = hasBeenCounted || barra > 0 || almacen > 0;

  return (
    <div 
      className={`min-h-[100px] flex flex-col md:flex-row items-start md:items-center px-6 py-5 border-b border-border transition-all duration-300 gap-5 md:gap-0 ${
        isActive 
          ? 'bg-primary/5 ring-2 ring-inset ring-primary/20' 
          : isMissing 
            ? 'bg-amber-500/30 border-l-[16px] border-l-amber-500' 
            : isCounted 
              ? 'bg-muted/40' 
              : 'bg-transparent'
      }`}
    >
      <div className="flex items-center w-full md:w-auto flex-1 gap-6">
        {/* History Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHistoryClick();
          }}
          className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all active:scale-90 shadow-sm"
        >
          <History size={24} className="md:w-6 md:h-6" />
        </button>

        {/* Product Name */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl md:text-2xl font-black tracking-tight truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {name}
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
            {unitsPerBox} unidades por caja
          </p>
        </div>
      </div>

      {/* Inputs and Totals Container */}
      <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-6 md:gap-10 md:mx-12">
        <div className="flex items-center gap-6 md:gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeField === 'barra' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Barra
            </span>
            <div
              onClick={() => onInputClick('barra')}
              className={`w-20 h-16 md:w-28 md:h-20 bg-card border rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black transition-all cursor-pointer shadow-sm ${
                activeField === 'barra' 
                  ? 'border-primary bg-primary/10 text-primary scale-110 shadow-xl shadow-primary/10' 
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {barra || '0'}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeField === 'almacen' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Almacén
            </span>
            <div
              onClick={() => onInputClick('almacen')}
              className={`w-20 h-16 md:w-28 md:h-20 bg-card border rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black transition-all cursor-pointer shadow-sm ${
                activeField === 'almacen' 
                  ? 'border-primary bg-primary/10 text-primary scale-110 shadow-xl shadow-primary/10' 
                  : 'border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {almacen || '0'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
            <div className={`w-20 h-16 md:w-28 md:h-20 flex items-center justify-center bg-muted/50 rounded-2xl text-2xl md:text-3xl font-black ${isCounted ? 'text-foreground' : 'text-muted-foreground/40'}`}>
              {total}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Faltante</span>
            <button
              onClick={onMissingToggle}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                isMissing 
                  ? 'bg-amber-500 text-zinc-950 shadow-xl shadow-amber-500/20' 
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <AlertTriangle size={24} className="md:w-7 md:h-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

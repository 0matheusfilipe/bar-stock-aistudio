import React from 'react';
import { Delete, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  title: string;
}

export const NumericKeypad: React.FC<NumericKeypadProps> = ({ value, onChange, onClose, title }) => {
  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      onChange(value.slice(0, -1));
    } else if (value.length < 6) {
      // Prevent leading zeros unless it's just '0'
      if (value === '0') {
        onChange(key);
      } else {
        onChange(value + key);
      }
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Insertar Cantidad</p>
            <h3 className="text-xl font-black text-foreground">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Display */}
          <div className="bg-muted/50 rounded-3xl p-6 border border-border flex items-center justify-end">
            <span className="text-6xl font-black tracking-tighter text-foreground">
              {value || '0'}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
              <Button
                key={key}
                variant="ghost"
                onClick={() => handleKeyPress(key)}
                className="h-20 rounded-2xl bg-muted/50 hover:bg-muted text-2xl font-black text-foreground border border-border/50 active:scale-95 transition-all"
              >
                {key}
              </Button>
            ))}
            <div />
            <Button
              variant="ghost"
              onClick={() => handleKeyPress('0')}
              className="h-20 rounded-2xl bg-muted/50 hover:bg-muted text-2xl font-black text-foreground border border-border/50 active:scale-95 transition-all"
            >
              0
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleKeyPress('delete')}
              className="h-20 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground border border-border/50 active:scale-95 transition-all"
            >
              <Delete size={28} />
            </Button>
          </div>

          <Button
            onClick={onClose}
            className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-black uppercase tracking-widest"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
};

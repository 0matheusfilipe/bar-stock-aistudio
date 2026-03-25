import React, { useState, useEffect } from 'react';
import { ClipboardList, Delete, LogIn } from 'lucide-react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/src/services/inventoryService';
import { useAuth } from '@/src/contexts/AuthContext';
import { motion, useAnimation } from 'motion/react';
import { toast } from 'sonner';
import { DottedSurface } from './ui/dotted-surface';

export const Login: React.FC = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { login } = useAuth();
  const controls = useAnimation();

  const handlePress = (num: string) => {
    if (pin.length < 4 && !loading) {
      setError(false);
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0 && !loading) {
      setError(false);
      setPin(pin.slice(0, -1));
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      handleValidate(pin);
    }
  }, [pin]);

  const handleValidate = async (p: string) => {
    setLoading(true);
    try {
      const user = await inventoryService.validatePin(p);
      if (user) {
        login(user);
      } else {
        setError(true);
        // Shake animation
        await controls.start({
          x: [-10, 10, -10, 10, 0],
          transition: { duration: 0.4 }
        });
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(true);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
      <DottedSurface className="opacity-100 bg-background" />
      
      {loading && pin.length === 0 ? (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      ) : (
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left Side: Branding and PIN Display */}
          <div className="flex flex-col items-center lg:items-start gap-12 text-center lg:text-left">
            <div className="flex flex-col items-center lg:items-start gap-6">
              <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20">
                <ClipboardList size={44} />
              </div>
              <div>
                <h1 className="text-5xl font-black tracking-tighter text-foreground mb-3">BarStock</h1>
                <p className="text-muted-foreground text-lg font-bold uppercase tracking-[0.2em]">Control de Inventario</p>
              </div>
            </div>

            <div className="space-y-6 w-full max-w-xs">
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Ingrese su PIN de 4 dígitos</p>
              
              <motion.div 
                animate={controls}
                className="flex justify-between gap-4"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`w-16 h-20 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${
                      error 
                        ? 'border-destructive bg-destructive/10' 
                        : pin.length > i 
                          ? 'border-primary bg-primary/5 scale-105' 
                          : 'border-border bg-card/50 backdrop-blur-sm'
                    }`}
                  >
                    {pin.length > i && (
                      <div className={`w-4 h-4 rounded-full ${error ? 'bg-destructive' : 'bg-primary'} shadow-lg shadow-primary/20`} />
                    )}
                  </div>
                ))}
              </motion.div>
              
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-destructive font-bold text-center lg:text-left text-sm uppercase tracking-widest"
                >
                  PIN incorrecto. Inténtelo de nuevo.
                </motion.p>
              )}
            </div>
          </div>

          {/* Right Side: Keypad */}
          <div className="flex justify-center lg:justify-end">
            <div className="grid grid-cols-3 gap-4 p-8 bg-card/30 rounded-[3rem] border border-border/50 backdrop-blur-md">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  disabled={loading}
                  onClick={() => handlePress(num.toString())}
                  className="w-24 h-24 rounded-3xl bg-card border border-border text-4xl font-black text-foreground hover:bg-accent active:scale-90 transition-all shadow-xl shadow-black/5 flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              <div className="w-24 h-24" /> {/* Empty space */}
              <button
                disabled={loading}
                onClick={() => handlePress('0')}
                className="w-24 h-24 rounded-3xl bg-card border border-border text-4xl font-black text-foreground hover:bg-accent active:scale-90 transition-all shadow-xl shadow-black/5 flex items-center justify-center"
              >
                0
              </button>
              <button
                disabled={loading}
                onClick={handleBackspace}
                className="w-24 h-24 rounded-3xl bg-muted border border-border text-muted-foreground hover:bg-accent hover:text-foreground active:scale-90 transition-all flex items-center justify-center"
              >
                <Delete size={32} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

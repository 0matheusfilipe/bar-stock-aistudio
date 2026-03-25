import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Beer, 
  CupSoda, 
  CheckCircle2, 
  Clock,
  LayoutGrid
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { inventoryService } from '@/src/services/inventoryService';
import { Category } from '@/src/types';

interface CategoryProgress {
  id: string;
  name: string;
  total: number;
  counted: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const cats = await inventoryService.getCategories();
        const progressData = await Promise.all(
          cats.map(async (cat) => {
            const progress = await inventoryService.getCategoryProgress(cat.id);
            return {
              id: cat.id,
              name: cat.name,
              ...progress
            };
          })
        );
        setCategories(progressData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 p-2 md:p-6 lg:p-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <LayoutGrid size={28} />
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Categorías</h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">Selecciona una sección para contar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {categories.map((cat) => {
          const isComplete = cat.total > 0 && cat.counted === cat.total;
          const percentage = cat.total > 0 ? (cat.counted / cat.total) * 100 : 0;

          return (
            <Card 
              key={cat.id}
              className={`group relative overflow-hidden border-border bg-card hover:bg-accent transition-all cursor-pointer active:scale-[0.97] h-full flex flex-col ${
                isComplete ? 'ring-4 ring-emerald-500/20 border-emerald-500/50' : 'hover:border-primary/30'
              }`}
              onClick={() => navigate(`/category/${cat.id}`)}
            >
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isComplete ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
                  }`}>
                    {cat.name.toLowerCase().includes('cerveza') ? <Beer size={32} /> : <CupSoda size={32} />}
                  </div>
                  <Badge 
                    variant={isComplete ? "default" : "secondary"}
                    className={`h-10 px-5 rounded-xl font-black uppercase tracking-widest text-[10px] ${
                      isComplete ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isComplete ? (
                      <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Listo</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Clock size={14} /> {cat.counted}/{cat.total}</span>
                    )}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-8 flex-1">
                <div>
                  <CardTitle className="text-3xl font-black tracking-tight mb-2">{cat.name}</CardTitle>
                  <p className="text-muted-foreground font-medium text-sm">Progresso de la sección</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>Completado</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-3 bg-muted rounded-full ${isComplete ? '[&>div]:bg-emerald-500' : '[&>div]:bg-primary'}`} 
                  />
                </div>
              </CardContent>

              <CardFooter className="pt-4 pb-8 flex justify-between items-center border-t border-border/50 bg-muted/20">
                {cat.total > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/summary/${cat.id}`);
                    }}
                    className={`${isComplete ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-primary hover:text-primary/80 hover:bg-primary/10'} font-black text-[10px] uppercase tracking-widest px-4 h-10 rounded-xl`}
                  >
                    Resumen
                  </Button>
                )}
                <div className="flex items-center text-muted-foreground group-hover:text-foreground transition-colors font-black text-[10px] uppercase tracking-widest ml-auto">
                  {isComplete ? 'Revisar' : 'Empezar'}
                  <ChevronRight size={18} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardFooter>

              {/* Decorative background glow */}
              <div className={`absolute -right-16 -bottom-16 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${
                isComplete ? 'bg-emerald-500' : 'bg-primary'
              }`} />
            </Card>
          );
        })}
      </div>
    </div>
  );
};

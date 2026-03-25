import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageSearch,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Filter,
  ArrowDownToLine,
  Clock,
  Box,
  User,
  Tag,
} from 'lucide-react';
import { inventoryService } from '@/src/services/inventoryService';
import { Category, Product, InventoryCount } from '@/src/types';

// --- Types ---
type PeriodFilter = 'today' | '7d' | '30d' | 'all';

interface EnrichedEntry extends InventoryCount {
  productName: string;
  categoryId: string;
  categoryName: string;
}

// --- Helpers ---
function getTimestamp(entry: InventoryCount): number {
  if (!entry.updated_at) return 0;
  if (typeof entry.updated_at === 'string') return new Date(entry.updated_at).getTime();
  return (entry.updated_at as any).toMillis?.() ?? 0;
}

function formatDate(entry: InventoryCount): string {
  const ms = getTimestamp(entry);
  if (!ms) return '—';
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function filterByPeriod(entries: EnrichedEntry[], period: PeriodFilter): EnrichedEntry[] {
  if (period === 'all') return entries;
  const now = Date.now();
  const ms = period === 'today' ? 86400000 : period === '7d' ? 7 * 86400000 : 30 * 86400000;
  const cutoff = now - ms;
  return entries.filter(e => getTimestamp(e) >= cutoff);
}

// --- Sub-components ---
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, sub, accent = 'text-primary' }) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 flex flex-col gap-3 group hover:border-primary/30 transition-all duration-300 shadow-sm">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted ${accent}`}>{icon}</div>
    </div>
    <div>
      <p className={`text-4xl font-black tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground font-medium mt-1">{sub}</p>}
    </div>
    <div className={`absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-current ${accent}`} />
  </div>
);

// --- Main Component ---
export const Dashboard: React.FC = () => {
  const [allHistory, setAllHistory] = useState<InventoryCount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentCounts, setCurrentCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const [hist, cats, prods, counts] = await Promise.all([
          inventoryService.getAllHistory(),
          inventoryService.getCategories(),
          inventoryService.getProducts(),
          inventoryService.subscribeToCounts
            ? [] // handled below
            : [],
        ]);
        setAllHistory(hist);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Subscribe to live counts for critical count
    const unsub = inventoryService.subscribeToCounts((counts) => {
      setCurrentCounts(counts);
    });
    return () => unsub();
  }, []);

  // Build product lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  // Filter only receipts and enrich
  const receipts = useMemo<EnrichedEntry[]>(() => {
    return allHistory
      .filter(h => h.type === 'receipt')
      .map(h => {
        const product = productMap.get(h.product_id);
        const category = product ? categoryMap.get(product.category_id) : undefined;
        return {
          ...h,
          productName: product?.name ?? '—',
          categoryId: product?.category_id ?? '',
          categoryName: category?.name ?? '—',
        };
      })
      .sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [allHistory, productMap, categoryMap]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = filterByPeriod(receipts, period);
    if (categoryFilter !== 'all') {
      result = result.filter(e => e.categoryId === categoryFilter);
    }
    return result;
  }, [receipts, period, categoryFilter]);

  // KPI calculations
  const totalEntradas = filtered.length;
  const totalUnidades = useMemo(() => {
    return filtered.reduce((sum, e) => {
      const product = productMap.get(e.product_id);
      const units = (e.received_boxes ?? 0) * (product?.units_per_box ?? 1);
      return sum + units;
    }, 0);
  }, [filtered, productMap]);
  const criticalCount = useMemo(
    () => currentCounts.filter(c => c.is_critical).length,
    [currentCounts]
  );

  const periodOptions: { label: string; value: PeriodFilter }[] = [
    { label: 'Hoje', value: 'today' },
    { label: '7 Dias', value: '7d' },
    { label: '30 Dias', value: '30d' },
    { label: 'Tudo', value: 'all' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2 md:p-0 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <TrendingUp size={26} />
        </div>
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            Entradas de produtos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<ArrowDownToLine size={20} />}
          label="Entradas no Período"
          value={totalEntradas}
          sub="recebimentos registrados"
          accent="text-blue-400"
        />
        <KpiCard
          icon={<Box size={20} />}
          label="Unidades Recebidas"
          value={totalUnidades.toLocaleString('pt-BR')}
          sub="unidades no período"
          accent="text-emerald-400"
        />
        <KpiCard
          icon={<AlertTriangle size={20} />}
          label="Produtos Críticos"
          value={criticalCount}
          sub="requerem atenção"
          accent={criticalCount > 0 ? 'text-red-400' : 'text-muted-foreground'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Period */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
            <CalendarDays size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Período</span>
          </div>
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                period === opt.value
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Category */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-muted-foreground mr-1">
            <Filter size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Categoria</span>
          </div>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              categoryFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            Todas
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                categoryFilter === cat.id
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-4 px-6 py-3 border-b border-border bg-muted/40">
          {['Produto', 'Categoria', 'Caixas', 'Unidades', 'Data / Hora'].map(h => (
            <span key={h} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <PackageSearch size={48} strokeWidth={1.5} />
            <div className="text-center">
              <p className="font-bold uppercase tracking-widest text-sm">Nenhuma entrada encontrada</p>
              <p className="text-xs mt-1">Tente mudar o período ou categoria selecionados</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((entry, i) => (
              <div
                key={entry.id}
                className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-2 md:gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {/* Product */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Box size={16} />
                  </div>
                  <span className="font-bold text-sm text-foreground truncate">{entry.productName}</span>
                </div>

                {/* Category */}
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                    <Tag size={11} />
                    {entry.categoryName}
                  </span>
                </div>

                {/* Received Boxes */}
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span className="text-muted-foreground md:hidden text-[10px] uppercase tracking-widest">Caixas:</span>
                  {entry.received_boxes ?? 0}
                </div>

                {/* Total Units */}
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <span className="text-muted-foreground md:hidden text-[10px] uppercase tracking-widest">Unidades:</span>
                  {entry.total_units ?? 0}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={13} />
                  {formatDate(entry)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-muted/20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Mostrando {filtered.length} entrada{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

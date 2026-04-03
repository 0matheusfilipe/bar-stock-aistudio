import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Category, Product, InventoryCount } from '../types';

interface ExportOptions {
  title?: string;
  unitName?: string;
  categoryName?: string;
  dateFrom?: string;
  dateTo?: string;
  generatedBy?: string;
  statusName?: string;
}

interface ProductRow {
  product: Product;
  category: Category;
  count?: InventoryCount;
  unitName?: string;
}

// Brand colors
const BRAND_PRIMARY = [99, 102, 241] as const; // Indigo-ish primary
const BRAND_DARK = [15, 23, 42] as const; // Slate-900
const BRAND_MUTED = [100, 116, 139] as const; // Slate-500
const BRAND_RED = [239, 68, 68] as const;
const BRAND_GREEN = [16, 185, 129] as const;
const BRAND_AMBER = [245, 158, 11] as const;

export function generateInventoryPDF(
  rows: ProductRow[],
  options: ExportOptions = {}
) {
  const {
    title = 'Reporte de Inventario',
    unitName,
    categoryName,
    statusName,
    dateFrom,
    dateTo,
    generatedBy
  } = options;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ── Header Band ──────────────────────────────────────────────
  doc.setFillColor(...BRAND_DARK);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent bar
  doc.setFillColor(...BRAND_PRIMARY);
  doc.rect(0, 38, pageWidth, 2, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), 14, 18);

  // Subtitle line
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const subtitleParts: string[] = [];
  if (unitName && unitName !== 'ALL') subtitleParts.push(`Unid: ${unitName}`);
  if (categoryName && categoryName !== 'all') subtitleParts.push(`Cat: ${categoryName}`);
  if (statusName) subtitleParts.push(`Estado: ${statusName}`);
  if (dateFrom || dateTo) {
    const range = [dateFrom || '...', dateTo || '...'].join(' → ');
    subtitleParts.push(`Período: ${range}`);
  }
  doc.text(subtitleParts.join('  |  ') || 'Todas las categorías — Vista global', 14, 28);

  // Right side: date & branding
  doc.setFontSize(8);
  doc.setTextColor(140, 150, 170);
  const now = new Date();
  doc.text(`Generado: ${now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })} — ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('BARSTOCK', pageWidth - 14, 28, { align: 'right' });

  // ── KPI Boxes ────────────────────────────────────────────────
  const kpiY = 46;
  const totalProducts = rows.length;
  const totalUnits = rows.reduce((s, r) => s + (r.count?.total_units || 0), 0);
  const criticalCount = rows.filter(r => r.count?.is_critical).length;
  const pendingCount = rows.filter(r => !r.count).length;

  const kpis = [
    { label: 'PRODUCTOS', value: String(totalProducts), color: BRAND_PRIMARY },
    { label: 'UNIDADES TOTALES', value: totalUnits.toLocaleString('es-ES'), color: BRAND_GREEN },
    { label: 'CRÍTICOS', value: String(criticalCount), color: criticalCount > 0 ? BRAND_RED : BRAND_MUTED },
    { label: 'PENDIENTES', value: String(pendingCount), color: pendingCount > 0 ? BRAND_AMBER : BRAND_MUTED },
  ];

  const kpiWidth = (pageWidth - 28 - (kpis.length - 1) * 4) / kpis.length;
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiWidth + 4);
    // Background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, kpiY, kpiWidth, 20, 3, 3, 'F');
    // Left accent
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(x, kpiY, 3, 20, 1.5, 1.5, 'F');
    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_MUTED[0], BRAND_MUTED[1], BRAND_MUTED[2]);
    doc.text(kpi.label, x + 8, kpiY + 7);
    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 8, kpiY + 16);
  });

  // ── Tables ───────────────────────────────────────────────────
  let currentY = kpiY + 28;

  // Group rows by unit
  const groupedRows: Record<string, ProductRow[]> = {};
  rows.forEach(r => {
    const uName = r.unitName || options.unitName || 'Unidad';
    if (!groupedRows[uName]) groupedRows[uName] = [];
    groupedRows[uName].push(r);
  });

  const isMultiUnit = Object.keys(groupedRows).length > 1 || options.unitName === 'Todas';

  Object.entries(groupedRows).forEach(([unitGroupName, unitRows], index) => {
    // Check page break for unit header
    if (currentY > pageHeight - 40 && index > 0) {
      doc.addPage();
      currentY = 20;
    }

    // Draw unit header if multiple units
    if (isMultiUnit) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(14, currentY, pageWidth - 28, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...BRAND_DARK);
      doc.text(`UNIDAD: ${unitGroupName.toUpperCase()}`, 18, currentY + 5.5);
      currentY += 10;
    }

    const tableData = unitRows.map(row => {
      const count = row.count;
      const status = !count ? 'Pendiente' : count.is_critical ? 'Crítico' : 'OK';
      const lastUpdate = count?.updated_at
        ? new Date(typeof count.updated_at === 'string' ? count.updated_at : (count.updated_at as any).toDate()).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';

      return [
        row.product.name,
        row.category.name,
        String(row.product.units_per_box || 1),
        String(count?.barra_units ?? '—'),
        String(count?.almacen_boxes ?? '—'),
        String(count?.total_units ?? '—'),
        String(count?.faltante ?? '—'),
        status,
        lastUpdate
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Producto', 'Categoría', 'Uni/Caja', 'Barra', 'Almacén', 'Total', 'Faltante', 'Estado', 'Últ. Actualización']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [...BRAND_DARK] as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 4,
        halign: 'center',
      },
      styles: {
        fontSize: 8,
        cellPadding: 3.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
        textColor: [...BRAND_DARK] as [number, number, number],
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 50 },
        1: { halign: 'left', cellWidth: 35, textColor: [...BRAND_MUTED] as [number, number, number] },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 22 },
        8: { halign: 'center', fontSize: 7, textColor: [...BRAND_MUTED] as [number, number, number] },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        // Color the "Estado" column
        if (data.section === 'body' && data.column.index === 7) {
          const val = data.cell.raw as string;
          if (val.includes('Crítico')) {
            data.cell.styles.textColor = [...BRAND_RED] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('OK')) {
            data.cell.styles.textColor = [...BRAND_GREEN] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          } else if (val.includes('Pendiente')) {
            data.cell.styles.textColor = [...BRAND_AMBER] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Color faltante column when > 0
        if (data.section === 'body' && data.column.index === 6) {
          const val = Number(data.cell.raw);
          if (!isNaN(val) && val > 0) {
            data.cell.styles.textColor = [...BRAND_RED] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  });

  // ── Footer ───────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footer line
    doc.setDrawColor(...BRAND_PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_MUTED);
    doc.text(
      generatedBy ? `Responsable: ${generatedBy}` : 'BarStock Inventory System',
      14, pageHeight - 7
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  // ── Download ─────────────────────────────────────────────────
  const fileName = [
    'inventario',
    unitName && unitName !== 'ALL' ? unitName.toLowerCase().replace(/\s+/g, '_') : null,
    categoryName && categoryName !== 'all' ? categoryName.toLowerCase().replace(/\s+/g, '_') : null,
    now.toISOString().slice(0, 10),
  ].filter(Boolean).join('_') + '.pdf';

  doc.save(fileName);
}

export interface Profile {
  id: string;
  name: string;
  pin: string;
  role?: 'admin' | 'user';
  unit_id?: string;
  deleted?: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  name: string;
  deleted?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  units_per_box: number; // e.g., 24 for a case of beer
  target_stock?: number; // Ideal stock level
  created_at: string;
}

export interface InventoryCount {
  id: string;
  product_id: string;
  unit_id: string;
  employee_id: string;
  barra_units: number;
  almacen_boxes: number;
  total_units: number;
  faltante?: number; // Missing from target
  is_critical: boolean;
  updated_at: string;
  type?: 'count' | 'receipt';
  received_boxes?: number;
}

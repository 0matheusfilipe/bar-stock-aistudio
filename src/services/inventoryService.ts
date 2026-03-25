import { 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  query, 
  where, 
  serverTimestamp, 
  onSnapshot,
  updateDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Profile, Category, Product, InventoryCount } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || null,
      isAnonymous: auth.currentUser?.isAnonymous || false,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const inventoryService = {
  // Profiles
  async getProfiles(): Promise<Profile[]> {
    const path = 'profiles';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !(p as any).deleted);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async validatePin(pin: string): Promise<Profile | null> {
    const path = 'profiles';
    try {
      const q = query(collection(db, path), where('pin', '==', pin));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async getProfileById(id: string): Promise<Profile | null> {
    const path = `profiles/${id}`;
    try {
      const docRef = doc(db, 'profiles', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as Profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const path = 'categories';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Category))
        .filter(c => !(c as any).deleted);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getCategoryById(id: string): Promise<Category | null> {
    const path = `categories/${id}`;
    try {
      const docRef = doc(db, 'categories', id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as Category;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  // Products
  async getProducts(): Promise<Product[]> {
    const path = 'products';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Product))
        .filter(p => !(p as any).deleted);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const path = 'products';
    try {
      const q = query(collection(db, path), where('category_id', '==', categoryId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getCategoryProgress(categoryId: string): Promise<{ total: number; counted: number }> {
    const productsPath = 'products';
    const countsPath = 'inventory_counts';
    try {
      // Get all products for this category
      const qProds = query(
        collection(db, productsPath), 
        where('category_id', '==', categoryId)
      );
      const prodSnapshot = await getDocs(qProds);
      const activeProducts = prodSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => !(p as any).deleted);
      
      const total = activeProducts.length;

      if (total === 0) return { total: 0, counted: 0 };

      // Get all counts
      const prodIds = activeProducts.map(p => p.id);
      const qCounts = query(collection(db, countsPath), where('product_id', 'in', prodIds));
      const countSnapshot = await getDocs(qCounts);
      
      // Count products that have been updated today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let counted = 0;
      countSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.updated_at) {
          const updatedDate = data.updated_at.toDate();
          if (updatedDate >= today) {
            counted++;
          }
        }
      });

      return { total, counted };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, productsPath);
      return { total: 0, counted: 0 };
    }
  },

  async getCountsByCategory(categoryId: string): Promise<InventoryCount[]> {
    const productsPath = 'products';
    const countsPath = 'inventory_counts';
    try {
      // Get all products for this category
      const qProds = query(
        collection(db, productsPath), 
        where('category_id', '==', categoryId)
      );
      const prodSnapshot = await getDocs(qProds);
      const activeProducts = prodSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => !(p as any).deleted);
      
      if (activeProducts.length === 0) return [];

      const prodIds = activeProducts.map(p => p.id);
      const qCounts = query(collection(db, countsPath), where('product_id', 'in', prodIds));
      const countSnapshot = await getDocs(qCounts);
      
      return countSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCount));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, countsPath);
      return [];
    }
  },

  // Inventory Counts
  subscribeToCounts(callback: (counts: InventoryCount[]) => void) {
    const path = 'inventory_counts';
    return onSnapshot(collection(db, path), (snapshot) => {
      const counts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryCount));
      callback(counts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveCounts(counts: Omit<InventoryCount, 'id' | 'updated_at'>[]) {
    const path = 'inventory_counts';
    const historyPath = 'inventory_history';
    try {
      const batch = writeBatch(db);
      
      for (const count of counts) {
        // Upsert in current counts: Use product_id as the document ID
        const docRef = doc(db, path, count.product_id);
        batch.set(docRef, {
          ...count,
          updated_at: serverTimestamp()
        }, { merge: true });

        // Add to history log: Use random ID
        const historyRef = doc(collection(db, historyPath));
        batch.set(historyRef, {
          ...count,
          type: 'count',
          updated_at: serverTimestamp()
        });
      }
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateCount(
    productId: string, 
    employeeId: string, 
    barraUnits: number, 
    almacenBoxes: number, 
    totalUnits: number,
    isCritical: boolean
  ) {
    const path = 'inventory_counts';
    const historyPath = 'inventory_history';
    try {
      const data = {
        product_id: productId,
        employee_id: employeeId,
        barra_units: Number(barraUnits) || 0,
        almacen_boxes: Number(almacenBoxes) || 0,
        total_units: Number(totalUnits) || 0,
        is_critical: Boolean(isCritical),
        type: 'count',
        updated_at: serverTimestamp()
      };

      // Upsert in current counts
      await setDoc(doc(db, path, productId), data, { merge: true });

      // Add to history log
      await addDoc(collection(db, historyPath), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async registerReceipt(
    productId: string,
    employeeId: string,
    receivedBoxes: number,
    unitsPerBox: number
  ) {
    const path = 'inventory_counts';
    const historyPath = 'inventory_history';
    try {
      // Get current count
      const currentDoc = await getDoc(doc(db, path, productId));
      
      let barraUnits = 0;
      let almacenBoxes = 0;
      let isCritical = false;

      if (currentDoc.exists()) {
        const currentData = currentDoc.data() as InventoryCount;
        barraUnits = Number(currentData.barra_units) || 0;
        almacenBoxes = Number(currentData.almacen_boxes) || 0;
        isCritical = Boolean(currentData.is_critical);
      }

      // Add received boxes
      const newAlmacenBoxes = almacenBoxes + (Number(receivedBoxes) || 0);
      const newTotalUnits = barraUnits + (newAlmacenBoxes * (Number(unitsPerBox) || 1));

      const data = {
        product_id: productId,
        employee_id: employeeId,
        barra_units: barraUnits,
        almacen_boxes: newAlmacenBoxes,
        total_units: newTotalUnits,
        is_critical: isCritical,
        type: 'receipt',
        received_boxes: Number(receivedBoxes) || 0,
        updated_at: serverTimestamp()
      };

      // Upsert in current counts
      await setDoc(doc(db, path, productId), data, { merge: true });

      // Add to history log
      await addDoc(collection(db, historyPath), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getProductHistory(productId: string): Promise<InventoryCount[]> {
    const path = 'inventory_history';
    try {
      const q = query(
        collection(db, path), 
        where('product_id', '==', productId)
      );
      const snapshot = await getDocs(q);
      
      const history = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as InventoryCount));

      return history.sort((a, b) => {
        const dateA = a.updated_at ? (typeof a.updated_at === 'string' ? new Date(a.updated_at).getTime() : (a.updated_at as any).toMillis()) : 0;
        const dateB = b.updated_at ? (typeof b.updated_at === 'string' ? new Date(b.updated_at).getTime() : (b.updated_at as any).toMillis()) : 0;
        return dateB - dateA; // Newest first
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllHistory(): Promise<InventoryCount[]> {
    const path = 'inventory_history';
    try {
      const snapshot = await getDocs(collection(db, path));
      const history = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as InventoryCount));

      return history.sort((a, b) => {
        const dateA = a.updated_at ? (typeof a.updated_at === 'string' ? new Date(a.updated_at).getTime() : (a.updated_at as any).toMillis()) : 0;
        const dateB = b.updated_at ? (typeof b.updated_at === 'string' ? new Date(b.updated_at).getTime() : (b.updated_at as any).toMillis()) : 0;
        return dateB - dateA; // Newest first
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // CRUD Operations
  async createCategory(name: string): Promise<string> {
    const path = 'categories';
    try {
      const docRef = await addDoc(collection(db, path), {
        name,
        deleted: false,
        created_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateCategory(id: string, name: string): Promise<void> {
    const path = `categories/${id}`;
    try {
      await updateDoc(doc(db, 'categories', id), { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteCategory(id: string): Promise<void> {
    const path = `categories/${id}`;
    try {
      // Note: In a real app, we should check if there are products in this category
      await updateDoc(doc(db, 'categories', id), { deleted: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async createProduct(data: Omit<Product, 'id' | 'created_at'>): Promise<string> {
    const path = 'products';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        deleted: false,
        created_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<void> {
    const path = `products/${id}`;
    try {
      await updateDoc(doc(db, 'products', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    const path = `products/${id}`;
    try {
      await updateDoc(doc(db, 'products', id), { deleted: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async createProfile(data: Omit<Profile, 'id' | 'created_at'>): Promise<string> {
    const path = 'profiles';
    try {
      const docRef = await addDoc(collection(db, path), {
        ...data,
        deleted: false,
        created_at: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      return '';
    }
  },

  async updateProfile(id: string, data: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<void> {
    const path = `profiles/${id}`;
    try {
      await updateDoc(doc(db, 'profiles', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteProfile(id: string): Promise<void> {
    const path = `profiles/${id}`;
    try {
      await updateDoc(doc(db, 'profiles', id), { deleted: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Seed Data
  async seedInitialData() {
    try {
      const path = 'profiles';
      
      // 1. Ensure Junior exists and is admin
      const qJunior = query(collection(db, path), where('name', '==', 'Junior'));
      const juniorSnapshot = await getDocs(qJunior);
      let juniorId = '';
      
      if (juniorSnapshot.empty) {
        console.log('Seeding Junior as initial admin...');
        const docRef = await addDoc(collection(db, path), {
          name: 'Junior',
          pin: '0000',
          role: 'admin',
          deleted: false,
          created_at: serverTimestamp()
        });
        juniorId = docRef.id;
      } else {
        const juniorDoc = juniorSnapshot.docs[0];
        juniorId = juniorDoc.id;
        if (juniorDoc.data().role !== 'admin') {
          console.log('Updating Junior to admin role...');
          await updateDoc(doc(db, path, juniorId), { role: 'admin' });
        }
      }

      // 2. Check if other data exists
      const categories = await this.getCategories();
      if (categories.length > 0) return;

      console.log('Seeding initial inventory data...');

      // 3. Ensure Carlos exists for initial counts
      const qCarlos = query(collection(db, path), where('name', '==', 'Carlos'));
      const carlosSnapshot = await getDocs(qCarlos);
      let carlosId = '';
      
      if (carlosSnapshot.empty) {
        const docRef = await addDoc(collection(db, path), {
          name: 'Carlos',
          pin: '1234',
          role: 'user',
          deleted: false,
          created_at: serverTimestamp()
        });
        carlosId = docRef.id;
      } else {
        carlosId = carlosSnapshot.docs[0].id;
      }

      // Categories
      const catCervezas = await addDoc(collection(db, 'categories'), {
        name: 'Cervezas',
        deleted: false,
        created_at: serverTimestamp()
      });
      const catRefrescos = await addDoc(collection(db, 'categories'), {
        name: 'Refrescos',
        deleted: false,
        created_at: serverTimestamp()
      });
      const catVinos = await addDoc(collection(db, 'categories'), {
        name: 'Vinos',
        deleted: false,
        created_at: serverTimestamp()
      });
      const catEspirituosos = await addDoc(collection(db, 'categories'), {
        name: 'Espirituosos',
        deleted: false,
        created_at: serverTimestamp()
      });
      const catAgua = await addDoc(collection(db, 'categories'), {
        name: 'Agua y Zumos',
        deleted: false,
        created_at: serverTimestamp()
      });

      // Products
      const products = [
        { name: 'Mahou 5 Estrellas', category_id: catCervezas.id, units_per_box: 24, deleted: false },
        { name: 'Heineken 330ml', category_id: catCervezas.id, units_per_box: 24, deleted: false },
        { name: 'Coca-Cola 330ml', category_id: catRefrescos.id, units_per_box: 24, deleted: false },
        { name: 'Fanta Naranja 330ml', category_id: catRefrescos.id, units_per_box: 24, deleted: false },
        { name: 'Vino Tinto Casa', category_id: catVinos.id, units_per_box: 6, deleted: false },
        { name: 'Ginebra Premium', category_id: catEspirituosos.id, units_per_box: 1, deleted: false },
        { name: 'Agua Mineral 500ml', category_id: catAgua.id, units_per_box: 24, deleted: false },
      ];

      for (const p of products) {
        const prodRef = await addDoc(collection(db, 'products'), {
          ...p,
          created_at: serverTimestamp()
        });

        // Initial empty count
        await addDoc(collection(db, 'inventory_counts'), {
          product_id: prodRef.id,
          employee_id: carlosId,
          barra_units: 0,
          almacen_boxes: 0,
          total_units: 0,
          is_critical: false,
          updated_at: serverTimestamp()
        });
      }

      console.log('Seed completed successfully!');
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  }
};

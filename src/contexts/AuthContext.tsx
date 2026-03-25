import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types';
import { auth } from '../firebase';
import { inventoryService } from '../services/inventoryService';
import { 
  onAuthStateChanged, 
  signInAnonymously,
  signOut
} from 'firebase/auth';

interface AuthContextType {
  user: Profile | null;
  login: (user: Profile) => void;
  logout: () => void;
  isLoading: boolean;
  isFirebaseReady: boolean;
  firebaseUser: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    // 1. Handle Application User (PIN-based)
    const initUser = async () => {
      const savedUser = localStorage.getItem('inventory_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.id) {
            // Refresh from Firestore to get latest role/data
            const profile = await inventoryService.getProfileById(parsed.id);
            if (profile && !profile.deleted) {
              setUser(profile);
              localStorage.setItem('inventory_user', JSON.stringify(profile));
            } else {
              // User was deleted or not found
              localStorage.removeItem('inventory_user');
              setUser(null);
            }
          }
        } catch (e) {
          localStorage.removeItem('inventory_user');
        }
      }
    };

    // 2. Handle Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      // Wait for both Firebase Auth and Local User Refresh
      await initUser();

      if (!fbUser) {
        try {
          await signInAnonymously(auth);
        } catch (error: any) {
          if (error.code === 'auth/admin-restricted-operation') {
            console.warn('Anonymous sign-in is disabled in Firebase Console. Proceeding without Auth session.');
          } else {
            console.error('Firebase anonymous sign-in failed:', error);
          }
        }
      }
      
      setIsFirebaseReady(true);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData: Profile) => {
    setUser(userData);
    localStorage.setItem('inventory_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('inventory_user');
    // We keep the anonymous session or sign out if needed
    // For PIN-only, we usually just clear the local user
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      isFirebaseReady, 
      firebaseUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

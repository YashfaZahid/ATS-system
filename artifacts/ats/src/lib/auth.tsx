import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { UserProfile, UserProfileRole } from '@workspace/api-client-react/api.schemas';
import { getMe, syncUser } from '@workspace/api-client-react';
import { setAuthTokenGetter } from '@workspace/api-client-react/custom-fetch';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserProfileRole | null;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<void>;
  signUp: (e: string, p: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const profileData = await getMe();
          setProfile(profileData);
        } catch (error) {
          console.error("Failed to fetch profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    try {
      const p = await getMe();
      setProfile(p);
    } catch (e) {
      // If they don't exist in DB yet, maybe sync them?
      await syncUser({
         email: cred.user.email || '',
         firebaseUid: cred.user.uid,
         name: cred.user.displayName || email.split('@')[0],
      });
      const p = await getMe();
      setProfile(p);
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    
    // Sync user to DB
    const p = await syncUser({
      email: cred.user.email || '',
      firebaseUid: cred.user.uid,
      name,
    });
    setProfile(p);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role || null, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading || !user) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;

  return <Component {...rest} />;
};

export const AdminRoute = ({ component: Component, ...rest }: any) => {
  const { user, role, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) setLocation('/login');
      else if (role !== 'admin') setLocation('/dashboard');
    }
  }, [user, role, loading, setLocation]);

  if (loading || !user || role !== 'admin') return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;

  return <Component {...rest} />;
};

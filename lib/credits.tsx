"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { creditsApi } from "./api";

type CreditsContextValue = {
  balance: number | null;
  refreshCredits: () => Promise<void>;
  setBalance: (balance: number) => void;
};

const CreditsContext = createContext<CreditsContextValue | null>(null);

// Shared credits balance so any component that changes it (top-up, a job
// finishing, etc.) can update every place that displays it at once, instead
// of each screen polling its own copy independently.
export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const [snapshot, setSnapshot] = useState<{ userId: string; balance: number } | null>(null);
  const requestVersion = useRef(0);
  const balance = userId && snapshot?.userId === userId ? snapshot.balance : null;
  const setBalance = useCallback((value: number) => {
    requestVersion.current += 1;
    if (userId) setSnapshot({ userId, balance: value });
  }, [userId]);

  const refreshCredits = useCallback(async () => {
    if (!userId) return;
    const version = ++requestVersion.current;
    try {
      const b = await creditsApi.getBalance();
      if (version === requestVersion.current) setSnapshot({ userId, balance: b.balance });
    } catch {
      /* non-critical */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const version = ++requestVersion.current;
    void creditsApi.getBalance().then((result) => {
      if (version === requestVersion.current) setSnapshot({ userId, balance: result.balance });
    }).catch(() => { /* A later refresh can recover a temporary network failure. */ });
    return () => { requestVersion.current += 1; };
  }, [userId]);

  return (
    <CreditsContext.Provider value={{ balance, refreshCredits, setBalance }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return ctx;
}

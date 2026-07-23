"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
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
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const refreshCredits = useCallback(async () => {
    if (!isAuthenticated) {
      setBalance(null);
      return;
    }
    try {
      const b = await creditsApi.getBalance();
      setBalance(b.balance);
    } catch {
      /* non-critical */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

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

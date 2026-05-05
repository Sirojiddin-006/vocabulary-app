import React, { createContext, useContext, useEffect, useState } from "react";

export type AppLocale = "en" | "uz";

type AppLocaleContextType = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
};

const STORAGE_KEY = "app-locale";

const AppLocaleContext = createContext<AppLocaleContextType | undefined>(undefined);

export function AppLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<AppLocale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "uz" || stored === "en" ? stored : "en";
  });

  const toggleLocale = () => {
    setLocale(prev => (prev === "en" ? "uz" : "en"));
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <AppLocaleContext.Provider value={{ locale, setLocale, toggleLocale }}>
      {children}
    </AppLocaleContext.Provider>
  );
}

export function useAppLocale() {
  const context = useContext(AppLocaleContext);
  if (!context) {
    throw new Error("useAppLocale must be used within AppLocaleProvider");
  }

  return context;
}

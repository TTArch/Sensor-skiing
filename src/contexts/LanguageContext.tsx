/**
 * LanguageContext - React Context for i18n language state
 * Exposes the current language and translation function
 */
import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useStore } from '../store';
import { t as translate, type Language, type TranslationKey } from '../utils/i18n';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

interface LanguageProviderProps {
  children: React.ReactNode;
}

/**
 * Language provider component
 * Wrap your app with this to access translations
 */
export function LanguageProvider({ children }: LanguageProviderProps) {
  const language = useStore((state) => state.language);
  const setLanguageAction = useStore((state) => state.setLanguage);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translate(key, language);
    },
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageAction,
      t,
    }),
    [language, setLanguageAction, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access language context
 * Must be used within a LanguageProvider
 * @throws if used outside LanguageProvider
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

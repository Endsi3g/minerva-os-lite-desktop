'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Locale, translations, TranslationKey } from './translations';
import { createClient } from './supabase/client';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKey, fallback?: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');
  const [isLoading, setIsLoading] = useState(true);

  // Load locale from localStorage immediately to avoid flash of FR
  useEffect(() => {
    const saved = localStorage.getItem('minerva_locale') as Locale;
    const timer = setTimeout(() => {
      if (saved && (saved === 'fr' || saved === 'en' || saved === 'de')) {
        setLocaleState(saved);
      }
      setIsLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sync with Supabase when authenticated
  useEffect(() => {
    const fetchLanguage = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: dbSettings } = await supabase
            .from('settings')
            .select('language')
            .eq('user_id', user.id)
            .maybeSingle();

          if (dbSettings && dbSettings.language) {
            const dbLang = dbSettings.language as Locale;
            if (dbLang === 'fr' || dbLang === 'en' || dbLang === 'de') {
              setLocaleState(dbLang);
              localStorage.setItem('minerva_locale', dbLang);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch language from Supabase Settings", e);
      }
    };
    fetchLanguage();
  }, []);

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('minerva_locale', newLocale);

    // Trigger locale changed event
    window.dispatchEvent(new Event('minerva_locale_changed'));

    // Try saving to Supabase settings table
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Attempt to upsert language. We ignore DDL errors gracefully if column doesn't exist yet.
        await supabase
          .from('settings')
          .upsert({
            user_id: user.id,
            language: newLocale
          });
      }
    } catch (e) {
      console.warn("Failed to persist language in Supabase Settings:", e);
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    const trans = translations[locale];
    if (trans && key in trans) {
      return trans[key] as string;
    }
    // Fallback to FR
    const frTrans = translations['fr'];
    if (frTrans && key in frTrans) {
      return frTrans[key] as string;
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

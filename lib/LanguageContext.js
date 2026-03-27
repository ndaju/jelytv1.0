'use client'

import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('tr'); // Turkish as default
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check localStorage for saved language preference
    const savedLang = localStorage.getItem('jellytv_language');
    if (savedLang && (savedLang === 'tr' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
    
    // Check if welcome modal was shown
    const welcomeShown = localStorage.getItem('jellytv_welcome_shown');
    if (!welcomeShown) {
      setShowWelcome(true);
    }
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('jellytv_language', lang);
  };

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('jellytv_welcome_shown', 'true');
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['tr'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, showWelcome, dismissWelcome }}>
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

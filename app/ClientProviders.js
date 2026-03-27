'use client'

import { LanguageProvider } from '@/lib/LanguageContext';
import WelcomeModal from '@/components/WelcomeModal';

export default function ClientProviders({ children }) {
  return (
    <LanguageProvider>
      <WelcomeModal />
      {children}
    </LanguageProvider>
  );
}

'use client'

import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function WelcomeModal() {
  const { t, showWelcome, dismissWelcome } = useLanguage();

  if (!showWelcome) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-gradient-to-br from-purple-900 to-black border border-purple-500/50 rounded-2xl p-8 max-w-md mx-4 shadow-2xl shadow-purple-500/20 animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={dismissWelcome}
          className="absolute top-4 right-4 text-purple-300 hover:text-white transition"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="JellyTV Logo"
            className="w-32 h-32 object-contain drop-shadow-2xl"
          />
        </div>

        {/* Welcome Message */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">{t('welcomeTitle')}</h1>
          <div className="bg-purple-600/30 border border-purple-500/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-200">
              {t('welcomeMessage')}
            </p>
          </div>
          <p className="text-purple-300">{t('welcomeSubtitle')}</p>
        </div>

        {/* Button */}
        <Button
          onClick={dismissWelcome}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-semibold py-3 text-lg"
        >
          {t('welcomeButton')}
        </Button>
      </div>
    </div>
  );
}

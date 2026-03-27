'use client'

import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, changeLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-purple-900/30 rounded-full border border-purple-700/50 p-1">
      <Button
        size="sm"
        variant={language === 'tr' ? 'default' : 'ghost'}
        onClick={() => changeLanguage('tr')}
        className={`rounded-full px-3 py-1 text-xs ${language === 'tr' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-purple-800/50'}`}
      >
        TR
      </Button>
      <Button
        size="sm"
        variant={language === 'en' ? 'default' : 'ghost'}
        onClick={() => changeLanguage('en')}
        className={`rounded-full px-3 py-1 text-xs ${language === 'en' ? 'bg-purple-600 text-white' : 'text-purple-300 hover:bg-purple-800/50'}`}
      >
        EN
      </Button>
    </div>
  );
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, X } from 'lucide-react';

interface InfoButtonProps {
  translationKey: string;
  label?: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({ translationKey, label }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const text = t(translationKey);

  // If there's no translation or the key itself is returned (meaning translation is missing or not provided)
  if (!text || text === translationKey) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer ml-1.5 focus:outline-none"
        title="Field Information"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-left rtl:text-right">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg bg-secondary hover:bg-slate-700 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col gap-3">
              <h4 className="text-base font-bold text-foreground pr-8">
                {label || t('personalInfo.fullName')}
              </h4>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {text}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary/95 transition-all shadow-md active:scale-95"
              >
                {t('visit.formNavigation.close', { defaultValue: 'Close' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

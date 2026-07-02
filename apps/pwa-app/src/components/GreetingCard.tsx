import React from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

export const GreetingCard: React.FC = () => {
  const currentDate = moment().format('DD MMMM YYYY');
  const { t } = useTranslation();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl shadow-slate-950/20 relative overflow-hidden">
      <div className="flex flex-col gap-1.5 relative z-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          {t('greetings.title')}
        </h2>
        <p className="text-slate-400 text-sm max-w-xl">
          {t('greetings.paragraph')}
        </p>
        <span className="text-xs text-sky-400 font-semibold uppercase tracking-wide">
          {t('greetings.location')} Pilot Test Center
        </span>
      </div>
      <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-2 self-start md:self-center">
        <span className="text-sm font-semibold text-slate-200">{currentDate}</span>
      </div>
    </div>
  );
};
export default GreetingCard;

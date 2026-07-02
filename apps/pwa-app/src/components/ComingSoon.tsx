import React from 'react';
import { FlaskConical } from 'lucide-react';

export const ComingSoon: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
      <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 animate-bounce">
        <FlaskConical className="h-8 w-8 text-sky-400" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-bold text-2xl text-slate-100">Lab Tests</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Advanced diagnostic and blood testing modules are currently under development.
        </p>
      </div>
    </div>
  );
};
export default ComingSoon;

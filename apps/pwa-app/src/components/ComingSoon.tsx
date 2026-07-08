import React from 'react';
import { FlaskConical } from 'lucide-react';

export const ComingSoon: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4 bg-card border border-border rounded-2xl p-8 shadow-xl">
      <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground animate-bounce">
        <FlaskConical className="h-8 w-8 text-primary" />
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-bold text-2xl text-foreground">Lab Tests</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Advanced diagnostic and blood testing modules are currently under development.
        </p>
      </div>
    </div>
  );
};
export default ComingSoon;

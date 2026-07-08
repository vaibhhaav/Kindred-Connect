import * as React from 'react';

import { cn } from '../../lib/utils.js';

function Progress({ className, value = 0, ...props }) {
  const pct = Math.max(0, Math.min(100, Number(value)));
  return (
    <div
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      {...props}
    >
      <div
        className="h-full w-full origin-left rounded-full bg-primary"
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </div>
  );
}

export { Progress };


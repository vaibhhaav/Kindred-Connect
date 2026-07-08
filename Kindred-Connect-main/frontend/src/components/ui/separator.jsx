import * as React from 'react';

import { cn } from '../../lib/utils.js';

function Separator({ className, orientation = 'horizontal', decorative = true, ...props }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };


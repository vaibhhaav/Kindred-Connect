import * as React from 'react';

function Slider({
  className,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  ...props
}) {
  const current = Array.isArray(value) ? value[0] : value;

  return (
    <input
      type="range"
      className={className}
      min={min}
      max={max}
      step={step}
      value={current}
      onChange={(e) => {
        const v = Number(e.target.value);
        onValueChange?.([v]);
      }}
      {...props}
    />
  );
}

export { Slider };


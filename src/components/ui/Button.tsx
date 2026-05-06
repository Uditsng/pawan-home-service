import React from 'react';

const variants = {
  primary: 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-[#0F172A] active:scale-95',
  gradient: 'bg-linear-to-br from-[#00685f] to-[#008378] text-white shadow-[0_8px_20px_rgba(0,104,95,0.25)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
  slate: 'bg-surface-container-high text-on-surface shadow-md shadow-surface-container/20 hover:bg-surface-container-highest active:scale-95',
  secondary: 'bg-secondary text-on-secondary shadow-md hover:brightness-110 active:scale-95',
  outline: 'border-2 border-primary text-primary hover:bg-primary/5 active:scale-95',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low active:scale-95'
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-lg',
  icon: 'w-10 h-10 p-2 flex-col justify-center items-center'
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-xl transition-all';
  const variantClasses = variants[variant] || variants.primary;
  const sizeClasses = sizes[size] || sizes.md;

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.replace(/\s+/g, ' ').trim()}
      {...props}
    >
      {children}
    </button>
  );
}

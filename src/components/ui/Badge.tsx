import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'surface' | 'outline' | 'success' | 'warning' | 'danger';
}

export function Badge({ className = '', variant = 'primary', children, ...props }: BadgeProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    surface: 'bg-surface-container text-on-surface-variant',
    outline: 'border border-primary/20 text-primary',
    success: 'bg-secondary/10 text-secondary',
    warning: 'bg-[#FDE68A]/20 text-[#D97706]', // Assuming standard warning colors
    danger: 'bg-red-500/10 text-red-600'
  };

  const baseClasses = 'px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-[0.1em] inline-flex items-center justify-center';
  const variantClasses = variants[variant] || variants.primary;

  return (
    <span 
      className={`${baseClasses} ${variantClasses} ${className}`.replace(/\s+/g, ' ').trim()} 
      {...props}
    >
      {children}
    </span>
  );
}

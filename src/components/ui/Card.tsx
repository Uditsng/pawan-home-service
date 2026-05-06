import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'solid' | 'outline';
}

export function Card({ className = '', variant = 'solid', children, ...props }: CardProps) {
  const variants = {
    glass: 'glass-panel rounded-2xl p-4 sm:p-6',
    solid: 'bg-surface-container-lowest rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-outline-variant/20',
    outline: 'bg-transparent border border-outline-variant/20 rounded-2xl p-4 sm:p-6'
  };

  const variantClasses = variants[variant] || variants.solid;

  return (
    <div 
      className={`${variantClasses} transition-all duration-300 ${className}`.replace(/\s+/g, ' ').trim()} 
      {...props}
    >
      {children}
    </div>
  );
}

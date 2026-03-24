import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
}

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
  secondary: 'bg-surface-800 hover:bg-surface-700 text-slate-200 border border-surface-700',
  ghost: 'hover:bg-surface-800 text-slate-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

const sizes = {
  sm: 'px-2 py-1 text-xs gap-1',
  md: 'px-3 py-1.5 text-sm gap-1.5',
  lg: 'px-4 py-2 text-base gap-2',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg font-medium
        transition-colors duration-150 select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

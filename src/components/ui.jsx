import React, { useState, useId } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading,
  disabled,
  type = 'button',
  ...props
}) => {
  const variants = {
    primary: 'bg-primary hover:bg-primaryHover text-white shadow-glow',
    secondary: 'bg-white/5 hover:bg-white/10 text-textPrimary border border-white/10',
    ghost: 'bg-transparent hover:bg-white/5 text-textPrimary',
  };
  const sizes = {
    sm: 'h-9 px-4 text-xs rounded-xl',
    md: 'h-11 px-5 text-sm rounded-2xl',
    lg: 'h-12 px-6 text-base rounded-2xl',
  };
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 size={18} className="mr-2 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

export const Card = ({
  children,
  className,
  glass,
  interactive,
  onClick,
  ...props
}) => (
  <div
    role={interactive || onClick ? 'button' : undefined}
    tabIndex={interactive || onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={interactive || onClick ? (e) => e.key === 'Enter' && onClick?.(e) : undefined}
    className={cn(
      'rounded-2xl border border-white/5 bg-card p-4 shadow-card',
      glass && 'glass',
      (interactive || onClick) && 'cursor-pointer hover:border-primary/30 transition-colors',
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const Input = ({
  label,
  floating,
  error,
  className,
  id: idProp,
  value,
  ...props
}) => {
  const autoId = useId();
  const id = idProp || autoId;
  const [focused, setFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).length > 0;
  const floated = floating && (focused || hasValue || props.placeholder);

  if (floating) {
    return (
      <div className={cn('relative', className)}>
        <input
          id={id}
          value={value}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className={cn(
            'peer w-full h-14 px-4 pt-5 pb-2 rounded-2xl bg-card border text-textPrimary text-sm font-medium transition-colors focus:outline-none',
            error ? 'border-danger/50 focus:border-danger' : 'border-white/10 focus:border-primary'
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            'absolute left-4 text-textMuted pointer-events-none transition-all duration-200',
            floated ? 'top-2 text-[10px] font-semibold uppercase tracking-wide' : 'top-1/2 -translate-y-1/2 text-sm'
          )}
        >
          {label}
        </label>
        {error && <p className="text-xs text-danger mt-1.5 ml-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-textMuted uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        id={id}
        value={value}
        {...props}
        className={cn(
          'w-full h-12 px-4 rounded-2xl bg-card border text-textPrimary text-sm focus:outline-none transition-colors',
          error ? 'border-danger/50 focus:border-danger' : 'border-white/10 focus:border-primary'
        )}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};

export const Select = ({
  label,
  options = [],
  className,
  value,
  defaultValue,
  onChange,
  disabled,
  ...props
}) => (
  <div className={cn('space-y-1.5', className)}>
    {label && <span className="text-xs font-semibold text-textMuted uppercase tracking-wide">{label}</span>}
    <select
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        'w-full h-12 px-3 rounded-2xl bg-card border border-white/10 text-textPrimary text-sm focus:outline-none focus:border-primary appearance-none cursor-pointer disabled:opacity-50'
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-bgDark">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export const Switch = ({ checked, onChange, disabled, className }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange?.(!checked)}
    className={cn(
      'relative w-11 h-6 rounded-full transition-colors shrink-0',
      checked ? 'bg-primary' : 'bg-white/10',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}
  >
    <span
      className={cn(
        'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
        checked && 'translate-x-5'
      )}
    />
  </button>
);

const avatarSizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };

export const Avatar = ({ name, size = 'md', className }) => {
  const initials = (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shrink-0',
        avatarSizes[size] || avatarSizes.md,
        className
      )}
    >
      {initials}
    </div>
  );
};

const badgeVariants = {
  primary: 'bg-primary/15 text-primary border-primary/30',
  success: 'bg-accent/15 text-accent border-accent/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
};

export const Badge = ({ children, variant = 'primary', className }) => (
  <span
    className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
      badgeVariants[variant] || badgeVariants.primary,
      className
    )}
  >
    {children}
  </span>
);

export const ScreenHeader = ({ title, onBack, right, className }) => (
  <div className={cn('flex items-center justify-between p-4 border-b border-white/5 relative shrink-0', className)}>
    {onBack ? (
      <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-white/5 transition-colors">
        <ChevronLeft size={24} />
      </button>
    ) : (
      <div className="w-10" />
    )}
    <h1 className="text-lg font-bold absolute left-1/2 -translate-x-1/2 pointer-events-none">{title}</h1>
    <div className="min-w-[40px] flex justify-end">{right}</div>
  </div>
);

export const TabBar = ({ tabs, active, onChange, className }) => (
  <div className={cn('flex bg-card/50 p-1 rounded-xl border border-white/5 backdrop-blur-md', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={cn(
          'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
          active === tab.id ? 'bg-white/10 shadow-sm text-white' : 'text-textMuted hover:text-white'
        )}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export const Skeleton = ({ className }) => (
  <div className={cn('animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded-xl', className)} />
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    {Icon && (
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Icon size={28} className="text-textMuted" />
      </div>
    )}
    <h3 className="text-base font-bold text-textPrimary mb-1">{title}</h3>
    {description && <p className="text-sm text-textMuted max-w-[260px] mb-4">{description}</p>}
    {action}
  </div>
);

export const ProgressBar = ({ step, total, labels = [] }) => {
  const pct = total ? Math.min(100, Math.round((step / total) * 100)) : 0;
  return (
    <div className="space-y-2 mb-2">
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-progress transition-all" style={{ width: `${pct}%` }} />
      </div>
      {labels[0] && <p className="text-[10px] text-textMuted uppercase tracking-wide">{labels[0]}</p>}
    </div>
  );
};

export const StatusAnimation = ({ type = 'success', size = 100 }) => {
  if (type === 'loading') {
    return (
      <div className="flex items-center justify-center animate-success" style={{ width: size, height: size }}>
        <Loader2 size={size * 0.45} className="text-primary animate-spin" />
      </div>
    );
  }
  const Icon = type === 'error' ? XCircle : CheckCircle2;
  const color = type === 'error' ? 'text-danger' : 'text-accent';
  return (
    <div className="animate-success animate-check flex items-center justify-center" style={{ width: size, height: size }}>
      <Icon size={size * 0.85} className={color} strokeWidth={1.5} />
    </div>
  );
};

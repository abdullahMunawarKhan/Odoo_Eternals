import React from 'react';
import { cn } from '../../utils/cn';

export function Card({ className = '', children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-white text-slate-900 shadow-xs transition-shadow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 p-5 md:p-6 border-b border-slate-100', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }) {
  return (
    <h3
      className={cn('font-semibold text-base md:text-lg text-slate-900 tracking-tight leading-none', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }) {
  return (
    <p className={cn('text-xs md:text-sm text-slate-500 leading-normal', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = '', children, ...props }) {
  return (
    <div className={cn('p-5 md:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...props }) {
  return (
    <div
      className={cn('flex items-center p-5 md:p-6 pt-0 border-t border-slate-100', className)}
      {...props}
    >
      {children}
    </div>
  );
}


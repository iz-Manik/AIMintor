import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = "",
  ...props
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white shadow-lg shadow-red-500/25',
    ghost: 'bg-transparent hover:bg-white/10 text-white border border-white/10'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl'
  };

  return (
    <motion.button
      className={`
        relative overflow-hidden rounded-2xl font-semibold
        transition-all duration-300 transform
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      whileHover={!disabled ? {
        scale: 1.05,
        boxShadow: variant === 'primary' ? '0 20px 40px -12px rgba(168, 85, 247, 0.4)' : undefined
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      disabled={disabled || loading}
      {...props}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -top-full bg-gradient-to-b from-transparent via-white/20 to-transparent transform -skew-x-12 transition-transform duration-1000 hover:translate-y-full" />

      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </span>
    </motion.button>
  );
}
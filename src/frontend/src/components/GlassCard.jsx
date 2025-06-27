import React from 'react';
import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = "",
  hover = true,
  glow = false,
  ...props
}) {
  return (
    <motion.div
      className={`
        relative backdrop-blur-xl bg-white/5
        border border-white/10 rounded-3xl shadow-2xl
        ${glow ? 'shadow-purple-500/25' : ''}
        ${className}
      `}
      whileHover={hover ? {
        scale: 1.02,
        y: -5,
        boxShadow: glow ? '0 25px 50px -12px rgba(168, 85, 247, 0.4)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      {...props}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-purple-500/10 rounded-3xl" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Glow effect */}
      {glow && (
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-lg opacity-20 -z-10" />
      )}
    </motion.div>
  );
}
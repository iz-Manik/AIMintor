import React from 'react';
import { motion } from 'framer-motion';

const FloatingElement = ({ children, delay = 0, duration = 20, className = "" }) => (
  <motion.div
    className={`absolute pointer-events-none ${className}`}
    initial={{
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      rotate: 0,
      scale: 0.5,
      opacity: 0.3
    }}
    animate={{
      x: [
        Math.random() * window.innerWidth,
        Math.random() * window.innerWidth,
        Math.random() * window.innerWidth
      ],
      y: [
        Math.random() * window.innerHeight,
        Math.random() * window.innerHeight,
        Math.random() * window.innerHeight
      ],
      rotate: [0, 360, 720],
      scale: [0.5, 1, 0.5],
      opacity: [0.3, 0.6, 0.3]
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "linear"
    }}
  >
    {children}
  </motion.div>
);

export default function FloatingElements() {
  const elements = [
    { emoji: '✨', size: 'text-4xl', count: 8 },
    { emoji: '🌟', size: 'text-3xl', count: 6 },
    { emoji: '💫', size: 'text-5xl', count: 4 },
    { emoji: '🌙', size: 'text-6xl', count: 3 },
    { emoji: '🪐', size: 'text-4xl', count: 5 },
    { emoji: '🌠', size: 'text-3xl', count: 7 }
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -2 }}>
      {elements.map((element, elementIndex) =>
        Array.from({ length: element.count }, (_, i) => (
          <FloatingElement
            key={`${elementIndex}-${i}`}
            delay={i * 2 + elementIndex}
            duration={15 + Math.random() * 10}
            className={element.size}
          >
            <div className="filter drop-shadow-lg">
              {element.emoji}
            </div>
          </FloatingElement>
        ))
      )}

      {/* Geometric shapes */}
      {Array.from({ length: 12 }, (_, i) => (
        <FloatingElement
          key={`shape-${i}`}
          delay={i * 1.5}
          duration={25 + Math.random() * 15}
          className="w-16 h-16"
        >
          <div className={`w-full h-full bg-gradient-to-br ${
            ['from-purple-500/20 to-pink-500/20', 'from-blue-500/20 to-indigo-500/20', 'from-pink-500/20 to-purple-500/20'][i % 3]
          } ${
            ['rounded-full', 'rounded-lg rotate-45', 'rounded-none rotate-12'][i % 3]
          } backdrop-blur-sm border border-white/10 shadow-lg`} />
        </FloatingElement>
      ))}
    </div>
  );
}
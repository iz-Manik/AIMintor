import React from 'react';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

const EnhancedVibeCard = ({
  vibe,
  index,
  onClick,
  onLike,
  onShare,
  hasLiked,
  hasShared
}) => {
  const safeVibe = {
    id: vibe?.id?.toString() || `unknown-id-${Date.now()}`,
    content: vibe?.content?.toString() || 'No content available',
    timestamp: vibe?.timestamp || new Date().toISOString(),
    likes: vibe?.likes || 0,
    shares: vibe?.shares || 0,
    color: vibe?.color || 'from-purple-400 to-blue-500',
    emoji: vibe?.emoji || '🌟'
  };

  const parseTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return new Date().toLocaleDateString('en-US');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: -15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{
        y: -10,
        rotateX: 5,
        rotateY: 5,
        scale: 1.02
      }}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <GlassCard
        className="cursor-pointer min-h-[350px] flex flex-col p-6 group overflow-hidden"
        onClick={onClick}
        glow={true}
      >
        {/* Animated background gradient */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${safeVibe.color} opacity-20 group-hover:opacity-30 rounded-3xl`}
          animate={{
            background: [
              `linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))`,
              `linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))`,
              `linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(236, 72, 153, 0.2))`
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Floating emoji with 3D effect */}
        <motion.div
          className="text-7xl mb-6 text-center relative z-10"
          animate={{
            rotateY: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{
            rotateY: { duration: 10, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
          }}
          style={{
            filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
            transformStyle: 'preserve-3d'
          }}
        >
          {safeVibe.emoji}
        </motion.div>

        {/* Content with glass morphism */}
        <div className="relative z-10 flex-grow">
          <motion.p
            className="text-white/90 text-lg italic mb-4 flex-grow line-clamp-4 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            "{safeVibe.content}"
          </motion.p>

          <div className="text-xs text-white/60 mb-4 font-medium">
            {parseTimestamp(safeVibe.timestamp)}
          </div>
        </div>

        {/* Enhanced interaction buttons */}
        <div className="flex justify-between items-center mt-auto relative z-10">
          <div className="flex gap-3">
            <motion.button
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all backdrop-blur-sm ${
                hasLiked
                  ? "bg-pink-600/50 text-white shadow-lg shadow-pink-500/25"
                  : "bg-white/10 hover:bg-pink-500/30 text-white/80 hover:text-white border border-white/20"
              }`}
              whileHover={{ scale: hasLiked ? 1 : 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasLiked && onLike) onLike();
              }}
              disabled={hasLiked}
            >
              <motion.span
                animate={hasLiked ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                ♥️
              </motion.span>
              {safeVibe.likes}
            </motion.button>

            <motion.button
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all backdrop-blur-sm ${
                hasShared
                  ? "bg-blue-600/50 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white/10 hover:bg-blue-500/30 text-white/80 hover:text-white border border-white/20"
              }`}
              whileHover={{ scale: hasShared ? 1 : 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasShared && onShare) onShare();
              }}
              disabled={hasShared}
            >
              <motion.span
                animate={hasShared ? { rotate: [0, 360] } : {}}
                transition={{ duration: 0.5 }}
              >
                ↗️
              </motion.span>
              {safeVibe.shares}
            </motion.button>
          </div>

          {/* Enhanced ID badge */}
          <motion.div
            className="text-xs bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full truncate max-w-[100px] border border-white/10"
            title={`Vibe ID: ${safeVibe.id}`}
            whileHover={{ scale: 1.05 }}
          >
            #{safeVibe.id.slice(0, 6)}
          </motion.div>
        </div>

        {/* Particle effects on hover */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          {Array.from({ length: 6 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
              }}
              animate={{
                y: [-10, -30, -10],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default EnhancedVibeCard;

// import React from 'react';
// import { motion } from 'framer-motion';

// const EnhancedVibeCard = ({ vibe, index, onClick, onLike, onShare }) => {
//   // Robust fallback handling with improved timestamp conversion
//   const safeVibe = {
//     id: vibe?.id?.toString() || `unknown-${Date.now()}-${index}`,
//     color: vibe?.color || "from-purple-400 to-blue-500",
//     emoji: vibe?.emoji || "🌟",
//     content: vibe?.content?.toString() || "No content available",
//     timestamp: vibe?.timestamp
//       ? new Date(vibe.timestamp).toLocaleDateString('en-US', {
//           month: 'short',
//           day: 'numeric',
//           year: 'numeric',
//           hour: '2-digit',
//           minute: '2-digit'
//         })
//       : new Date().toLocaleDateString(),
//     likes: Number(vibe?.likes) || 0,
//     shares: Number(vibe?.shares) || 0
//   };

//   // Debug log to see what the card receives
//   console.log(`Rendering VibeCard #${index}:`, safeVibe);

//   return (
//     <motion.div
//       className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 cursor-pointer border border-purple-500/30 overflow-hidden"
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ delay: index * 0.1 }}
//       whileHover={{ y: -10, scale: 1.03 }}
//       whileTap={{ scale: 0.98 }}
//       onClick={() => onClick && onClick(vibe)}
//     >
//       {/* Animated background gradient */}
//       <div className={`absolute inset-0 bg-gradient-to-br ${safeVibe.color} opacity-20 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl`} />

//       {/* Glowing effect */}
//       <div className={`absolute -inset-1 bg-gradient-to-r ${safeVibe.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-500`} />

//       {/* Floating emoji */}
//       <motion.div
//         className="absolute top-4 right-4 text-3xl z-10"
//         animate={{ rotate: [0, 5, -5, 0] }}
//         transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
//       >
//         {safeVibe.emoji}
//       </motion.div>

//       <div className="relative z-10">
//         <div className="flex items-start gap-3 mb-4">
//           <div className={`w-10 h-10 bg-gradient-to-r ${safeVibe.color} rounded-xl flex items-center justify-center shadow-lg`}>
//             <span className="text-white font-bold text-xs">
//               #{index + 1}
//             </span>
//           </div>
//           <div>
//             <h3 className="font-bold text-gray-100 group-hover:text-white transition-colors">
//               AI-Generated Vibe
//             </h3>
//             <p className="text-xs text-purple-300 mt-1">
//               {safeVibe.timestamp}
//             </p>
//           </div>
//         </div>

//         <p className="text-gray-200 text-sm leading-relaxed mb-4 line-clamp-4 group-hover:text-white transition-colors italic">
//           "{safeVibe.content}"
//         </p>

//         <div className="flex justify-between items-center">
//           <div className="flex gap-2">
//             <button
//               className="px-3 py-1 rounded-full bg-purple-900/50 hover:bg-purple-800 transition-colors text-purple-200 text-xs flex items-center gap-1"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onLike && onLike();
//               }}
//             >
//               ♥️ {safeVibe.likes}
//             </button>
//             <button
//               className="px-3 py-1 rounded-full bg-blue-900/50 hover:bg-blue-800 transition-colors text-blue-200 text-xs flex items-center gap-1"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onShare && onShare();
//               }}
//             >
//               ↗️ Share
//             </button>
//           </div>

//           <span className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-full font-medium">
//             +10 $VIBE
//           </span>
//         </div>
//       </div>

//       {/* Unique identifier */}
//       <div className="absolute bottom-2 right-2 text-gray-500 text-xs opacity-70">
//         ID: {safeVibe.id.toString().substring(0, 6)}...
//       </div>
//     </motion.div>
//   );
// };

// export default EnhancedVibeCard;

import React from 'react';
import { motion } from 'framer-motion';

const EnhancedVibeCard = ({
  vibe,
  index,
  onClick,
  onLike,
  onShare,
  hasLiked,
  hasShared
}) => {
  // Safely handle missing or incomplete vibe data
  const safeVibe = {
    id: vibe?.id?.toString() || `unknown-id-${Date.now()}`,
    content: vibe?.content?.toString() || 'No content available',
    timestamp: vibe?.timestamp || new Date().toISOString(),
    likes: vibe?.likes || 0,
    shares: vibe?.shares || 0,
    color: vibe?.color || 'from-purple-400 to-blue-500',
    emoji: vibe?.emoji || '🌟'
  };

  // Safely parse the timestamp
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
      className={`bg-gradient-to-br ${safeVibe.color} rounded-2xl p-6 shadow-xl cursor-pointer min-h-[300px] flex flex-col relative z-30`}
      whileHover={{ y: -10, scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      style={{ position: 'relative' }} // Ensure positioning context
    >
      <div className="text-6xl mb-4 text-center">{safeVibe.emoji}</div>
      <p className="text-white/90 text-lg italic mb-4 flex-grow line-clamp-3">
        "{safeVibe.content}"
      </p>
      <div className="text-xs text-white/70 mb-2">
        {parseTimestamp(safeVibe.timestamp)}
      </div>

      <div className="flex justify-between items-center mt-auto">
        <div className="flex gap-2">
          <motion.button
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-lg transition-colors ${
              hasLiked
                ? "bg-pink-600/50 text-white"
                : "bg-white/20 hover:bg-pink-500/40"
            }`}
            whileHover={{ scale: hasLiked ? 1 : 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasLiked && onLike) onLike();
            }}
            disabled={hasLiked}
          >
            ♥️ {safeVibe.likes}
          </motion.button>

          <motion.button
            className={`flex items-center gap-1 text-sm px-3 py-1 rounded-lg transition-colors ${
              hasShared
                ? "bg-blue-600/50 text-white"
                : "bg-white/20 hover:bg-blue-500/40"
            }`}
            whileHover={{ scale: hasShared ? 1 : 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!hasShared && onShare) onShare();
            }}
            disabled={hasShared}
          >
            ↗️ {safeVibe.shares}
          </motion.button>
        </div>
        <div
          className="text-xs bg-black/30 px-2 py-1 rounded-full truncate max-w-[80px]"
          title={`Vibe ID: ${safeVibe.id}`}
        >
          #{safeVibe.id.slice(0, 6)}
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedVibeCard;
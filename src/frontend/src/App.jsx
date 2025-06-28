import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthClient } from '@dfinity/auth-client';
import { backend } from "declarations/index.js";
import { generateVibe, freeAIProviders } from './ai';
import EnhancedVibeCard from './components/VibeCard';
import Footer from './components/Footer';
import Background3D from './components/Background3D';
import ParticleField from './components/ParticleField';
import FloatingElements from './components/FloatingElements';
import GlassCard from './components/GlassCard';
import AnimatedButton from './components/AnimatedButton';
import './index.css';
import Confetti from 'react-confetti';

// Constants
const MINT_COST = 5;
const INITIAL_BALANCE = 100;
const EXAMPLE_MINTS = [
  {
    id: 'ex1',
    content: "A surreal sunset over digital mountains where data rivers flow through silicon valleys",
    timestamp: "2025-06-10T14:30:00Z",
    likes: 24,
    shares: 8
  },
  {
    id: 'ex2',
    content: "Neon butterflies emerging from quantum foam in a cyberpunk garden of light",
    timestamp: "2025-06-15T09:15:00Z",
    likes: 42,
    shares: 15
  },
  {
    id: 'ex3',
    content: "Floating islands of crystal code drifting through a nebula of pure imagination",
    timestamp: "2025-06-20T18:45:00Z",
    likes: 31,
    shares: 11
  }
];

// Helper to shorten principal IDs
const shortenPrincipal = (principal) => {
  if (!principal) return '';
  const str = principal.toString();
  if (str === '2vxsx-fae' || str.startsWith('2vxsx-fae')) {
    return 'wdymw...dae';
  }
  return str.length > 10
    ? `${str.substring(0, 5)}...${str.substring(str.length - 3)}`
    : str;
};

// Helper to get vibe content by ID
const getVibeContent = (vibeId, vibes) => {
  const userVibe = vibes.find(v => v.id === vibeId);
  if (userVibe) return userVibe.content;

  const exampleVibe = EXAMPLE_MINTS.find(v => v.id === vibeId);
  if (exampleVibe) return exampleVibe.content;

  return `Vibe ID: ${vibeId}`;
};

// Convert BigInt to Number safely
const bigIntToNumber = (value) => {
  if (typeof value === 'bigint') {
    return Number(value.toString());
  }
  return value;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState('');
  const [vibeInput, setVibeInput] = useState('');
  const [vibes, setVibes] = useState([]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [reputation, setReputation] = useState(1.0);
  const [aiProvider, setAiProvider] = useState('GEMINI_FLASH');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [authClient, setAuthClient] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [leaderboard, setLeaderboard] = useState({
    top_creators: [],
    most_liked: [],
    most_shared: []
  });
  const [userEngagements, setUserEngagements] = useState({
    liked: new Set(),
    shared: new Set()
  });

  // Track window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    initAuthClient();
  }, []);

  // Load engagements from localStorage
  useEffect(() => {
    if (!principal) return;

    const storedEngagements = localStorage.getItem(`engagements_${principal}`);
    if (storedEngagements) {
      const parsed = JSON.parse(storedEngagements);
      setUserEngagements({
        liked: new Set(parsed.liked),
        shared: new Set(parsed.shared)
      });
    }
  }, [principal]);

  // Save engagements to localStorage
  useEffect(() => {
    if (!principal) return;

    localStorage.setItem(`engagements_${principal}`, JSON.stringify({
      liked: Array.from(userEngagements.liked),
      shared: Array.from(userEngagements.shared)
    }));
  }, [userEngagements, principal]);

  const initAuthClient = async () => {
    const client = await AuthClient.create();
    setAuthClient(client);
    const isAuth = await client.isAuthenticated();
    setIsAuthenticated(isAuth);
    if (isAuth) {
      const identity = client.getIdentity();
      setPrincipal(identity.getPrincipal().toString());
      loadData();
    }
  };

  const login = async () => {
    if (!authClient) return;

    await authClient.login({
      identityProvider: "https://identity.ic0.app",
      onSuccess: async () => {
        const identity = authClient.getIdentity();
        setIsAuthenticated(true);
        setPrincipal(identity.getPrincipal().toString());
        await loadData();
      }
    });
  };

  const logout = async () => {
    if (authClient) {
      await authClient.logout();
      setIsAuthenticated(false);
      setPrincipal('');
      setVibes([]);
      setBalance(INITIAL_BALANCE);
      setReputation(1.0);
      setUserEngagements({ liked: new Set(), shared: new Set() });

      // Clear local storage
      if (principal) {
        localStorage.removeItem(`engagements_${principal}`);
      }
    }
  };

  const GRADIENT_CLASSES = [
    "from-purple-400 to-blue-500",
    "from-pink-400 to-purple-500",
    "from-yellow-400 to-orange-500",
    "from-green-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-red-400 to-pink-500"
  ];

  const EMOJIS = ["🌟", "✨", "💫", "🌙", "🪐", "🌠", "🔥", "💧", "🌊", "🍃"];

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);

      const [backendVibes, myBalance, myReputation, leaderboardData] = await Promise.all([
        backend.get_my_vibes(),
        backend.get_my_balance(),
        backend.get_my_reputation(),
        backend.get_leaderboard()
      ]);

      // Process vibes - convert BigInt timestamp to milliseconds
      const formattedVibes = (backendVibes || []).map(vibe => {
        // Convert BigInt timestamp to milliseconds
        let timestampMs;
        if (typeof vibe.timestamp === 'bigint') {
          timestampMs = Number(vibe.timestamp.toString()) * 1000;
        } else {
          timestampMs = bigIntToNumber(vibe.timestamp) * 1000;
        }

        // Create a hash from the ID for consistent color/emoji assignment
        const hash = Array.from(vibe.id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colorIndex = Math.abs(hash) % GRADIENT_CLASSES.length;
        const emojiIndex = Math.abs(hash) % EMOJIS.length;

        // Create a new object with ALL necessary properties
        return {
          id: vibe.id.toString(), // Ensure ID is converted to string
          creator: vibe.creator.toString(),
          content: vibe.content.toString(),
          timestamp: new Date(timestampMs).toISOString(),
          likes: bigIntToNumber(vibe.likes),
          shares: bigIntToNumber(vibe.shares),
          color: GRADIENT_CLASSES[colorIndex],
          emoji: EMOJIS[emojiIndex]
        };
      });

      // Process leaderboard data - REMOVED ANONYMOUS FILTER
      const topCreators = leaderboardData.top_creators
        .map(([creator, score]) => [creator.toString(), bigIntToNumber(score)])
        .sort((a, b) => b[1] - a[1]); // Sort by score descending

      // Convert IDs to strings for most liked and most shared
      const processedLeaderboard = {
        top_creators: topCreators,
        most_liked: leaderboardData.most_liked.map(([id, likes]) => [id.toString(), bigIntToNumber(likes)]),
        most_shared: leaderboardData.most_shared.map(([id, shares]) => [id.toString(), bigIntToNumber(shares)])
      };

      console.log("Leaderboard data:", processedLeaderboard);
      console.log("Formatted vibes:", formattedVibes);

      setVibes(formattedVibes);
      setBalance(bigIntToNumber(myBalance));
      setReputation(Number(myReputation));
      setLeaderboard(processedLeaderboard);

    } catch (error) {
      console.error("Failed to load data:", error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, principal]);

  const mintVibe = async () => {
    if (!vibeInput) return;

    // Check balance
    if (balance < MINT_COST) {
      alert(`You need at least ${MINT_COST} $VBT to mint a vibe! Engage with others to earn tokens.`);
      return;
    }

    const provider = freeAIProviders[aiProvider];
    if (!apiKey.trim() && provider.requiresKey) {
      alert(`Please enter a valid API key for ${provider.name}`);
      return; // Exit early without setting loading state
    }
    setIsLoading(true);

    try {
      const aiPrompt = `Create a poetic NFT description for: ${vibeInput}`;
      const generatedVibe = await generateVibe(aiPrompt, apiKey, aiProvider);

      if (generatedVibe.includes("Failed to generate vibe") || generatedVibe.includes("ERROR")) {
        throw new Error(generatedVibe);
      }
      // Mint the vibe on the blockchain
      const vibeId = await backend.mint_vibe(generatedVibe);
      console.log("Minted vibe ID:", vibeId);

      setVibeInput('');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      alert('Vibe minted successfully!');

      // Reload data from blockchain
      await loadData();
    } catch (error) {
      console.error("Minting failed:", error);
      alert(`Minting failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const likeVibe = async (vibeId) => {
    // Convert ID to string if it's not already
    const idStr = vibeId.toString();
    if (userEngagements.liked.has(idStr)) {
      alert("You've already liked this vibe!");
      return;
    }

    try {
      // Ensure we pass the original ID type to backend
      const newLikes = await backend.like_vibe(vibeId);
      const likesNum = bigIntToNumber(newLikes);

      // Update local state using string ID
      setVibes(prev => prev.map(v =>
        v.id === idStr ? {...v, likes: likesNum} : v
      ));

      // Update engagements with string ID
      setUserEngagements(prev => ({
        ...prev,
        liked: new Set([...prev.liked, idStr])
      }));

      // Refresh balance and reputation
      const [newBalance, newRep] = await Promise.all([
        backend.get_my_balance(),
        backend.get_my_reputation()
      ]);

      setBalance(bigIntToNumber(newBalance));
      setReputation(Number(newRep));

      return likesNum;
    } catch (error) {
      console.error("Liking failed:", error);
      return 0;
    }
  };

  const shareVibe = async (vibeId) => {
    // Convert ID to string if it's not already
    const idStr = vibeId.toString();

    if (userEngagements.shared.has(idStr)) {
      alert("You've already shared this vibe!");
      return;
    }

    try {
      // Ensure we pass the original ID type to backend
      const newShares = await backend.share_vibe(vibeId);
      const sharesNum = bigIntToNumber(newShares);

      // Update local state using string ID
      setVibes(prev => prev.map(v =>
        v.id === idStr ? {...v, shares: sharesNum} : v
      ));

      // Update engagements with string ID
      setUserEngagements(prev => ({
        ...prev,
        shared: new Set([...prev.shared, idStr])
      }));

      // Refresh balance and reputation
      const [newBalance, newRep] = await Promise.all([
        backend.get_my_balance(),
        backend.get_my_reputation()
      ]);

      setBalance(bigIntToNumber(newBalance));
      setReputation(Number(newRep));

      // Copy to clipboard
      const vibeContent = vibes.find(v => v.id === vibeId)?.content || "";
      navigator.clipboard.writeText(vibeContent);
      alert("Vibe copied to clipboard!");

      return sharesNum;
    } catch (error) {
      console.error("Sharing failed:", error);
      return 0;
    }
  };

  const shareVibeSocial = async (vibe) => {
    try {
      await navigator.share({
        title: `My Vibe: ${vibeInput || 'AI-Generated Art'}`,
        text: vibe.content,
        url: window.location.href,
      });
    } catch (err) {
      console.log('Sharing failed:', err);
      alert('Sharing not supported. Copied to clipboard instead.');
      navigator.clipboard.writeText(vibe.content);
    }
  };

  const resetAccount = async () => {
    if (window.confirm("Are you sure you want to reset your account? This will delete all your vibes and tokens!")) {
      setIsLoading(true);
      try {
        await backend.reset_account();
        setVibes([]);
        setBalance(INITIAL_BALANCE);
        setReputation(1.0);
        setUserEngagements({ liked: new Set(), shared: new Set() });

        // Clear local storage
        if (principal) {
          localStorage.removeItem(`engagements_${principal}`);
        }

        // Reset leaderboard to initial state
        setLeaderboard({
          top_creators: [],
          most_liked: [],
          most_shared: []
        });

        alert("Account reset successfully!");
      } catch (error) {
        console.error("Reset failed:", error);
        alert(`Reset failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } }
  };

  const slideUp = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const staggerChildren = {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* 3D Background */}
        <Background3D />
        <ParticleField />
        <FloatingElements />

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: -15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, type: "spring", stiffness: 100 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <GlassCard className="max-w-4xl w-full p-12" glow={true}>
              <div className="text-center">
                <motion.div
                  className="relative mb-12 mx-auto w-48 h-48"
                  initial={{ scale: 0.5, rotateY: -180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                    delay: 0.3
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 relative overflow-hidden">
                    <span className="text-8xl relative z-10">🌌</span>

                    {/* Animated rings */}
                    <motion.div
                      className="absolute inset-0 border-4 border-white/20 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-4 border-2 border-white/10 rounded-full"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    />
                  </div>

                  {/* Floating particles around logo */}
                  {Array.from({ length: 8 }, (_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-white rounded-full"
                      style={{
                        left: `${50 + 40 * Math.cos(i * Math.PI / 4)}%`,
                        top: `${50 + 40 * Math.sin(i * Math.PI / 4)}%`,
                      }}
                      animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </motion.div>

                <motion.h1
                  className="text-6xl md:text-8xl font-black text-white mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                >
                  AIMintor
                </motion.h1>

                <motion.p
                  className="text-white/80 mb-12 text-xl md:text-2xl font-medium max-w-3xl mx-auto leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Transform your emotions into unique AI-generated NFTs on the Internet Computer.
                  <br />
                  <span className="text-purple-300">Experience the future of decentralized creativity.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                >
                  <AnimatedButton
                    onClick={login}
                    size="xl"
                    className="mb-8 min-w-[300px]"
                  >
                    <span className="text-3xl mr-3">🔐</span>
                    Connect Internet Identity
                  </AnimatedButton>
                </motion.div>

                {/* Enhanced feature showcase */}
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                >
                  {[
                    { icon: '🤖', title: 'AI-Powered', desc: 'Advanced AI generates unique NFT descriptions' },
                    { icon: '🪙', title: 'Earn Tokens', desc: 'Get rewarded for creating and engaging' },
                    { icon: '🌐', title: 'Decentralized', desc: 'Built on Internet Computer Protocol' }
                  ].map((feature, i) => (
                    <motion.div
                      key={i}
                      className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 + i * 0.2 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                    >
                      <div className="text-4xl mb-4">{feature.icon}</div>
                      <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                      <p className="text-white/70 text-sm">{feature.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Example gallery with enhanced animations */}
                <motion.div
                  className="mt-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  <h3 className="font-bold text-white text-2xl mb-6 flex items-center justify-center gap-3">
                    <span className="text-3xl">✨</span>
                    Inspiration Gallery
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {EXAMPLE_MINTS.map((vibe, index) => (
                      <motion.div
                        key={vibe.id}
                        className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 group"
                        initial={{ opacity: 0, y: 30, rotateX: -10 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ delay: 1.7 + index * 0.2 }}
                        whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <div className="text-xs text-purple-300 mb-3 font-medium">
                          {new Date(vibe.timestamp).toLocaleDateString()}
                        </div>
                        <p className="text-white/90 text-sm italic leading-relaxed">"{vibe.content}"</p>
                        <div className="flex gap-3 mt-4 text-xs">
                          <span className="text-pink-400">♥️ {vibe.likes}</span>
                          <span className="text-blue-400">↗️ {vibe.shares}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced 3D Background */}
      <Background3D />
      <ParticleField />
      <FloatingElements />

      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.1}
        />
      )}

      {/* Enhanced Header */}
      <motion.header
        className="relative z-50 backdrop-blur-2xl bg-black/20 border-b border-white/10 shadow-2xl sticky top-0"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
      >
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            <motion.div
              className="flex items-center gap-4"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div
                className="relative"
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              >
                <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 p-4 rounded-2xl shadow-2xl">
                  <span className="text-4xl">✨</span>
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-40 animate-pulse" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                  AIMintor
                </h1>
                <p className="text-gray-300 text-sm font-medium">AI-Powered NFT Minting</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-xl p-3">
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="bg-transparent text-white text-sm appearance-none cursor-pointer pr-8 outline-none"
                >
                  {Object.entries(freeAIProviders).map(([key, provider]) => (
                    <option key={key} value={key} className="bg-gray-800">
                      {provider.name} {provider.free ? "(Free)" : "(Premium)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-2">
                <span className="text-gray-400 text-sm">ID: </span>
                <span className="font-mono font-medium text-white text-sm">
                  {shortenPrincipal(principal)}
                </span>
              </div>

              <AnimatedButton
                onClick={resetAccount}
                variant="danger"
                size="sm"
              >
                Reset Account
              </AnimatedButton>

              <AnimatedButton
                onClick={logout}
                variant="ghost"
                size="sm"
              >
                Logout
              </AnimatedButton>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 container mx-auto p-6 max-w-7xl pt-12">
        {/* Enhanced Balance & Mint Section */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
              <div className="space-y-4">
                <motion.h2
                  className="text-3xl font-bold text-white flex items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.div
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-2xl shadow-2xl"
                    animate={{
                      rotate: [0, 10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <span className="text-3xl">🪙</span>
                  </motion.div>
                  <div>
                    Token Balance:
                    <motion.span
                      className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent ml-3 font-black text-4xl"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {balance.toString()} $VBT
                    </motion.span>
                  </div>
                </motion.h2>

                <div className="flex items-center gap-6 ml-20 text-lg">
                  <div className="text-gray-300">
                    Reputation: <span className="text-green-400 font-bold">{reputation.toFixed(2)}x</span>
                  </div>
                  <div className="text-gray-300">
                    Mint Cost: <span className="text-yellow-400 font-bold">{MINT_COST} $VBT</span>
                  </div>
                </div>

                <p className="text-gray-400 ml-20 text-base">
                  Earn tokens by engaging: ♥️ Like (+1 $VBT) • ↗️ Share (+2 $VBT)
                </p>
              </div>

              <AnimatedButton
                onClick={loadData}
                disabled={isLoading}
                variant="secondary"
                loading={isLoading}
              >
                Refresh Data
              </AnimatedButton>
            </div>

            {/* Enhanced Mint Interface */}
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-2xl p-8">
              <div className="flex flex-col lg:flex-row gap-6 mb-8">
                <div className="flex-grow relative">
                  <motion.input
                    type="text"
                    value={vibeInput}
                    onChange={(e) => setVibeInput(e.target.value)}
                    placeholder="Describe your current vibe, emotion, or creative vision..."
                    className="w-full px-8 py-6 bg-gray-700/80 backdrop-blur-sm text-white rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-xl shadow-inner transition-all duration-300 placeholder:text-gray-400 border border-gray-600"
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && mintVibe()}
                    disabled={isLoading}
                    whileFocus={{ scale: 1.02 }}
                  />
                  <motion.div
                    className="absolute right-6 top-1/2 transform -translate-y-1/2 text-purple-400 text-2xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✨
                  </motion.div>
                </div>

                <AnimatedButton
                  onClick={mintVibe}
                  disabled={isLoading || !vibeInput}
                  loading={isLoading}
                  size="lg"
                  className="min-w-[250px]"
                >
                  {!isLoading && <span className="text-3xl mr-3">🎨</span>}
                  {isLoading ? 'Creating Magic...' : 'Mint Vibe'}
                </AnimatedButton>
              </div>

              {/* Enhanced AI Configuration */}
              <div className="bg-gray-700/60 backdrop-blur-sm border border-gray-600 rounded-xl p-6">
                <h3 className="font-bold text-white text-xl mb-6 flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    ⚙️
                  </motion.div>
                  AI Configuration
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      API Key
                      {aiProvider === 'GEMINI_FLASH' && (
                        <span className="text-xs text-purple-400 ml-2">
                          (Get free key at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-300">Google AI Studio</a>)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={`Enter your ${freeAIProviders[aiProvider]?.name} API key`}
                        className="w-full p-4 bg-gray-600/80 text-white border border-gray-500 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none backdrop-blur-sm transition-all"
                      />
                      {apiKey && (
                        <motion.button
                          onClick={() => setApiKey('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          ✕
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-300 bg-gray-600/40 p-4 rounded-xl">
                    <p className="mb-2">
                      {aiProvider === 'GEMINI_FLASH'
                        ? "🚀 Gemini Flash: 60 free requests/minute - perfect for testing!"
                        : aiProvider === 'OPENAI_GPT4'
                          ? "💎 GPT-4 Turbo: Premium quality, requires paid OpenAI account"
                          : "🤗 Hugging Face: Free access, may be slower during peak times"}
                    </p>
                    <p>Need help? <a href="#" className="text-purple-400 hover:underline">View setup guide →</a></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Leaderboard */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-4">
              <motion.div
                className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-2xl shadow-2xl"
                animate={{
                  rotateY: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotateY: { duration: 6, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
                }}
              >
                🏆
              </motion.div>
              Leaderboard
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Top Creators */}
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
              >
                <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-2xl p-6 h-full">
                  <h3 className="font-bold text-xl text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">👑</span>
                    Top Creators
                  </h3>
                  <div className="space-y-4">
                    {leaderboard.top_creators.slice(0, 3).map(([creator, score], i) => (
                      <motion.div
                        key={i}
                        className="flex items-center justify-between py-3 border-b border-gray-600 last:border-b-0"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                            i === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            i === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            'bg-gradient-to-r from-orange-600 to-red-600'
                          }`}>
                            {i + 1}
                          </div>
                          <span className="font-medium text-white">
                            {shortenPrincipal(creator)}
                          </span>
                        </div>
                        <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold text-lg">
                          {score} $VBT
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Most Liked */}
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-2xl p-6 h-full">
                  <h3 className="font-bold text-xl text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">❤️</span>
                    Most Liked
                  </h3>
                  <div className="space-y-4">
                    {leaderboard.most_liked.slice(0, 3).map(([vibeId, likes], i) => (
                      <motion.div
                        key={i}
                        className="py-3 border-b border-gray-600 last:border-b-0"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.2 }}
                      >
                        <div className="flex items-center gap-4 mb-2">
                          <div className="bg-gradient-to-r from-pink-500 to-red-500 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {i + 1}
                          </div>
                          <span className="font-medium text-pink-300 text-lg">
                            {likes} ♥️
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm italic truncate leading-relaxed">
                          "{getVibeContent(vibeId, vibes)}"
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Most Shared */}
              <motion.div
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
              >
                <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-2xl p-6 h-full">
                  <h3 className="font-bold text-xl text-white mb-6 flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    Most Shared
                  </h3>
                  <div className="space-y-4">
                    {leaderboard.most_shared.slice(0, 3).map(([vibeId, shares], i) => (
                      <motion.div
                        key={i}
                        className="py-3 border-b border-gray-600 last:border-b-0"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 + 0.4 }}
                      >
                        <div className="flex items-center gap-4 mb-2">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {i + 1}
                          </div>
                          <span className="font-medium text-blue-300 text-lg">
                            {shares} ↗️
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm italic truncate leading-relaxed">
                          "{getVibeContent(vibeId, vibes)}"
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Vibe Collection */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-700 rounded-3xl p-8 shadow-2xl relative z-20">
            <div className="flex justify-between items-center mb-10">
              <motion.h2
                className="text-3xl font-bold text-white flex items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <motion.div
                  className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-2xl shadow-2xl"
                  animate={{
                    rotate: [0, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <span className="text-3xl">🌟</span>
                </motion.div>
                Your Vibe Collection
              </motion.h2>

              <motion.div
                className="bg-gradient-to-r from-purple-700/80 to-indigo-700/80 text-purple-300 px-6 py-3 rounded-full text-lg font-bold border border-purple-500/50 backdrop-blur-sm"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                {vibes.length} {vibes.length === 1 ? 'NFT' : 'NFTs'}
              </motion.div>
            </div>

            {vibes.length === 0 ? (
              <motion.div
                className="text-center py-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <motion.div
                  className="text-9xl mb-8 text-purple-900/40 mx-auto"
                  animate={{
                    rotate: [0, 5, -5, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  🌫️
                </motion.div>
                <h3 className="text-3xl font-bold text-white mb-6">Your Collection Awaits</h3>
                <p className="text-gray-300 max-w-2xl mx-auto text-xl leading-relaxed mb-12">
                  Transform your thoughts and emotions into unique AI-generated NFTs.
                  Each mint costs {MINT_COST} $VBT tokens and becomes part of your digital legacy.
                </p>

                {/* Enhanced example gallery */}
                <div className="mt-16">
                  <h4 className="text-2xl font-semibold text-white mb-8 flex items-center justify-center gap-3">
                    <span className="text-3xl">✨</span>
                    Inspiration Gallery
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {EXAMPLE_MINTS.map((vibe, index) => (
                      <motion.div
                        key={vibe.id}
                        initial={{ opacity: 0, y: 50, rotateX: -15 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ delay: index * 0.3 + 1 }}
                        whileHover={{ y: -10, rotateX: 5, scale: 1.02 }}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded-2xl p-6 h-full">
                          <div className="text-sm text-purple-400 mb-4 font-medium">
                            {new Date(vibe.timestamp).toLocaleDateString()}
                          </div>
                          <p className="text-gray-300 text-base italic leading-relaxed mb-4">"{vibe.content}"</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-pink-400 flex items-center gap-1">♥️ {vibe.likes}</span>
                            <span className="text-blue-400 flex items-center gap-1">↗️ {vibe.shares}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-30">
                {vibes.map((vibe, index) => (
                  <EnhancedVibeCard
                    key={`${vibe.id}-${index}`}
                    vibe={vibe}
                    index={index}
                    onClick={() => setSelectedVibe(vibe)}
                    onLike={() => likeVibe(vibe.id)}
                    onShare={() => shareVibe(vibe.id)}
                    hasLiked={userEngagements.liked.has(vibe.id)}
                    hasShared={userEngagements.shared.has(vibe.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <Footer/>

      {/* Enhanced Modal */}
      <AnimatePresence>
        {selectedVibe && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotateX: -15 }}
              animate={{ scale: 1, opacity: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0, rotateX: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <GlassCard className="max-w-3xl w-full overflow-hidden" glow={true}>
                <div className="relative">
                  <motion.button
                    onClick={() => setSelectedVibe(null)}
                    className="absolute top-6 right-6 bg-red-500/20 hover:bg-red-600/30 p-3 rounded-full z-10 shadow-lg transition-all backdrop-blur-sm border border-red-500/30"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </motion.button>

                  <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 p-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20" />
                    <div className="relative z-10">
                      <motion.h2
                        className="text-4xl font-bold text-white mb-3"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        Your Minted Vibe
                      </motion.h2>
                      <p className="text-white/80 text-lg">Created on {new Date(selectedVibe.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="p-8">
                    <motion.div
                      className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 backdrop-blur-sm"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <p className="text-gray-300 text-xl italic leading-relaxed">"{selectedVibe.content}"</p>
                    </motion.div>

                    <motion.div
                      className="grid grid-cols-2 gap-6 mb-8"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                    >
                      <GlassCard className="p-6">
                        <p className="text-sm text-gray-400 mb-2">Vibe ID</p>
                        <p className="font-medium text-gray-200 text-lg">#{selectedVibe.id || Date.now()}</p>
                      </GlassCard>

                      <GlassCard className="p-6">
                        <p className="text-sm text-gray-400 mb-2">Creator</p>
                        <p className="font-medium text-purple-400 text-lg">
                          {shortenPrincipal(principal)}
                        </p>
                      </GlassCard>
                    </motion.div>

                    {/* Enhanced engagement stats */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <motion.div
                        className="bg-gradient-to-br from-pink-700/30 to-purple-700/30 p-6 rounded-2xl backdrop-blur-sm border border-pink-500/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-sm text-gray-400 mb-2">Likes</p>
                        <p className="font-bold text-3xl text-pink-400">{selectedVibe.likes || 0}</p>
                      </motion.div>
                      <motion.div
                        className="bg-gradient-to-br from-blue-700/30 to-indigo-700/30 p-6 rounded-2xl backdrop-blur-sm border border-blue-500/20"
                        whileHover={{ scale: 1.02 }}
                      >
                        <p className="text-sm text-gray-400 mb-2">Shares</p>
                        <p className="font-bold text-3xl text-blue-400">{selectedVibe.shares || 0}</p>
                      </motion.div>
                    </div>

                    {/* Enhanced engagement buttons */}
                    <div className="flex gap-6 mb-8 justify-center">
                      <AnimatedButton
                        onClick={() => likeVibe(selectedVibe.id)}
                        disabled={userEngagements.liked.has(selectedVibe.id)}
                        variant={userEngagements.liked.has(selectedVibe.id) ? "ghost" : "primary"}
                        className="min-w-[180px]"
                      >
                        {userEngagements.liked.has(selectedVibe.id) ? "♥️ Liked" : "♥️ Like (+1 $VBT)"}
                      </AnimatedButton>

                      <AnimatedButton
                        onClick={() => shareVibe(selectedVibe.id)}
                        disabled={userEngagements.shared.has(selectedVibe.id)}
                        variant={userEngagements.shared.has(selectedVibe.id) ? "ghost" : "secondary"}
                        className="min-w-[180px]"
                      >
                        {userEngagements.shared.has(selectedVibe.id) ? "↗️ Shared" : "↗️ Share (+2 $VBT)"}
                      </AnimatedButton>
                    </div>

                    <motion.div
                      className="flex gap-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <AnimatedButton
                        onClick={() => shareVibeSocial(selectedVibe)}
                        variant="ghost"
                        className="flex-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Share Externally
                      </AnimatedButton>

                      <AnimatedButton
                        variant="primary"
                        className="flex-1"
                      >
                        View on Explorer
                      </AnimatedButton>
                    </motion.div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

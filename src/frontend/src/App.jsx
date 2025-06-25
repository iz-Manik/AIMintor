import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthClient } from '@dfinity/auth-client';
import { backend } from "declarations/index.js";
import { generateVibe, freeAIProviders } from './ai';
import EnhancedVibeCard from './components/VibeCard';
import Footer from './components/Footer';
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
  return str.length > 10
    ? `${str.substring(0, 5)}...${str.substring(str.length - 3)}`
    : str;
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

      console.log("Backend vibes:", backendVibes);

      // Process vibes - convert BigInt timestamp to milliseconds
      const formattedVibes = (backendVibes || []).map(vibe => {
        // Convert BigInt timestamp to milliseconds
        let timestampMs;
        if (typeof vibe.timestamp === 'bigint') {
          timestampMs = Number(vibe.timestamp.toString()) * 1000;
        } else {
          timestampMs = vibe.timestamp * 1000;
        }

        // Create a hash from the ID for consistent color/emoji assignment
        const hash = Array.from(vibe.id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colorIndex = Math.abs(hash) % GRADIENT_CLASSES.length;
        const emojiIndex = Math.abs(hash) % EMOJIS.length;

        // Create a new object with ALL necessary properties
        return {
          id: vibe.id.toString(),
          creator: vibe.creator.toString(),
          content: vibe.content.toString(),
          timestamp: new Date(timestampMs).toISOString(),
          likes: typeof vibe.likes === 'bigint' ? Number(vibe.likes) : vibe.likes,
          shares: typeof vibe.shares === 'bigint' ? Number(vibe.shares) : vibe.shares,
          color: GRADIENT_CLASSES[colorIndex],
          emoji: EMOJIS[emojiIndex]
        };
      });

      console.log("Formatted vibes:", formattedVibes);

      // Update engagements
      const newEngagements = { liked: new Set(), shared: new Set() };
      formattedVibes.forEach(vibe => {
        if (vibe.likes > 0) newEngagements.liked.add(vibe.id);
        if (vibe.shares > 0) newEngagements.shared.add(vibe.id);
      });

      setVibes(formattedVibes);
      setBalance(Number(myBalance));
      setReputation(Number(myReputation));
      setLeaderboard(leaderboardData);
      setUserEngagements(newEngagements);

    } catch (error) {
      console.error("Failed to load data:", error);
      alert(`Failed to load data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const mintVibe = async () => {
    if (!vibeInput) return;

    // Check balance
    if (balance < MINT_COST) {
      alert(`You need at least ${MINT_COST} $VIBE to mint a vibe! Engage with others to earn tokens.`);
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
    if (userEngagements.liked.has(vibeId)) {
      alert("You've already liked this vibe!");
      return;
    }

    try {
      const newLikes = await backend.like_vibe(vibeId);

      // Update local state
      setVibes(prev => prev.map(v =>
        v.id === vibeId ? {...v, likes: newLikes} : v
      ));

      // Update engagements
      setUserEngagements(prev => ({
        ...prev,
        liked: new Set(prev.liked).add(vibeId)
      }));

      // Refresh balance and reputation
      const [newBalance, newRep] = await Promise.all([
        backend.get_my_balance(),
        backend.get_my_reputation()
      ]);

      setBalance(Number(newBalance));
      setReputation(Number(newRep));

      return newLikes;
    } catch (error) {
      console.error("Liking failed:", error);
      return 0;
    }
  };

  const shareVibe = async (vibeId) => {
    if (userEngagements.shared.has(vibeId)) {
      alert("You've already shared this vibe!");
      return;
    }

    try {
      const newShares = await backend.share_vibe(vibeId);

      // Update local state
      setVibes(prev => prev.map(v =>
        v.id === vibeId ? {...v, shares: newShares} : v
      ));

      // Update engagements
      setUserEngagements(prev => ({
        ...prev,
        shared: new Set(prev.shared).add(vibeId)
      }));

      // Refresh balance and reputation
      const [newBalance, newRep] = await Promise.all([
        backend.get_my_balance(),
        backend.get_my_reputation()
      ]);

      setBalance(Number(newBalance));
      setReputation(Number(newRep));

      // Copy to clipboard
      const vibeContent = vibes.find(v => v.id === vibeId)?.content || "";
      navigator.clipboard.writeText(vibeContent);
      alert("Vibe copied to clipboard!");

      return newShares;
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Floating orbs */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-400/20 to-pink-400/20 blur-xl"
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              x: [0, Math.random() * 100 - 50],
              y: [0, Math.random() * 100 - 50],
            }}
            transition={{
              duration: 15 + Math.random() * 20,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        ))}

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <motion.div
            className="bg-gradient-to-br from-purple-900/60 to-indigo-900/60 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-2xl p-8 max-w-2xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-center">
              <motion.div
                className="relative mb-8 mx-auto w-40 h-40"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50">
                  <span className="text-7xl">🌌</span>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-2xl opacity-30 animate-pulse" />
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl font-black text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                AIMintor
              </motion.h1>

              <motion.p
                className="text-white/80 mb-8 text-lg md:text-xl font-medium max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Transform your emotions into unique AI-generated NFTs on the Internet Computer
              </motion.p>

              <motion.button
                onClick={login}
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-purple-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-purple-500/75 w-full max-w-xs mx-auto overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-3">
                  🔐 Connect Internet Identity
                </span>
              </motion.button>
            </div>

            <motion.div
              className="mt-12 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                Free AI Setup
              </h3>
              <p className="text-white/70 mb-4 text-sm leading-relaxed">
                Experience premium AI generation with your own API keys for enhanced quality and speed.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <motion.a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-medium text-white border border-white/20 flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 group"
                  whileHover={{ y: -5 }}
                >
                  <span className="text-yellow-400 group-hover:scale-110 transition-transform">🤗</span>
                  Hugging Face
                </motion.a>
                <motion.a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 backdrop-blur-sm hover:bg-white/20 px-4 py-3 rounded-xl text-sm font-medium text-white border border-white/20 flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 group"
                  whileHover={{ y: -5 }}
                >
                  <span className="text-purple-400 group-hover:scale-110 transition-transform">⚡</span>
                  OpenRouter
                </motion.a>
              </div>
            </motion.div>

            {/* Example Mints Section */}
            <motion.div
              className="mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                Inspiration Gallery
              </h3>
              <p className="text-white/70 mb-4 text-sm">
                See what others have created with AIMintor
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {EXAMPLE_MINTS.map((vibe, index) => (
                  <motion.div
                    key={vibe.id}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 1.2 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="text-xs text-purple-300 mb-2">
                      {new Date(vibe.timestamp).toLocaleDateString()}
                    </div>
                    <p className="text-white/90 text-sm italic">"{vibe.content}"</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          className="relative z-10 py-6 text-center text-white/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <div className="container mx-auto">
            <p className="mb-2">Deployed on Internet Computer Protocol | AI-Powered Vibe NFTs</p>
            <div className="flex justify-center gap-4">
              <a href="https://forum.dfinity.org/" className="text-purple-300 hover:text-white transition-colors font-medium">Terms</a>
              <a href="#" className="text-purple-300 hover:text-white transition-colors font-medium">Privacy</a>
              <a href="https://github.com/dfinity/ic" className="text-purple-300 hover:text-white transition-colors font-medium">GitHub</a>
              <a href="https://medium.com/@dfinity/a-technical-overview-of-the-internet-computer-f57c62abc20f" className="text-purple-300 hover:text-white transition-colors font-medium">Docs</a>
            </div>
          </div>
        </motion.footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.1}
        />
      )}

      {/* Floating background elements */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-2xl"
          style={{
            width: `${50 + i * 30}px`,
            height: `${50 + i * 30}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
          }}
          transition={{
            duration: 20 + Math.random() * 20,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Header */}
      <motion.header
        className="relative z-50 bg-black/30 backdrop-blur-xl border-b border-white/10 shadow-xl sticky top-0"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 15 }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <motion.div
              className="flex items-center gap-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-3 rounded-2xl shadow-lg">
                  <span className="text-3xl">✨</span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AIMintor
                </h1>
                <p className="text-gray-400 text-sm">AI-Powered NFT Minting</p>
              </div>
            </motion.div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="relative group">
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="bg-gray-800/50 backdrop-blur-sm text-gray-200 px-4 py-2 rounded-xl text-sm appearance-none cursor-pointer pr-8 border border-gray-700 shadow-sm hover:shadow-md transition-all"
                >
                  {Object.entries(freeAIProviders).map(([key, provider]) => (
                    <option key={key} value={key}>
                      {provider.name} {provider.free ? "(Free Tier)" : "(Premium)"}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm bg-gray-800/50 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-gray-700">
                  <span className="text-gray-400">ID: </span>
                  <span className="font-mono font-medium text-gray-200">
                    {shortenPrincipal(principal)}
                  </span>
                </div>

                {/* Added Reset Account Button */}
                <motion.button
                  onClick={resetAccount}
                  className="text-sm bg-red-500/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-xl transition-all border border-red-700/50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reset Account
                </motion.button>

                <motion.button
                  onClick={logout}
                  className="text-sm bg-red-500/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-xl transition-all border border-red-700/50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Logout
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 container mx-auto p-4 max-w-7xl pt-24">
        {/* Balance & Mint Section */}
        <motion.div
          className="bg-gradient-to-br from-gray-800/50 to-purple-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <motion.h2
                className="text-2xl font-bold text-gray-100 flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-2xl shadow-lg"
                  animate={{ rotate: [0, 10, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <span className="text-2xl">🪙</span>
                </motion.div>
                <div>
                  Token Balance:
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent ml-2 font-black">
                    {balance.toString()} $VBT
                  </span>
                </div>
              </motion.h2>
              <div className="flex items-center gap-4 ml-14">
                <div className="text-gray-400 text-sm">
                  Reputation: <span className="text-green-400 font-bold">{reputation.toFixed(2)}x</span>
                </div>
                <div className="text-gray-400 text-sm">
                  Mint Cost: <span className="text-yellow-400 font-bold">{MINT_COST} $VBT</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm ml-14">
                Earn tokens by liking and sharing vibes (♥️: +1 $VBT, ↗️: +2 $VBT)
              </p>
            </div>

            <motion.button
              onClick={loadData}
              disabled={isLoading}
              className="bg-gray-800/50 hover:bg-gray-700/60 px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:shadow-md text-gray-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </motion.button>
          </div>

          {/* Mint Interface */}
          <motion.div
            className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-2xl p-6 border border-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-grow relative">
                <input
                  type="text"
                  value={vibeInput}
                  onChange={(e) => setVibeInput(e.target.value)}
                  placeholder="Describe your current vibe, emotion, or creative vision..."
                  className="w-full px-6 py-4 bg-gray-800/50 backdrop-blur-sm text-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-lg shadow-sm transition-all duration-300 hover:shadow-md placeholder:text-gray-500"
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && mintVibe()}
                  disabled={isLoading}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400 text-xl">
                  ✨
                </div>
              </div>

              <motion.button
                onClick={mintVibe}
                disabled={isLoading || !vibeInput}
                className={`group relative px-8 py-4 rounded-2xl font-bold text-lg transition-all min-w-[200px] flex items-center justify-center gap-3 shadow-lg overflow-hidden ${
                  (!isLoading && vibeInput)
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-500/50"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                }`}
                whileHover={(!isLoading && vibeInput) ? { scale: 1.05 } : {}}
                whileTap={(!isLoading && vibeInput) ? { scale: 0.95 } : {}}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center gap-3">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Magic...
                    </>
                  ) : (
                    <>
                      <span className="text-2xl">🎨</span>
                      Mint Vibe
                    </>
                  )}
                </span>
              </motion.button>
            </div>

            {/* AI Configuration */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="font-bold text-gray-100 text-lg mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                AI Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    API Key
                    {aiProvider === 'GEMINI_FLASH' && (
                      <span className="text-xs text-purple-400 ml-2">
                        (Get free key at <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`Enter your ${freeAIProviders[aiProvider]?.name} API key`}
                      className="w-full p-4 bg-gray-900/50 text-gray-200 border border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none backdrop-blur-sm transition-all"
                    />
                    {apiKey && (
                      <button
                        onClick={() => setApiKey('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  <p className="mb-1">
                    {aiProvider === 'GEMINI_FLASH'
                      ? "Gemini Flash offers 60 free requests per minute - perfect for testing"
                      : aiProvider === 'OPENAI_GPT4'
                        ? "GPT-4 Turbo requires a paid OpenAI account"
                        : "Hugging Face has free access but may be slower"}
                  </p>
                  <p>Need help? <a href="#" className="text-purple-400 hover:underline">View API setup guide</a></p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Leaderboard Section */}
        <motion.div
          className="bg-gradient-to-br from-gray-800/50 to-purple-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <h2 className="text-2xl font-bold text-gray-100 mb-6 flex items-center gap-3">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-2xl shadow-lg">
              🏆
            </div>
            Leaderboard
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Creators */}
            <motion.div
              className="bg-gray-800/30 p-6 rounded-2xl border border-white/10"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <h3 className="font-bold text-lg text-white mb-4">Top Creators</h3>
              <div className="space-y-3">
                {leaderboard.top_creators.slice(0, 3).map(([creator, score], i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center">
                        {i + 1}
                      </div>
                      <span className="font-medium text-gray-200">
                        {shortenPrincipal(creator)}
                      </span>
                    </div>
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">
                      {score} $VBT
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Most Liked */}
            <motion.div
              className="bg-gray-800/30 p-6 rounded-2xl border border-white/10"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
            >
              <h3 className="font-bold text-lg text-white mb-4">Most Liked</h3>
              <div className="space-y-3">
                {leaderboard.most_liked.slice(0, 3).map(([vibeId, likes], i) => {
                  const vibe = [...vibes, ...EXAMPLE_MINTS].find(v => v.id === vibeId);
                  return (
                    <div key={i} className="py-2 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center">
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-200">
                          {likes} ♥️
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm italic truncate">
                        {vibe?.content || "Loading..."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Most Shared */}
            <motion.div
              className="bg-gray-800/30 p-6 rounded-2xl border border-white/10"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <h3 className="font-bold text-lg text-white mb-4">Most Shared</h3>
              <div className="space-y-3">
                {leaderboard.most_shared.slice(0, 3).map(([vibeId, shares], i) => {
                  const vibe = [...vibes, ...EXAMPLE_MINTS].find(v => v.id === vibeId);
                  return (
                    <div key={i} className="py-2 border-b border-white/10">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center">
                          {i + 1}
                        </div>
                        <span className="font-medium text-gray-200">
                          {shares} ↗️
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm italic truncate">
                        {vibe?.content || "Loading..."}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Vibe Collection */}
        <motion.div
          className="bg-gradient-to-br from-gray-800/50 to-purple-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/10 relative z-20" // Added relative and z-20
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex justify-between items-center mb-8">
            <motion.h2
              className="text-2xl font-bold text-gray-100 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <motion.div
                className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-2xl shadow-lg"
                animate={{ rotate: [0, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <span className="text-2xl">🌟</span>
              </motion.div>
              Your Vibe Collection
            </motion.h2>
            <motion.div
              className="bg-gradient-to-r from-purple-700/30 to-indigo-700/30 text-purple-300 px-4 py-2 rounded-full text-sm font-bold border border-purple-500/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 }}
            >
              {vibes.length} {vibes.length === 1 ? 'NFT' : 'NFTs'}
            </motion.div>
          </div>

          {vibes.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <motion.div
                className="text-8xl mb-6 text-purple-900/40 mx-auto w-32 h-32"
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
              <h3 className="text-2xl font-bold text-gray-100 mb-4">Your Collection Awaits</h3>
              <p className="text-gray-400 max-w-md mx-auto text-lg leading-relaxed">
                Transform your thoughts and emotions into unique AI-generated NFTs.
                Each mint costs {MINT_COST} $VIBE tokens and becomes part of your digital legacy.
              </p>

              {/* Show example mints */}
              <div className="mt-12">
                <h4 className="text-lg font-semibold text-gray-200 mb-4">Inspiration Gallery</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {EXAMPLE_MINTS.map((vibe, index) => (
                    <motion.div
                      key={vibe.id}
                      className="bg-gray-800/50 backdrop-blur-sm shadow-sm rounded-xl p-4 border border-gray-700"
                      variants={slideUp}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.2 + 1.2 }}
                      whileHover={{ y: -5 }}
                    >
                      <div className="text-xs text-purple-400 mb-2">
                        {new Date(vibe.timestamp).toLocaleDateString()}
                      </div>
                      <p className="text-gray-300 text-sm italic">"{vibe.content}"</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs text-pink-500">♥️ {vibe.likes}</span>
                        <span className="text-xs text-blue-400">↗️ {vibe.shares}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-30"> {/* Added relative and z-30 */}
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
        </motion.div>
      </main>

      <Footer/>

      {/* Enhanced Modal */}
      <AnimatePresence>
        {selectedVibe && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-gray-800 to-purple-900/80 backdrop-blur-2xl rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-white/10"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="relative">
                <motion.button
                  onClick={() => setSelectedVibe(null)}
                  className="absolute top-6 right-6 bg-gray-800/80 hover:bg-gray-700 p-3 rounded-full z-10 shadow-lg transition-all"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>

                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20" />
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2">Your Minted Vibe</h2>
                    <p className="text-white/80">Created on {new Date(selectedVibe.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="p-6">
                  <motion.div
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-gray-300 text-lg italic">"{selectedVibe.content}"</p>
                  </motion.div>

                  <motion.div
                    className="grid grid-cols-2 gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Vibe ID</p>
                      <p className="font-medium text-gray-200">#{selectedVibe.id || Date.now()}</p>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Creator</p>
                      <p className="font-medium text-purple-400">
                        {shortenPrincipal(principal)}
                      </p>
                    </div>
                  </motion.div>

                  {/* Engagement Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-gradient-to-br from-pink-700/30 to-purple-700/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Likes</p>
                      <p className="font-bold text-2xl text-pink-400">{selectedVibe.likes || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-700/30 to-indigo-700/30 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Shares</p>
                      <p className="font-bold text-2xl text-blue-400">{selectedVibe.shares || 0}</p>
                    </div>
                  </div>

                  {/* Engagement Buttons */}
                  <div className="flex gap-4 mt-6 justify-center">
                    <motion.button
                      onClick={() => likeVibe(selectedVibe.id)}
                      disabled={userEngagements.liked.has(selectedVibe.id)}
                      className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                        userEngagements.liked.has(selectedVibe.id)
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-pink-600/30 hover:bg-pink-700/40 text-pink-200"
                      }`}
                      whileHover={!userEngagements.liked.has(selectedVibe.id) ? { scale: 1.05 } : {}}
                      whileTap={!userEngagements.liked.has(selectedVibe.id) ? { scale: 0.95 } : {}}
                    >
                      {userEngagements.liked.has(selectedVibe.id) ? "♥️ Liked" : "♥️ Like (+1 $VIBE)"}
                    </motion.button>

                    <motion.button
                      onClick={() => shareVibe(selectedVibe.id)}
                      disabled={userEngagements.shared.has(selectedVibe.id)}
                      className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 ${
                        userEngagements.shared.has(selectedVibe.id)
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600/30 hover:bg-blue-700/40 text-blue-200"
                      }`}
                      whileHover={!userEngagements.shared.has(selectedVibe.id) ? { scale: 1.05 } : {}}
                      whileTap={!userEngagements.shared.has(selectedVibe.id) ? { scale: 0.95 } : {}}
                    >
                      {userEngagements.shared.has(selectedVibe.id) ? "↗️ Shared" : "↗️ Share (+2 $VIBE)"}
                    </motion.button>
                  </div>

                  <motion.div
                    className="mt-6 flex gap-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.button
                      onClick={() => shareVibeSocial(selectedVibe)}
                      className="flex-1 bg-gray-800/50 hover:bg-gray-700/60 text-gray-200 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share Externally
                    </motion.button>

                    <motion.button
                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-medium"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      View on Explorer
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default App;

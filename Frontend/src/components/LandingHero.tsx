import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { 
  Search, 
  Shield, 
  Sparkles, 
  Activity, 
  Lock, 
  Zap, 
  ChevronDown
} from 'lucide-react';
import { GithubIcon, formatGithubUrl } from './GithubIcon';

const TOTAL_LOGO_FRAMES = 300;
const TOTAL_HERO_FRAMES = 300;

interface LandingHeroProps {
  onStartScan: (repoUrl: string) => void;
  currentRepo?: string;
  onRepoChange?: (repoUrl: string) => void;
}

// ============================================================================
// STAGE 1: LOGO VIDEO SCROLLYTELLING SEQUENCE (PURE VISUAL CANVAS)
// ============================================================================
const LogoScrollySection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    damping: 24,
    stiffness: 120,
    mass: 0.18,
  });

  // Cinematic Text Transitions: Strictly non-overlapping ranges (Frame 1 to Frame 185)
  // Phase 1: Frame 1 to 52 (progress 0.0 -> 0.24) - starts immediately from frame 1
  const phase1Opacity = useTransform(smoothProgress, [0.0, 0.20, 0.24], [1, 1, 0]);
  const phase1Y = useTransform(smoothProgress, [0.0, 0.20, 0.24], [0, 0, -12]);
  const phase1Display = useTransform(smoothProgress, (v) => (v <= 0.245 ? 'block' : 'none'));

  // Phase 2: Frame 65 to 117 (progress 0.29 -> 0.46)
  const phase2Opacity = useTransform(smoothProgress, [0.28, 0.30, 0.44, 0.46], [0, 1, 1, 0]);
  const phase2Y = useTransform(smoothProgress, [0.28, 0.30, 0.44, 0.46], [16, 0, 0, -12]);
  const phase2Display = useTransform(smoothProgress, (v) => (v >= 0.275 && v <= 0.465 ? 'block' : 'none'));

  // Phase 3: Frame 129 to 182 (progress 0.50 -> 0.6833)
  const phase3Opacity = useTransform(smoothProgress, [0.49, 0.51, 0.65, 0.6833], [0, 1, 1, 0]);
  const phase3Y = useTransform(smoothProgress, [0.49, 0.51, 0.65, 0.6833], [16, 0, 0, -12]);
  const phase3Display = useTransform(smoothProgress, (v) => (v >= 0.485 && v <= 0.6833 ? 'block' : 'none'));

  // Overall overlay container visibility
  const overlayOpacity = useTransform(smoothProgress, [0.0, 0.67, 0.6833], [1, 1, 0]);

  // Preload logo frames (300 sequential PNG frames)
  useEffect(() => {
    let count = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_LOGO_FRAMES; i++) {
      const img = new Image();
      const num = String(i).padStart(4, '0');
      img.src = `/frames/logo/frame_${num}.png`;

      img.onload = () => {
        count++;
        if (count >= 5 && !isLoaded) {
          setIsLoaded(true);
          drawFrame(0);
        }
      };
      images.push(img);
    }
    imagesRef.current = images;
  }, []);

  const drawFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.width || 1280;
    const imgHeight = img.height || 720;

    const hRatio = canvasWidth / imgWidth;
    const vRatio = canvasHeight / imgHeight;
    const ratio = Math.max(hRatio, vRatio);

    const centerShift_x = (canvasWidth - imgWidth * ratio) / 2;
    const centerShift_y = (canvasHeight - imgHeight * ratio) / 2;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(
      img,
      0,
      0,
      imgWidth,
      imgHeight,
      centerShift_x,
      centerShift_y,
      imgWidth * ratio,
      imgHeight * ratio
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      const progress = smoothProgress.get();
      const frameIdx = Math.min(TOTAL_LOGO_FRAMES - 1, Math.max(0, Math.floor(progress * (TOTAL_LOGO_FRAMES - 1))));
      drawFrame(frameIdx);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const unsubscribe = smoothProgress.on('change', (latest) => {
      const frameIdx = Math.min(TOTAL_LOGO_FRAMES - 1, Math.max(0, Math.floor(latest * (TOTAL_LOGO_FRAMES - 1))));
      drawFrame(frameIdx);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, [isLoaded]);

  return (
    <div ref={containerRef} className="relative h-[250vh] bg-[#0b0d0c]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0b0d0c] flex flex-col justify-center items-center select-none">
        
        {/* Fullscreen Logo Frame Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />

        {/* Subtle Obsidian Dark Edge Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d0c] via-transparent to-[#0b0d0c]/80 z-1 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d0c]/60 via-transparent to-[#0b0d0c]/60 z-1 pointer-events-none" />

        {/* Centered Pure Text Transition - Matte, No Harsh Neon Glows */}
        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center px-6"
        >
          <div className="relative w-full max-w-4xl flex items-center justify-center">
            
            {/* Act 1: Frames 24 to 75 */}
            <motion.h2
              style={{
                opacity: phase1Opacity,
                y: phase1Y,
                display: phase1Display,
                textShadow: '0 0 20px rgba(255, 255, 255, 0.7), 0 0 45px rgba(255, 255, 255, 0.35)',
              }}
              className="text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight text-center leading-tight drop-shadow-md"
            >
              Mapping Every Hidden Dependency
            </motion.h2>

            {/* Act 2: Frames 88 to 140 */}
            <motion.h2
              style={{
                opacity: phase2Opacity,
                y: phase2Y,
                display: phase2Display,
                textShadow: '0 0 20px rgba(255, 255, 255, 0.7), 0 0 45px rgba(255, 255, 255, 0.35)',
              }}
              className="absolute text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight text-center leading-tight drop-shadow-md"
            >
              Isolating Threats at the Core
            </motion.h2>

            {/* Act 3: Frames 152 to 205 */}
            <motion.h2
              style={{
                opacity: phase3Opacity,
                y: phase3Y,
                display: phase3Display,
                textShadow: '0 0 20px rgba(255, 255, 255, 0.7), 0 0 45px rgba(255, 255, 255, 0.35)',
              }}
              className="absolute text-3xl sm:text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight text-center leading-tight drop-shadow-md"
            >
              Anchored to the Root of Trust
            </motion.h2>

          </div>
        </motion.div>

      </div>
    </div>
  );
};

// ============================================================================
// STAGE 2: HERO VIDEO 300-FRAME SCROLLYTELLING & REPOSITORY GATEWAY
// ============================================================================
const HeroScrollySection: React.FC<LandingHeroProps> = ({ onStartScan, currentRepo, onRepoChange }) => {
  const [repoInput, setRepoInput] = useState(currentRepo ? (currentRepo.startsWith('http') ? currentRepo : `https://github.com/${currentRepo}`) : 'https://github.com/facebook/react');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    damping: 24,
    stiffness: 120,
    mass: 0.18,
  });

  // Preload hero frames
  useEffect(() => {
    let count = 0;
    const images: HTMLImageElement[] = [];

    for (let i = 1; i <= TOTAL_HERO_FRAMES; i++) {
      const img = new Image();
      const num = String(i).padStart(4, '0');
      img.src = `/frames/hero/frame_${num}.jpg`;

      img.onload = () => {
        count++;
        if (count >= 5 && !isLoaded) {
          setIsLoaded(true);
          drawFrame(0);
        }
      };
      images.push(img);
    }
    imagesRef.current = images;
  }, []);

  const drawFrame = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (!img || !img.complete) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.width || 1234;
    const imgHeight = img.height || 674;

    const hRatio = canvasWidth / imgWidth;
    const vRatio = canvasHeight / imgHeight;
    const ratio = Math.max(hRatio, vRatio);

    const centerShift_x = (canvasWidth - imgWidth * ratio) / 2;
    const centerShift_y = (canvasHeight - imgHeight * ratio) / 2;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(
      img,
      0,
      0,
      imgWidth,
      imgHeight,
      centerShift_x,
      centerShift_y,
      imgWidth * ratio,
      imgHeight * ratio
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      const progress = smoothProgress.get();
      const frameIdx = Math.min(TOTAL_HERO_FRAMES - 1, Math.max(0, Math.floor(progress * (TOTAL_HERO_FRAMES - 1))));
      drawFrame(frameIdx);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const unsubscribe = smoothProgress.on('change', (latest) => {
      const frameIdx = Math.min(TOTAL_HERO_FRAMES - 1, Math.max(0, Math.floor(latest * (TOTAL_HERO_FRAMES - 1))));
      drawFrame(frameIdx);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
    };
  }, [isLoaded]);

  // Stage 2 Text Timeline Animations
  // Act 1: Search Gateway & Title
  const act1Opacity = useTransform(smoothProgress, [0, 0.32, 0.44], [1, 1, 0]);
  const act1Scale = useTransform(smoothProgress, [0, 0.32, 0.44], [1, 1, 0.90]);
  const act1Y = useTransform(smoothProgress, [0, 0.32, 0.44], [0, 0, -40]);
  const act1Pointer = useTransform(smoothProgress, (val) => (val < 0.40 ? 'auto' : 'none'));

  // Carousel of target tags: One centered tag at a time
  // Tag 0 (facebook/react)
  const tag0Opacity = useTransform(smoothProgress, [0, 0.06, 0.095], [1, 1, 0]);
  const tag0Y = useTransform(smoothProgress, [0, 0.06, 0.095], [0, 0, -28]);
  const tag0Display = useTransform(smoothProgress, (v) => (v <= 0.098 ? 'flex' : 'none'));

  // Tag 1 (expressjs/express)
  const tag1Opacity = useTransform(smoothProgress, [0.06, 0.095, 0.155, 0.19], [0, 1, 1, 0]);
  const tag1Y = useTransform(smoothProgress, [0.06, 0.095, 0.155, 0.19], [28, 0, 0, -28]);
  const tag1Display = useTransform(smoothProgress, (v) => (v >= 0.058 && v <= 0.192 ? 'flex' : 'none'));

  // Tag 2 (web3/web3.js)
  const tag2Opacity = useTransform(smoothProgress, [0.155, 0.19, 0.25, 0.285], [0, 1, 1, 0]);
  const tag2Y = useTransform(smoothProgress, [0.155, 0.19, 0.25, 0.285], [28, 0, 0, -28]);
  const tag2Display = useTransform(smoothProgress, (v) => (v >= 0.152 && v <= 0.288 ? 'flex' : 'none'));

  // Tag 3 (tailwindlabs/tailwindcss)
  const tag3Opacity = useTransform(smoothProgress, [0.25, 0.285, 0.35], [0, 1, 1]);
  const tag3Y = useTransform(smoothProgress, [0.25, 0.285, 0.35], [28, 0, 0]);
  const tag3Display = useTransform(smoothProgress, (v) => (v >= 0.248 ? 'flex' : 'none'));

  const targetTagTransforms = [
    { opacity: tag0Opacity, y: tag0Y, display: tag0Display },
    { opacity: tag1Opacity, y: tag1Y, display: tag1Display },
    { opacity: tag2Opacity, y: tag2Y, display: tag2Display },
    { opacity: tag3Opacity, y: tag3Y, display: tag3Display },
  ];

  // Act 2: Left-side Heuristic Zero-Day Alert (Scroll 42% - 68%)
  const act2Opacity = useTransform(smoothProgress, [0.42, 0.50, 0.62, 0.70], [0, 1, 1, 0]);
  const act2X = useTransform(smoothProgress, [0.42, 0.50, 0.62, 0.70], [-350, 0, 0, -350]);

  // Act 3: Right-side Polygon PoS Consensus Callout (Scroll 66% - 88%)
  const act3Opacity = useTransform(smoothProgress, [0.66, 0.74, 0.84, 0.89], [0, 1, 1, 0]);
  const act3X = useTransform(smoothProgress, [0.66, 0.74, 0.84, 0.89], [350, 0, 0, 350]);

  // Act 4: Live Repository Gateway & 4-Column Metrics Grid (Scroll 86% - 100%)
  const act4Opacity = useTransform(smoothProgress, [0.86, 0.93, 1], [0, 1, 1]);
  const act4Y = useTransform(smoothProgress, [0.86, 0.93, 1], [50, 0, 0]);
  const act4Pointer = useTransform(smoothProgress, (val) => (val >= 0.86 ? 'auto' : 'none'));

  const canvasOverlayOpacity = useTransform(smoothProgress, [0, 0.35, 0.75, 1], [0.40, 0.55, 0.65, 0.75]);

  const presets = [
    { label: 'facebook/react', url: 'https://github.com/facebook/react', risk: 'High Anomaly' },
    { label: 'expressjs/express', url: 'https://github.com/expressjs/express', risk: 'Verified' },
    { label: 'web3/web3.js', url: 'https://github.com/web3/web3.js', risk: 'Zero-Day Alert' },
    { label: 'tailwindlabs/tailwindcss', url: 'https://github.com/tailwindlabs/tailwindcss', risk: 'Review' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      onStartScan(repoInput.trim());
    }
  };

  return (
    <div ref={containerRef} className="relative h-[380vh] bg-[#0b0d0c]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0b0d0c] flex flex-col justify-between select-none">
        
        {/* Hero 300-Frame Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        />

        {/* Dynamic Darkening Vignette Overlays */}
        <motion.div
          style={{ opacity: canvasOverlayOpacity }}
          className="absolute inset-0 bg-[#0b0d0c] z-1 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d0c] via-transparent to-[#0b0d0c]/80 z-2 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d0c]/70 via-transparent to-[#0b0d0c]/70 z-2 pointer-events-none" />

        {/* Top Spacer for Floating Navbar */}
        <div className="h-24 shrink-0 pointer-events-none" />

        {/* Act 1: Search Gateway */}
        <motion.div
          style={{
            opacity: act1Opacity,
            scale: act1Scale,
            y: act1Y,
            pointerEvents: act1Pointer as any,
          }}
          className="relative z-10 max-w-4xl mx-auto px-4 w-full text-center my-auto flex flex-col items-center justify-center"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-5">
            Step Into the Future of <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-500 bg-clip-text text-transparent">
              Code Security
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-stone-300 font-sans font-normal leading-relaxed mb-8">
            300-frame deep application telemetry. Intercept zero-days, analyze dependency trees, and anchor cryptographic proofs.
          </p>

          <div className="w-full max-w-2xl mx-auto mb-4">
            {/* Gemini-Style Moving Light Beam Container */}
            <form
              onSubmit={handleSubmit}
              className={`gemini-input-beam transition-all duration-300 ${
                isFocused ? 'is-active ring-1 ring-white/30' : ''
              }`}
            >
              <div className="glassmorphic-pill flex flex-col sm:flex-row items-center gap-2 rounded-full p-2.5">
                <a
                  href={formatGithubUrl(repoInput)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center pl-3.5 text-stone-400 hover:text-white transition-colors cursor-pointer group/gh"
                  title={repoInput.trim() ? `Open ${repoInput} directly on GitHub` : 'Open GitHub'}
                >
                  <GithubIcon className="w-5 h-5 text-emerald-400 group-hover/gh:scale-110 transition-transform" />
                </a>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    onRepoChange?.(e.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Enter GitHub Repository URL (e.g., https://github.com/facebook/react)..."
                  className="w-full bg-transparent px-3 py-2.5 text-sm md:text-base font-sans text-white placeholder-stone-400 focus:outline-none"
                />
                <button
                  type="submit"
                  id="scan-repo-btn"
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-500 hover:opacity-95 text-stone-950 font-sans font-bold text-xs tracking-wider border border-white/20 transition-all duration-200 active:scale-95 shadow-md"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>SCAN REPOSITORY</span>
                </button>
              </div>
            </form>

            {/* Target Carousel: centered, vanishes upwards, next enters from below */}
            <div className="flex items-center justify-center gap-2.5 mt-4 text-xs font-sans text-stone-400">
              <span className="text-stone-400 flex items-center gap-1 font-medium shrink-0">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> TARGET:
              </span>

              <div className="relative h-9 min-w-[290px] sm:min-w-[340px] flex items-center justify-center overflow-hidden">
                {presets.map((preset, idx) => (
                  <motion.button
                    key={preset.label}
                    type="button"
                    style={{
                      opacity: targetTagTransforms[idx].opacity,
                      y: targetTagTransforms[idx].y,
                      display: targetTagTransforms[idx].display,
                    }}
                    onClick={() => {
                      setRepoInput(preset.url);
                      onRepoChange?.(preset.label);
                      onStartScan(preset.url);
                    }}
                    className="absolute px-4 py-1.5 rounded-full glassmorphic-card border border-white/20 hover:border-white/35 hover:text-white text-stone-300 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <span className="font-medium text-xs text-stone-200">{preset.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      preset.risk.includes('Zero') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' :
                      preset.risk.includes('High') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {preset.risk}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Clean arrow without tail (no text, pure chevron) */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="flex justify-center items-center mt-6 text-stone-400 hover:text-emerald-400 transition-colors"
          >
            <ChevronDown className="w-6 h-6 stroke-[2]" />
          </motion.div>
        </motion.div>

        {/* Act 2: Left-side Heuristic Zero-Day Alert - Real Glassmorphic Bento */}
        <motion.div
          style={{ x: act2X, opacity: act2Opacity }}
          className="absolute left-6 md:left-16 top-1/2 -translate-y-1/2 z-20 max-w-md w-full pointer-events-none"
        >
          <div className="relative rounded-3xl p-6 sm:p-7 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.5)] pointer-events-auto overflow-hidden">
            {/* Top-edge light reflection catching the rim of real glass */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <h3 className="font-sans font-bold text-2xl text-white mb-2.5 tracking-tight">
              Catch Zero-Days Before Merge
            </h3>
            <p className="text-sm text-stone-300 font-sans leading-relaxed mb-5">
              Our autonomous classifier monitors maintainer velocity shifts, high-entropy bytecode injection, and hidden socket calls before packages reach your production fleet.
            </p>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs font-sans">
              <div className="flex justify-between text-stone-400">
                <span>Zero-Days Neutralized:</span>
                <span className="text-emerald-400 font-bold font-sans">14,290</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>False-Positive Ratio:</span>
                <span className="text-stone-300 font-bold font-sans">0.00%</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Classification Latency:</span>
                <span className="text-emerald-400 font-bold font-sans">&lt; 420 ms</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Act 3: Right-side Polygon Trust Anchor - Real Glassmorphic Bento */}
        <motion.div
          style={{ x: act3X, opacity: act3Opacity }}
          className="absolute right-6 md:right-16 top-1/2 -translate-y-1/2 z-20 max-w-md w-full pointer-events-none"
        >
          <div className="relative rounded-3xl p-6 sm:p-7 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_12px_36px_rgba(0,0,0,0.5)] pointer-events-auto overflow-hidden">
            {/* Top-edge light reflection catching the rim of real glass */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

            <h3 className="font-sans font-bold text-2xl text-white mb-2.5 tracking-tight">
              Polygon PoS Trust Anchor
            </h3>
            <p className="text-sm text-stone-300 font-sans leading-relaxed mb-5">
              Audit results and package state hashes are cryptographically anchored to Polygon mainnet, providing mathematical proof of zero tampering.
            </p>

            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-2.5 text-xs font-sans">
              <div className="flex justify-between text-stone-400">
                <span>Mainnet Anchor Block:</span>
                <span className="text-stone-100 font-bold font-mono">#5,928,174</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Ledger Integrity:</span>
                <span className="text-emerald-400 font-bold">Verified</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Merkle Roots Anchored:</span>
                <span className="text-stone-100 font-bold font-sans">2,847 Anchors</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Act 4: Live Repository Gateway & Stats - Centered Glassmorphic Section */}
        <motion.div
          style={{
            opacity: act4Opacity,
            y: act4Y,
            pointerEvents: act4Pointer as any,
          }}
          className="absolute inset-0 z-30 max-w-5xl mx-auto px-4 w-full flex flex-col justify-center items-center my-auto"
        >
          <div className="text-center mb-6 max-w-2xl mx-auto">
            <span className="text-xs font-sans uppercase tracking-wider text-emerald-400 font-semibold flex items-center justify-center gap-1.5 mb-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" /> Live Repository Gateway
            </span>
            <h2 className="text-3xl sm:text-5xl font-sans font-bold text-white tracking-tight">
              Audit Any Repository in{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-500 bg-clip-text text-transparent">
                Real-Time
              </span>
            </h2>
          </div>

          {/* Glassmorphic Repo Input Container with Gemini Moving Light Beam */}
          <div className="w-full max-w-3xl mx-auto mb-6">
            <form
              onSubmit={handleSubmit}
              className={`gemini-input-beam transition-all duration-300 ${
                isFocused ? 'is-active ring-1 ring-white/30' : ''
              }`}
            >
              <div className="glassmorphic-pill flex flex-col sm:flex-row items-center gap-2 rounded-full p-2.5">
                <a
                  href={formatGithubUrl(repoInput)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center pl-3.5 text-stone-400 hover:text-white transition-colors cursor-pointer group/gh"
                  title={repoInput.trim() ? `Open ${repoInput} directly on GitHub` : 'Open GitHub'}
                >
                  <GithubIcon className="w-5 h-5 text-emerald-400 group-hover/gh:scale-110 transition-transform" />
                </a>
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => {
                    setRepoInput(e.target.value);
                    onRepoChange?.(e.target.value);
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Enter GitHub Repository URL (e.g., https://github.com/facebook/react)..."
                  className="w-full bg-transparent px-3 py-2.5 text-sm md:text-base font-sans text-white placeholder-stone-400 focus:outline-none"
                />
                <button
                  type="submit"
                  id="scan-repo-btn-stage2"
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-500 hover:opacity-95 text-stone-950 font-sans font-bold text-xs tracking-wider border border-white/20 transition-all duration-200 active:scale-95 shadow-md"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>SCAN REPOSITORY</span>
                </button>
              </div>
            </form>
          </div>

          {/* Metric Boxes Styled with Image 2 Glassmorphism & Top Specular Glow */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
            <div className="glassmorphic-card rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 hover:border-white/35 group">
              <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-sans mb-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="tracking-wider">PACKAGES AUDITED</span>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">482,910</div>
              <div className="text-[11px] text-emerald-400 mt-1 font-medium">+18.4% weekly</div>
            </div>

            <div className="glassmorphic-card rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 hover:border-white/35 group">
              <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-sans mb-1.5">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span className="tracking-wider">ZERO-DAYS BLOCKED</span>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-bold text-rose-400 tracking-tight">14,290</div>
              <div className="text-[11px] text-stone-400 mt-1 font-medium">0% false-positives</div>
            </div>

            <div className="glassmorphic-card rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 hover:border-white/35 group">
              <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-sans mb-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-300" />
                <span className="tracking-wider">POLYGON ANCHOR</span>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">100% PROVEN</div>
              <div className="text-[11px] font-sans text-emerald-400 mt-1 font-medium">Block #5.9M</div>
            </div>

            <div className="glassmorphic-card rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 hover:border-white/35 group">
              <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-sans mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="tracking-wider">HEURISTIC SPEED</span>
              </div>
              <div className="text-2xl sm:text-3xl font-sans font-bold text-white tracking-tight">&lt; 420 ms</div>
              <div className="text-[11px] text-emerald-400 mt-1 font-medium">Real-time scan</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: SEQUENTIAL MULTI-STAGE SCROLLING (LOGO -> HERO)
// ============================================================================
export const LandingHero: React.FC<LandingHeroProps> = ({ onStartScan, currentRepo, onRepoChange }) => {
  return (
    <div className="w-full bg-[#0b0d0c]">
      {/* 1. First Page: Logo Video 300-Frame Scrollytelling Sequence */}
      <LogoScrollySection />

      {/* 2. Second Page: Hero Video 300-Frame Scrollytelling & Gateway */}
      <HeroScrollySection 
        onStartScan={onStartScan} 
        currentRepo={currentRepo}
        onRepoChange={onRepoChange}
      />
    </div>
  );
};

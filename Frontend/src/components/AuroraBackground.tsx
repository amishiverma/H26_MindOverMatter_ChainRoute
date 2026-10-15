import React, { useRef, useEffect } from 'react';

interface AuroraBackgroundProps {
  opacity?: number;
  showMeshFallbacks?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  opacity = 0.85,
  showMeshFallbacks = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted until interaction
      });
    }
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Master 16:9 Cinematic Looping Aurora Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster="/videos/dashbg_poster.jpg"
        className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none transition-opacity duration-1000"
        style={{ opacity }}
      >
        <source src="/videos/dashbg_clean.mp4" type="video/mp4" />
        <source src="/videos/dashbg.mp4" type="video/mp4" />
        <source src="/videos/aurora_background_1080p.mp4" type="video/mp4" />
      </video>

      {/* 2. Organic Luminous Aurora Mesh Waves (Olive-Sage, Emerald, Mint Teal) */}
      {showMeshFallbacks && (
        <div className="absolute inset-0 mix-blend-screen pointer-events-none">
          {/* Top-Right Emerald Beam */}
          <div 
            className="absolute -top-[15%] right-[10%] w-[55vw] h-[55vw] rounded-full blur-[140px] pointer-events-none animate-aurora-1"
            style={{
              background: 'radial-gradient(circle, rgba(22, 101, 52, 0.35) 0%, rgba(20, 83, 45, 0.15) 50%, transparent 70%)',
            }}
          />

          {/* Center-Left Mint Teal Aurora Ribbon */}
          <div 
            className="absolute top-[20%] -left-[10%] w-[60vw] h-[50vw] rounded-full blur-[160px] pointer-events-none animate-aurora-2"
            style={{
              background: 'radial-gradient(ellipse, rgba(13, 148, 136, 0.3) 0%, rgba(15, 118, 110, 0.12) 55%, transparent 75%)',
            }}
          />

          {/* Bottom-Center Olive-Sage Organic Glow */}
          <div 
            className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[45vw] rounded-full blur-[130px] pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(101, 128, 85, 0.25) 0%, rgba(80, 105, 68, 0.1) 50%, transparent 70%)',
            }}
          />
        </div>
      )}

      {/* 3. Soft Atmospheric Vignette (Preserves Contrast for Frosted Glass Cards) */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(11, 13, 12, 0.6) 80%, rgba(11, 13, 12, 0.95) 100%)',
        }}
      />
    </div>
  );
};

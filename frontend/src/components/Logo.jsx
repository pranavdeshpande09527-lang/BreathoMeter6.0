import React from 'react';
import brandSymbol from '../assets/brand_symbol.png';

/**
 * Breathometer Text & Image Premium Identity
 * Precision-coded typography + symbol, highly interactive and stylish lockup.
 */
const Logo = ({ size, height, width, className = '', iconOnly = false }) => {
  // Determine actual pixel height for proportion scaling to prevent overflow
  const requestedHeight = parseInt(height || size || '80', 10); 
  const scale = requestedHeight / 80;

  // The base layout width of the logo lockup at 80px height is ~460px to fit 'Breathometer'
  const baseWidth = 460;
  const scaledWidth = baseWidth * scale;

  return (
    <div 
      className={`logo-master-lockup ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        height: `${requestedHeight}px`,
        width: `${scaledWidth}px`, // EXPLICIT WIDTH to prevent flex layout stretching
        pointerEvents: 'auto',
        userSelect: 'none',
        position: 'relative',
        overflow: 'visible' // Ensure text is absolutely never clipped
      }}
    >
      <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: `16px`,
          height: `80px`,
          width: `${baseWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          padding: `6px 10px`, // 0 margin negations needed since we restrict width externally
          borderRadius: `14px`
      }}>
        {/* 1. LUXURY 3D SYMBOL */}
        <div 
          className="brand-symbol-wrapper"
          style={{
            height: `68px`, // 85% of 80px
            width: `68px`,
            minWidth: `68px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <img
            src={brandSymbol}
            alt="Symbol"
            className="brand-symbol-img"
            style={{
              width: '100%', 
              height: '100%',
              objectFit: 'contain',
              borderRadius: `10px`,
              filter: 'drop-shadow(0 6px 16px rgba(37, 99, 235, 0.25))',
              transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.4s ease'
            }}
          />
        </div>

        {/* 2. PRECISION VECTOR TYPOGRAPHY */}
        <div className="logo-text-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 
            className="logo-main-text"
            style={{
              margin: 0,
              padding: 0,
              fontSize: `48px`,
              fontWeight: '900',
              lineHeight: '1',
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: `-2px`,
              position: 'relative'
            }}
          >
            <span className="text-shimmer-bg">Breathometer</span>
            <span className="text-shimmer-effect">Breathometer</span>
          </h1>
          <div 
            className="logo-subtitle"
            style={{
              margin: `2px 0 0 2px`,
              padding: 0,
              fontSize: `13px`,
              fontWeight: '800',
              letterSpacing: `3.5px`,
              fontFamily: "'Inter', sans-serif",
              textTransform: 'uppercase',
              position: 'relative',
              whiteSpace: 'nowrap'
            }}
          >
            <span className="subtitle-text">Clinical Intelligence</span>
            <span className="subtitle-glow"></span>
          </div>
        </div>
      </div>

      <style>
        {`
          .logo-master-lockup {
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            cursor: pointer;
            --main-text-color: #0A192F;
            --gradient-bottom-color: rgba(10, 25, 47, 0.6);
            --sub-text-color: #3B82F6;
            --shimmer-color: rgba(0, 0, 0, 0.1);
            --text-shadow-color: rgba(0, 0, 0, 0.05);
            border-radius: 12px;
          }
          [data-theme='dark'] .logo-master-lockup {
            --main-text-color: #FFFFFF;
            --gradient-bottom-color: rgba(255, 255, 255, 0.7);
            --sub-text-color: #3B82F6;
            --shimmer-color: rgba(255, 255, 255, 0.8);
            --text-shadow-color: rgba(255, 255, 255, 0.1);
          }

          /* Image Interactions */
          .logo-master-lockup:hover .brand-symbol-img {
            transform: scale(1.08) rotate(-4deg);
            filter: drop-shadow(0 10px 24px rgba(37, 99, 235, 0.4));
          }
          .logo-icon-only:hover .brand-symbol-icon-only {
            transform: scale(1.05) rotate(-2deg);
          }

          /* Main text styling with overlapping shimmer */
          .logo-main-text {
            color: var(--main-text-color);
            transition: transform 0.4s ease, filter 0.4s ease;
          }
          .text-shimmer-bg {
            display: block;
            background: linear-gradient(180deg, var(--main-text-color) 0%, var(--gradient-bottom-color) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 4px 24px var(--text-shadow-color);
          }
          .text-shimmer-effect {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(120deg, transparent 20%, var(--shimmer-color) 30%, transparent 40%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            opacity: 0;
            transition: opacity 0.3s ease;
            animation: none;
            pointer-events: none;
          }

          /* Subtitle styling */
          .subtitle-text {
            color: var(--sub-text-color);
            transition: letter-spacing 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.4s ease, text-shadow 0.4s ease;
            display: inline-block;
          }
          .subtitle-glow {
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 0%;
            height: 2px;
            background: #60A5FA;
            box-shadow: 0 0 12px rgba(96, 165, 250, 0.8);
            transition: width 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border-radius: 2px;
            opacity: 0;
          }

          /* Hover Interactions */
          .logo-master-lockup:hover {
            transform: scale(1.02) translateY(-1px);
            text-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }
          
          .logo-master-lockup:hover .text-shimmer-effect {
            opacity: 1;
            animation: shimmerSlide 2.5s infinite linear;
          }
          
          .logo-master-lockup:hover .subtitle-text {
            letter-spacing: ${7.5 * scale}px;
            color: #60A5FA;
            text-shadow: 0 0 12px rgba(96, 165, 250, 0.4);
          }

          .logo-master-lockup:hover .subtitle-glow {
            width: 100%;
            opacity: 1;
          }

          .logo-master-lockup:active {
            transform: scale(0.98);
            transition: all 0.1s ease;
          }

          @keyframes shimmerSlide {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}
      </style>
    </div>
  );
};

export default Logo;

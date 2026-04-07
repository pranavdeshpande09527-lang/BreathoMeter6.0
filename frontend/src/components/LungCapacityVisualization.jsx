import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    OrbitControls,
    Sphere,
    MeshDistortMaterial,
    Sparkles,
    Float,
    PerspectiveCamera,
    Environment,
    ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";

/* ─────────────────────────────────────
   Health score → colour palette
   ≥ 70 : green  (healthy)
   40–69: amber  (moderate)
   < 40 : red    (poor)
───────────────────────────────────── */
function getLungPalette(healthScore) {
    if (healthScore >= 70) {
        return {
            base:    "#059669",   // emerald-600
            emissive:"#10b981",   // emerald-500
            glow:    "#34d399",   // emerald-400
            sparkle: "#6ee7b7",   // emerald-300
            gradA:   "#10b981",
            gradB:   "#06b6d4",
            atmo:    "rgba(16, 185, 129, 0.1)",   // Light green tint
            condition: "OPTIMAL",
            conditionColor: "#34d399",
        };
    } else if (healthScore >= 40) {
        return {
            base:    "#b45309",   // amber-700
            emissive:"#d97706",   // amber-600
            glow:    "#fbbf24",   // amber-400
            sparkle: "#fde68a",   // amber-200
            gradA:   "#f59e0b",
            gradB:   "#fb923c",
            atmo:    "rgba(217, 119, 6, 0.1)",    // Light amber tint
            condition: "MODERATE",
            conditionColor: "#fbbf24",
        };
    } else {
        return {
            base:    "#991b1b",   // red-800
            emissive:"#ef4444",   // red-500
            glow:    "#f87171",   // red-400
            sparkle: "#fca5a5",   // red-300
            gradA:   "#ef4444",
            gradB:   "#f97316",
            atmo:    "rgba(239, 68, 68, 0.1)",    // Light red tint
            condition: "POOR",
            conditionColor: "#f87171",
        };
    }
}

/* =========================
   3D Lung Model Component
========================= */

function LungModel({ isBreathing, capacity, palette }) {
    const groupRef = useRef(null);
    const leftLobeRef = useRef(null);
    const rightLobeRef = useRef(null);

    const baseScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);
    const targetScale = useMemo(() => new THREE.Vector3(1, 1, 1), []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;

        const breathingProgress = capacity / 100;
        const time = clock.getElapsedTime();

        const pulseFactor = Math.sin(time * 3.5) * 0.012;
        const finalPulse = isBreathing ? pulseFactor * breathingProgress : pulseFactor * 0.3;

        if (isBreathing) {
            const s = 1 + breathingProgress * 0.28;
            targetScale.set(s, s * 1.05, s);
            groupRef.current.scale.set(
                targetScale.x + finalPulse,
                targetScale.y + finalPulse,
                targetScale.z + finalPulse
            );
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.2, 0.04);
        } else {
            groupRef.current.scale.lerp(baseScale, 0.12);
            groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, 0.1);
        }

        if (leftLobeRef.current && rightLobeRef.current) {
            const glowIntensity = isBreathing ? 0.3 + breathingProgress * 1.2 : 0.2;
            leftLobeRef.current.emissiveIntensity = glowIntensity;
            rightLobeRef.current.emissiveIntensity = glowIntensity;

            const distortValue = isBreathing ? 0.3 + breathingProgress * 0.2 : 0.15;
            leftLobeRef.current.distort = distortValue;
            rightLobeRef.current.distort = distortValue;
        }
    });

    const createLungGeometry = (isLeft) => {
        const geo = new THREE.SphereGeometry(1, 64, 64);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);
            y *= 1.6;
            z *= 0.65;
            let taper = 1.0 - (y / 1.6) * 0.25;
            x *= taper;
            let outShift = (y < 0) ? Math.pow(Math.abs(y), 1.5) * 0.15 : 0;
            x += isLeft ? -outShift : outShift;
            let notchPos = isLeft ? -0.2 : 0.0;
            let notchDist = Math.abs(y - notchPos);
            let notchStrength = isLeft ? 0.45 : 0.15;
            let notchIn = Math.exp(-notchDist * notchDist * 2.0) * notchStrength;
            let innerRatio = isLeft ? Math.max(0, x) : Math.max(0, -x);
            let finalNotch = notchIn * (innerRatio * 0.8);
            x += isLeft ? -finalNotch : finalNotch;
            if (y < -1.1) {
                y = -1.1 + (y + 1.1) * 0.4;
            }
            pos.setX(i, x);
            pos.setY(i, y);
            pos.setZ(i, z);
        }
        geo.computeVertexNormals();
        return geo;
    };

    const leftLungGeo = useMemo(() => createLungGeometry(true), []);
    const rightLungGeo = useMemo(() => createLungGeometry(false), []);

    const sharedMaterialProps = {
        color: palette.base,
        emissive: palette.emissive,
        emissiveIntensity: 0.2,
        distort: 0.15,
        speed: 2,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.75,
        transmission: 0.4,
        thickness: 2,
    };

    return (
        <group ref={groupRef}>
            <Sparkles
                count={isBreathing ? 120 : 40}
                speed={isBreathing ? 1.5 : 0.4}
                opacity={isBreathing ? 0.8 : 0.2}
                color={palette.sparkle}
                size={3}
                scale={5}
                noise={1}
            />

            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                <group position={[0, 0.2, 0]}>
                    {/* Left Lobe */}
                    <mesh position={[-0.75, 0, 0]} geometry={leftLungGeo} scale={0.75}>
                        <MeshDistortMaterial ref={leftLobeRef} {...sharedMaterialProps} />
                    </mesh>

                    {/* Right Lobe */}
                    <mesh position={[0.75, 0, 0]} geometry={rightLungGeo} scale={0.75}>
                        <MeshDistortMaterial ref={rightLobeRef} {...sharedMaterialProps} />
                    </mesh>
                </group>
            </Float>

            {/* Internal Vein Structure (Abstract) */}
            <group position={[0, -0.2, 0.2]} scale={0.8} opacity={0.3}>
                <mesh>
                    <torusKnotGeometry args={[0.5, 0.01, 100, 16]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
                </mesh>
            </group>
        </group>
    );
}

/* =========================
   Main Visualization
========================= */

export default function LungCapacityVisualization({ externalIsBreathing, externalCapacity, hideUI = false, size = 350, healthScore = 75 }) {
    const [internalIsBreathing, setInternalIsBreathing] = useState(false);
    const [internalCapacity, setInternalCapacity] = useState(0);

    const isBreathing = externalIsBreathing !== undefined ? externalIsBreathing : internalIsBreathing;
    const capacity = externalCapacity !== undefined ? externalCapacity : internalCapacity;

    // Derive colour palette from health score
    const palette = getLungPalette(healthScore);

    useEffect(() => {
        if (externalIsBreathing !== undefined && externalCapacity !== undefined) return;

        let interval;
        if (isBreathing) {
            interval = setInterval(() => {
                setInternalCapacity((prev) => Math.min(100, prev + 1));
            }, 40);
        } else {
            interval = setInterval(() => {
                setInternalCapacity((prev) => Math.max(0, prev - 2));
            }, 20);
        }
        return () => clearInterval(interval);
    }, [isBreathing, externalIsBreathing, externalCapacity]);

    const radius = 135;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (capacity / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, backgroundColor: 'transparent', borderRadius: '32px', overflow: 'hidden', margin: '0 auto' }}>

            {/* Dynamic Background Atmosphere — blended with theme */}
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div
                    style={{
                        position: 'absolute', top: '-10%', left: '-10%', width: '120%', height: '120%', opacity: 0.15, transition: 'all 1s',
                        background: `radial-gradient(circle at center, ${isBreathing ? palette.emissive : palette.atmo} 0%, transparent 70%)`,
                        transform: `scale(${1 + capacity / 250})`,
                    }}
                />
            </div>

            {/* 3D Visualizer Canvas */}
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, cursor: 'grab' }}>
                <Canvas shadows dpr={[1, 2]} gl={{ alpha: true }} style={{ background: 'transparent' }}>
                    <PerspectiveCamera makeDefault position={[0, 0, 7]} fov={40} />

                    <ambientLight intensity={0.4} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
                    <pointLight position={[-10, -10, -10]} intensity={1} color={palette.glow} />

                    <Environment preset="city" />

                    <LungModel isBreathing={isBreathing} capacity={capacity} palette={palette} />

                    <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />

                    <OrbitControls
                        enableZoom={false}
                        enablePan={false}
                        minPolarAngle={Math.PI / 2.5}
                        maxPolarAngle={Math.PI / 1.5}
                        autoRotate={!isBreathing}
                        autoRotateSpeed={0.8}
                    />
                </Canvas>
            </div>

            {/* Modern UI Overlay */}
            {!hideUI && (
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between p-8">

                <div className="w-full flex justify-between items-start">
                    <div className="flex flex-col">
                        <h2 className="text-white text-lg font-black tracking-tighter italic">VITAL_AI</h2>
                        <div className="w-8 h-[2px] mt-1" style={{ background: palette.glow }} />
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: palette.glow }}>Real-time Analysis</span>
                    </div>
                </div>

                {/* Center Circular Gauge — coloured ring */}
                <div className="relative flex items-center justify-center">
                    <svg className="w-[340px] h-[340px] -rotate-90">
                        <circle cx="170" cy="170" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
                        <circle
                            cx="170" cy="170" r={radius}
                            fill="none" stroke="url(#healthGradient)" strokeWidth="4"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 150ms linear', filter: `drop-shadow(0 0 12px ${palette.glow}80)` }}
                        />
                        <defs>
                            <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={palette.gradA} />
                                <stop offset="100%" stopColor={palette.gradB} />
                            </linearGradient>
                        </defs>
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                        <div className="text-6xl font-black text-white tabular-nums tracking-tighter">
                            {Math.round(capacity)}
                            <span className="text-2xl ml-1" style={{ color: palette.glow }}>%</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: isBreathing ? palette.glow : '#64748b', animation: isBreathing ? 'ping 1s infinite' : 'none' }} />
                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em]">
                                {isBreathing ? 'Inhaling' : 'Lung Vol'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="w-full flex flex-col items-center gap-6">
                    <div className="flex gap-16 text-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Condition</span>
                            <span className="text-xs font-bold" style={{ color: palette.conditionColor }}>{palette.condition}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-white/30 font-bold tracking-widest uppercase">Health Score</span>
                            <span className="text-white text-xs font-bold">{healthScore}/100</span>
                        </div>
                    </div>

                    <button
                        onMouseDown={() => setInternalIsBreathing(true)}
                        onMouseUp={() => setInternalIsBreathing(false)}
                        onMouseLeave={() => setInternalIsBreathing(false)}
                        onTouchStart={(e) => { e.preventDefault(); setInternalIsBreathing(true); }}
                        onTouchEnd={() => setInternalIsBreathing(false)}
                        className={`
              pointer-events-auto w-64 h-14 rounded-2xl font-black tracking-[0.2em] text-[11px] uppercase transition-all duration-500 transform
              ${isBreathing
                            ? 'bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.4)] text-white scale-95 border-rose-400'
                            : 'bg-white text-black shadow-xl hover:scale-105 active:scale-95'
                        }
              border-2 border-transparent select-none active:opacity-90
            `}
                    >
                        {isBreathing ? 'Release to Exhale' : 'Hold to Synchronize'}
                    </button>
                </div>
            </div>
            )}

        </div>
    );
}


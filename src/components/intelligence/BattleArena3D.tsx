"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles, Trail, Stars, Html } from "@react-three/drei";
import * as THREE from "three";

interface BattleArena3DProps {
    currentPhase: "initial" | "duel" | "scoring" | "review" | "complete";
    currentAttacker: string;
    scores: { gemini: number; openai: number };
    currentRound: number;
    battleStatus: string;
    elapsedTime: number;
}

// Gemini Fighter - Crystalline energy being
function GeminiFighter({ isAttacking, isHit, score }: { isAttacking: boolean; isHit: boolean; score: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const shieldRef = useRef<THREE.Mesh>(null);
    const [hitFlash, setHitFlash] = useState(false);
    const [attackPulse, setAttackPulse] = useState(0);

    useEffect(() => {
        if (isHit) {
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 300);
        }
    }, [isHit]);

    useEffect(() => {
        if (isAttacking) {
            setAttackPulse(1);
            const timer = setTimeout(() => setAttackPulse(0), 500);
            return () => clearTimeout(timer);
        }
    }, [isAttacking]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;
        
        // Idle floating
        groupRef.current.position.y = Math.sin(t * 2) * 0.15;
        
        // Attack lunge
        if (isAttacking) {
            groupRef.current.position.x = -2.5 + Math.sin(t * 12) * 1.2;
            groupRef.current.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
        } else {
            groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, -2.5, 0.08);
            groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }

        // Hit recoil
        if (hitFlash) {
            groupRef.current.position.x = -3.2;
            groupRef.current.rotation.z = Math.sin(t * 50) * 0.4;
        } else {
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
        }

        // Core rotation
        if (coreRef.current) {
            coreRef.current.rotation.x = t * 0.5;
            coreRef.current.rotation.y = t * 0.7;
        }

        // Shield pulse
        if (shieldRef.current) {
            const pulse = 1 + Math.sin(t * 4) * 0.1 + attackPulse * 0.3;
            shieldRef.current.scale.setScalar(pulse);
            shieldRef.current.rotation.z = t * 0.3;
        }
    });

    return (
        <group ref={groupRef} position={[-2.5, 0, 0]}>
            {/* Core crystal */}
            <mesh ref={coreRef}>
                <octahedronGeometry args={[0.5, 0]} />
                <meshStandardMaterial
                    color={hitFlash ? "#ff3333" : "#00d4ff"}
                    emissive={hitFlash ? "#ff0000" : "#0099ff"}
                    emissiveIntensity={isAttacking ? 3 : 1.5}
                    metalness={0.9}
                    roughness={0.1}
                />
            </mesh>

            {/* Inner glow sphere */}
            <mesh scale={1.3}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial
                    color="#00d4ff"
                    transparent
                    opacity={isAttacking ? 0.4 : 0.2}
                />
            </mesh>

            {/* Outer shield */}
            <mesh ref={shieldRef} scale={1.5}>
                <icosahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial
                    color="#00d4ff"
                    emissive="#0066ff"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.3}
                    wireframe
                />
            </mesh>

            {/* Energy blades */}
            {[0, 1, 2, 3].map((i) => (
                <mesh
                    key={i}
                    rotation={[0, 0, (Math.PI / 2) * i]}
                    position={[Math.cos((Math.PI / 2) * i) * 0.8, Math.sin((Math.PI / 2) * i) * 0.8, 0]}
                >
                    <boxGeometry args={[0.1, 0.6, 0.05]} />
                    <meshStandardMaterial
                        color="#00ffff"
                        emissive="#00ffff"
                        emissiveIntensity={isAttacking ? 2 : 1}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}

            {/* Score indicator */}
            <Html position={[0, 1.6, 0]} center distanceFactor={8}>
                <div className="text-center pointer-events-none select-none">
                    <div className="text-[10px] text-cyan-400 font-bold tracking-widest mb-1">GEMINI</div>
                    <div className="text-3xl font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]">{score}</div>
                </div>
            </Html>

            {/* Attack particles */}
            {isAttacking && (
                <>
                    <Sparkles
                        count={50}
                        scale={3}
                        size={4}
                        speed={3}
                        color="#00ffff"
                    />
                    <pointLight position={[0, 0, 0]} intensity={3} color="#00d4ff" distance={5} />
                </>
            )}

            {/* Ambient glow */}
            <pointLight position={[0, 0, 0]} intensity={isAttacking ? 2 : 1} color="#00d4ff" distance={3} />
        </group>
    );
}

// OpenAI Fighter - Neural network entity
function OpenAIFighter({ isAttacking, isHit, score }: { isAttacking: boolean; isHit: boolean; score: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const orbitalsRef = useRef<THREE.Group>(null);
    const [hitFlash, setHitFlash] = useState(false);
    const [attackPulse, setAttackPulse] = useState(0);

    useEffect(() => {
        if (isHit) {
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 300);
        }
    }, [isHit]);

    useEffect(() => {
        if (isAttacking) {
            setAttackPulse(1);
            const timer = setTimeout(() => setAttackPulse(0), 500);
            return () => clearTimeout(timer);
        }
    }, [isAttacking]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;
        
        // Idle floating
        groupRef.current.position.y = Math.sin(t * 2 + Math.PI) * 0.15;
        
        // Attack lunge
        if (isAttacking) {
            groupRef.current.position.x = 2.5 - Math.sin(t * 12) * 1.2;
            groupRef.current.scale.setScalar(1 + Math.sin(t * 20) * 0.15);
        } else {
            groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 2.5, 0.08);
            groupRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        }

        // Hit recoil
        if (hitFlash) {
            groupRef.current.position.x = 3.2;
            groupRef.current.rotation.z = Math.sin(t * 50) * 0.4;
        } else {
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.1);
        }

        // Core rotation
        if (coreRef.current) {
            coreRef.current.rotation.x = -t * 0.6;
            coreRef.current.rotation.y = t * 0.4;
        }

        // Orbital rotation
        if (orbitalsRef.current) {
            orbitalsRef.current.rotation.y = t * 1.5;
            orbitalsRef.current.rotation.z = Math.sin(t * 2) * 0.3;
        }
    });

    return (
        <group ref={groupRef} position={[2.5, 0, 0]}>
            {/* Core sphere */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshStandardMaterial
                    color={hitFlash ? "#ff3333" : "#10b981"}
                    emissive={hitFlash ? "#ff0000" : "#059669"}
                    emissiveIntensity={isAttacking ? 3 : 1.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </mesh>

            {/* Inner energy */}
            <mesh scale={1.2}>
                <sphereGeometry args={[0.45, 32, 32]} />
                <meshBasicMaterial
                    color="#10b981"
                    transparent
                    opacity={isAttacking ? 0.4 : 0.2}
                />
            </mesh>

            {/* Orbital rings */}
            <group ref={orbitalsRef}>
                {[0, 1, 2].map((i) => (
                    <mesh
                        key={i}
                        rotation={[Math.PI / 3 * i, Math.PI / 4 * i, 0]}
                    >
                        <torusGeometry args={[0.9, 0.04, 16, 64]} />
                        <meshStandardMaterial
                            color="#34d399"
                            emissive="#10b981"
                            emissiveIntensity={isAttacking ? 1.5 : 0.8}
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                ))}
            </group>

            {/* Neural nodes */}
            {[0, 1, 2, 3, 4, 5].map((i) => {
                const angle = (Math.PI * 2 / 6) * i;
                return (
                    <mesh
                        key={i}
                        position={[
                            Math.cos(angle) * 1.1,
                            Math.sin(angle) * 1.1,
                            0
                        ]}
                    >
                        <sphereGeometry args={[0.08, 16, 16]} />
                        <meshStandardMaterial
                            color="#34d399"
                            emissive="#34d399"
                            emissiveIntensity={isAttacking ? 2 : 1}
                        />
                    </mesh>
                );
            })}

            {/* Score indicator */}
            <Html position={[0, 1.6, 0]} center distanceFactor={8}>
                <div className="text-center pointer-events-none select-none">
                    <div className="text-[10px] text-emerald-400 font-bold tracking-widest mb-1">GPT-5</div>
                    <div className="text-3xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{score}</div>
                </div>
            </Html>

            {/* Attack particles */}
            {isAttacking && (
                <>
                    <Sparkles
                        count={50}
                        scale={3}
                        size={4}
                        speed={3}
                        color="#34d399"
                    />
                    <pointLight position={[0, 0, 0]} intensity={3} color="#10b981" distance={5} />
                </>
            )}

            {/* Ambient glow */}
            <pointLight position={[0, 0, 0]} intensity={isAttacking ? 2 : 1} color="#10b981" distance={3} />
        </group>
    );
}

// Central battle zone with clash effects
function BattleZone({ isClashing, round }: { isClashing: boolean; round: number }) {
    const ringRef = useRef<THREE.Mesh>(null);
    const gridRef = useRef<THREE.Mesh>(null);
    const clashRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        
        if (ringRef.current) {
            ringRef.current.rotation.z = t * 0.3;
        }
        
        if (gridRef.current && gridRef.current.material && 'opacity' in gridRef.current.material) {
            (gridRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 2) * 0.05;
        }
        
        if (clashRef.current && isClashing) {
            clashRef.current.scale.setScalar(1 + Math.sin(t * 25) * 0.5);
            clashRef.current.rotation.x = t * 8;
            clashRef.current.rotation.y = t * 6;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            {/* Arena floor */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
                <circleGeometry args={[3.5, 64]} />
                <meshStandardMaterial
                    color="#0f172a"
                    metalness={0.8}
                    roughness={0.2}
                    emissive="#1e293b"
                    emissiveIntensity={0.2}
                />
            </mesh>
            
            {/* Grid overlay */}
            <mesh ref={gridRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.49, 0]}>
                <ringGeometry args={[0.5, 3.5, 64, 8]} />
                <meshBasicMaterial color="#475569" transparent opacity={0.15} side={THREE.DoubleSide} wireframe />
            </mesh>
            
            {/* Outer ring */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.48, 0]}>
                <ringGeometry args={[3.3, 3.5, 64]} />
                <meshStandardMaterial
                    color="#64748b"
                    emissive="#475569"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* Center clash effect */}
            {isClashing && (
                <>
                    <mesh ref={clashRef}>
                        <octahedronGeometry args={[0.4, 0]} />
                        <meshStandardMaterial
                            color="#fbbf24"
                            emissive="#fbbf24"
                            emissiveIntensity={3}
                            transparent
                            opacity={0.9}
                        />
                    </mesh>
                    <pointLight position={[0, 0, 0]} intensity={8} color="#fbbf24" distance={6} />
                    <Sparkles
                        count={80}
                        scale={2}
                        size={6}
                        speed={4}
                        color="#fbbf24"
                    />
                </>
            )}

            {/* Round indicator */}
            <Html position={[0, -1.2, 0]} center distanceFactor={10}>
                <div className="text-zinc-400 font-black text-2xl tracking-[0.3em] pointer-events-none select-none drop-shadow-[0_0_10px_rgba(100,116,139,0.5)]">
                    {round > 0 ? `ROUND ${round}` : "READY"}
                </div>
            </Html>

            {/* Ambient particles */}
            <Sparkles
                count={150}
                scale={10}
                size={1.5}
                speed={0.2}
                color="#475569"
                opacity={0.4}
            />
        </group>
    );
}

// Energy beam attack effect
function EnergyBeam({ from, to, color, active }: { from: [number, number, number]; to: [number, number, number]; color: string; active: boolean }) {
    const beamRef = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (!active) return;
        const t = state.clock.elapsedTime;
        
        if (beamRef.current) {
            beamRef.current.scale.y = 0.8 + Math.sin(t * 25) * 0.4;
            beamRef.current.scale.z = 0.8 + Math.sin(t * 25) * 0.4;
        }
        
        if (coreRef.current) {
            coreRef.current.scale.setScalar(1.5 + Math.sin(t * 30) * 0.5);
        }
    });

    if (!active) return null;

    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().lerp(end, 0.5);
    const length = start.distanceTo(end);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    return (
        <group position={[mid.x, mid.y, mid.z]} rotation={[0, 0, angle]}>
            {/* Core beam */}
            <mesh ref={beamRef} rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.08, 0.08, length, 16]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2}
                    transparent
                    opacity={0.9}
                />
            </mesh>
            
            {/* Outer glow */}
            <mesh rotation={[0, Math.PI / 2, 0]}>
                <cylinderGeometry args={[0.15, 0.15, length, 16]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.3}
                />
            </mesh>
            
            {/* Impact point */}
            <mesh ref={coreRef} position={[length / 2, 0, 0]}>
                <sphereGeometry args={[0.15, 16, 16]} />
                <meshBasicMaterial color="#ffffff" />
            </mesh>
            
            {/* Beam light */}
            <pointLight position={[0, 0, 0]} intensity={5} color={color} distance={3} />
        </group>
    );
}

// Impact explosion effect
function ImpactEffect({ position, active, color }: { position: [number, number, number]; active: boolean; color: string }) {
    const [scale, setScale] = useState(0);
    const [rings, setRings] = useState<number[]>([]);
    
    useEffect(() => {
        if (active) {
            setScale(0);
            setRings([]);
            
            const interval = setInterval(() => {
                setScale(s => {
                    if (s >= 3) {
                        clearInterval(interval);
                        return 0;
                    }
                    return s + 0.3;
                });
            }, 40);
            
            // Create expanding rings
            const ringInterval = setInterval(() => {
                setRings(r => {
                    if (r.length >= 3) {
                        clearInterval(ringInterval);
                        return r;
                    }
                    return [...r, 0];
                });
            }, 100);
            
            return () => {
                clearInterval(interval);
                clearInterval(ringInterval);
            };
        }
    }, [active]);

    if (!active || scale === 0) return null;

    return (
        <group position={position}>
            {/* Core explosion */}
            <mesh scale={scale}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshBasicMaterial color={color} transparent opacity={Math.max(0, 1 - scale / 3)} />
            </mesh>
            
            {/* Inner flash */}
            <mesh scale={scale * 0.6}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={Math.max(0, 1 - scale / 2)} />
            </mesh>
            
            {/* Shockwave rings */}
            {rings.map((_, i) => (
                <mesh key={i} scale={scale * (1 + i * 0.3)} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.5, 0.05, 16, 32]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={Math.max(0, 0.6 - scale / 4)}
                    />
                </mesh>
            ))}
            
            {/* Impact light */}
            <pointLight intensity={10 * (1 - scale / 3)} color={color} distance={5} />
        </group>
    );
}

// Camera controller for dynamic shots
function CameraController({ phase, attacker }: { phase: string; attacker: string }) {
    const { camera } = useThree();
    
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        
        if (phase === "duel") {
            // Dynamic camera during battle
            camera.position.x = Math.sin(t * 0.3) * 2;
            camera.position.y = 1 + Math.sin(t * 0.5) * 0.5;
            camera.position.z = 6 + Math.sin(t * 0.2) * 1;
        } else if (phase === "scoring" || phase === "review") {
            // Pull back for overview
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.02);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, 2, 0.02);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, 8, 0.02);
        } else {
            // Default position
            camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.05);
            camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.5, 0.05);
            camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7, 0.05);
        }
        
        camera.lookAt(0, 0, 0);
    });

    return null;
}

// Main Battle Arena component
export default function BattleArena3D({
    currentPhase,
    currentAttacker,
    scores,
    currentRound,
    battleStatus,
    elapsedTime,
}: BattleArena3DProps) {
    const isGeminiAttacking = currentAttacker.toLowerCase().includes("gemini");
    const isOpenAIAttacking = currentAttacker.toLowerCase().includes("openai") || currentAttacker.toLowerCase().includes("gpt");
    const isClashing = currentPhase === "duel" && currentRound > 0;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black">
            {/* Status overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
                {/* Gemini score card */}
                <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-cyan-500/30">
                    <div className="text-[10px] text-cyan-400 font-bold tracking-widest mb-1">GEMINI</div>
                    <div className="text-2xl font-black text-cyan-400">{scores.gemini}</div>
                </div>

                {/* Center status */}
                <div className="flex flex-col items-center">
                    <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2 border border-zinc-700">
                        <div className="text-[10px] text-zinc-500 font-bold tracking-widest text-center">
                            {currentPhase === "duel" ? `ROUND ${currentRound}` : currentPhase.toUpperCase()}
                        </div>
                        <div className="text-lg font-mono text-zinc-300">{formatTime(elapsedTime)}</div>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400 max-w-[200px] text-center truncate">
                        {battleStatus}
                    </div>
                </div>

                {/* OpenAI score card */}
                <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-emerald-500/30">
                    <div className="text-[10px] text-emerald-400 font-bold tracking-widest mb-1">GPT-5</div>
                    <div className="text-2xl font-black text-emerald-400">{scores.openai}</div>
                </div>
            </div>

            {/* Phase indicator bar */}
            <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                <div className="flex gap-1 justify-center">
                    {["initial", "duel", "scoring", "review", "complete"].map((phase) => (
                        <div
                            key={phase}
                            className={`h-1 flex-1 max-w-[60px] rounded-full transition-all ${
                                currentPhase === phase
                                    ? "bg-white"
                                    : ["initial", "duel", "scoring", "review", "complete"].indexOf(currentPhase) >
                                      ["initial", "duel", "scoring", "review", "complete"].indexOf(phase)
                                    ? "bg-zinc-600"
                                    : "bg-zinc-800"
                            }`}
                        />
                    ))}
                </div>
                <div className="text-[10px] text-zinc-500 text-center mt-2 uppercase tracking-widest">
                    {currentPhase.replace("_", " ")}
                </div>
            </div>

            {/* 3D Canvas */}
            <Canvas camera={{ position: [0, 0.5, 7], fov: 50 }}>
                <color attach="background" args={["#0a0a0f"]} />
                <fog attach="fog" args={["#0a0a0f", 5, 15]} />
                
                {/* Lighting */}
                <ambientLight intensity={0.2} />
                <pointLight position={[-5, 5, 5]} intensity={1} color="#00d4ff" />
                <pointLight position={[5, 5, 5]} intensity={1} color="#10b981" />
                <pointLight position={[0, -2, 3]} intensity={0.5} color="#fbbf24" />
                
                {/* Fighters */}
                <GeminiFighter 
                    isAttacking={isGeminiAttacking} 
                    isHit={isOpenAIAttacking} 
                    score={scores.gemini} 
                />
                <OpenAIFighter 
                    isAttacking={isOpenAIAttacking} 
                    isHit={isGeminiAttacking} 
                    score={scores.openai} 
                />
                
                {/* Battle zone */}
                <BattleZone isClashing={isClashing} round={currentRound} />
                
                {/* Energy beams */}
                <EnergyBeam 
                    from={[-2, 0, 0]} 
                    to={[0, 0, 0]} 
                    color="#00d4ff" 
                    active={isGeminiAttacking} 
                />
                <EnergyBeam 
                    from={[2, 0, 0]} 
                    to={[0, 0, 0]} 
                    color="#10b981" 
                    active={isOpenAIAttacking} 
                />
                
                {/* Impact effects */}
                <ImpactEffect 
                    position={[1.5, 0, 0]} 
                    active={isGeminiAttacking} 
                    color="#00d4ff" 
                />
                <ImpactEffect 
                    position={[-1.5, 0, 0]} 
                    active={isOpenAIAttacking} 
                    color="#10b981" 
                />
                
                {/* Background stars */}
                <Stars 
                    radius={50} 
                    depth={50} 
                    count={1000} 
                    factor={4} 
                    saturation={0} 
                    fade 
                    speed={0.5} 
                />
                
                {/* Camera controller */}
                <CameraController phase={currentPhase} attacker={currentAttacker} />
            </Canvas>

            {/* Victory overlay */}
            {currentPhase === "complete" && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center">
                        <div className="text-4xl font-black text-white mb-2">
                            {scores.gemini > scores.openai ? "GEMINI WINS" : scores.openai > scores.gemini ? "GPT-5 WINS" : "DRAW"}
                        </div>
                        <div className="text-zinc-400">
                            Final Score: {scores.gemini} - {scores.openai}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

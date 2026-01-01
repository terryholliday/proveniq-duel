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

// Gemini Fighter - Blue/Cyan crystalline entity
function GeminiFighter({ isAttacking, isHit, score }: { isAttacking: boolean; isHit: boolean; score: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const [hitFlash, setHitFlash] = useState(false);

    useEffect(() => {
        if (isHit) {
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 200);
        }
    }, [isHit]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        
        // Idle floating animation
        meshRef.current.position.y = Math.sin(t * 2) * 0.1;
        meshRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
        
        // Attack lunge
        if (isAttacking) {
            meshRef.current.position.x = -2.5 + Math.sin(t * 15) * 0.8;
            meshRef.current.rotation.z = Math.sin(t * 20) * 0.3;
        } else {
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, -2.5, 0.1);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
        }

        // Hit recoil
        if (hitFlash) {
            meshRef.current.position.x = -3;
        }

        // Glow pulse
        if (glowRef.current) {
            const scale = 1.2 + Math.sin(t * 3) * 0.1;
            glowRef.current.scale.setScalar(scale);
        }
    });

    return (
        <group position={[-2.5, 0, 0]}>
            {/* Core body */}
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[0.6, 2]} />
                <MeshDistortMaterial
                    color={hitFlash ? "#ff0000" : "#00d4ff"}
                    emissive={hitFlash ? "#ff0000" : "#0066ff"}
                    emissiveIntensity={isAttacking ? 2 : 0.8}
                    distort={isAttacking ? 0.6 : 0.3}
                    speed={isAttacking ? 8 : 3}
                    roughness={0.1}
                    metalness={0.9}
                />
            </mesh>
            
            {/* Outer glow */}
            <mesh ref={glowRef} scale={1.2}>
                <icosahedronGeometry args={[0.6, 1]} />
                <meshBasicMaterial color="#00d4ff" transparent opacity={0.15} wireframe />
            </mesh>

            {/* Energy rings */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.9, 0.02, 16, 64]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
            </mesh>
            <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
                <torusGeometry args={[0.85, 0.015, 16, 64]} />
                <meshBasicMaterial color="#0088ff" transparent opacity={0.4} />
            </mesh>

            {/* Score indicator */}
            <Html position={[0, 1.4, 0]} center distanceFactor={8}>
                <div className="text-center pointer-events-none select-none">
                    <div className="text-[10px] text-cyan-400 font-bold tracking-widest">GEMINI</div>
                    <div className="text-2xl font-black text-cyan-300">{score}</div>
                </div>
            </Html>

            {/* Attack trail particles */}
            {isAttacking && (
                <Sparkles
                    count={30}
                    scale={2}
                    size={3}
                    speed={2}
                    color="#00ffff"
                />
            )}
        </group>
    );
}

// OpenAI Fighter - Green/Emerald organic entity
function OpenAIFighter({ isAttacking, isHit, score }: { isAttacking: boolean; isHit: boolean; score: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const [hitFlash, setHitFlash] = useState(false);

    useEffect(() => {
        if (isHit) {
            setHitFlash(true);
            setTimeout(() => setHitFlash(false), 200);
        }
    }, [isHit]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        
        // Idle floating animation
        meshRef.current.position.y = Math.sin(t * 2 + Math.PI) * 0.1;
        meshRef.current.rotation.y = Math.sin(t * 0.5 + Math.PI) * 0.2 + Math.PI;
        
        // Attack lunge
        if (isAttacking) {
            meshRef.current.position.x = 2.5 - Math.sin(t * 15) * 0.8;
            meshRef.current.rotation.z = -Math.sin(t * 20) * 0.3;
        } else {
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, 2.5, 0.1);
            meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, 0, 0.1);
        }

        // Hit recoil
        if (hitFlash) {
            meshRef.current.position.x = 3;
        }

        // Glow pulse
        if (glowRef.current) {
            const scale = 1.2 + Math.sin(t * 3 + Math.PI) * 0.1;
            glowRef.current.scale.setScalar(scale);
        }
    });

    return (
        <group position={[2.5, 0, 0]}>
            {/* Core body */}
            <mesh ref={meshRef}>
                <dodecahedronGeometry args={[0.55, 1]} />
                <MeshDistortMaterial
                    color={hitFlash ? "#ff0000" : "#10b981"}
                    emissive={hitFlash ? "#ff0000" : "#059669"}
                    emissiveIntensity={isAttacking ? 2 : 0.8}
                    distort={isAttacking ? 0.5 : 0.25}
                    speed={isAttacking ? 6 : 2}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>
            
            {/* Outer glow */}
            <mesh ref={glowRef} scale={1.2}>
                <dodecahedronGeometry args={[0.55, 0]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.15} wireframe />
            </mesh>

            {/* Energy rings */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.85, 0.02, 16, 64]} />
                <meshBasicMaterial color="#34d399" transparent opacity={0.6} />
            </mesh>
            <mesh rotation={[Math.PI / 3, -Math.PI / 4, 0]}>
                <torusGeometry args={[0.8, 0.015, 16, 64]} />
                <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
            </mesh>

            {/* Score indicator */}
            <Html position={[0, 1.4, 0]} center distanceFactor={8}>
                <div className="text-center pointer-events-none select-none">
                    <div className="text-[10px] text-emerald-400 font-bold tracking-widest">GPT-5</div>
                    <div className="text-2xl font-black text-emerald-300">{score}</div>
                </div>
            </Html>

            {/* Attack trail particles */}
            {isAttacking && (
                <Sparkles
                    count={30}
                    scale={2}
                    size={3}
                    speed={2}
                    color="#34d399"
                />
            )}
        </group>
    );
}

// Central battle zone with clash effects
function BattleZone({ isClashing, round }: { isClashing: boolean; round: number }) {
    const ringRef = useRef<THREE.Mesh>(null);
    const clashRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        
        if (ringRef.current) {
            ringRef.current.rotation.z = t * 0.5;
        }
        
        if (clashRef.current && isClashing) {
            clashRef.current.scale.setScalar(1 + Math.sin(t * 20) * 0.3);
            clashRef.current.rotation.z = t * 5;
        }
    });

    return (
        <group position={[0, 0, 0]}>
            {/* Arena floor ring */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
                <ringGeometry args={[3, 3.2, 64]} />
                <meshBasicMaterial color="#334155" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            
            {/* Inner ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
                <ringGeometry args={[2.8, 2.85, 64]} />
                <meshBasicMaterial color="#475569" transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>

            {/* Clash effect */}
            {isClashing && (
                <mesh ref={clashRef}>
                    <octahedronGeometry args={[0.3, 0]} />
                    <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
                </mesh>
            )}

            {/* Round indicator */}
            <Html position={[0, -1.2, 0]} center distanceFactor={10}>
                <div className="text-zinc-500 font-bold text-lg tracking-widest pointer-events-none select-none">
                    {round > 0 ? `ROUND ${round}` : "READY"}
                </div>
            </Html>

            {/* Ambient particles */}
            <Sparkles
                count={100}
                scale={8}
                size={1}
                speed={0.3}
                color="#475569"
                opacity={0.3}
            />
        </group>
    );
}

// Energy beam attack effect
function EnergyBeam({ from, to, color, active }: { from: [number, number, number]; to: [number, number, number]; color: string; active: boolean }) {
    const beamRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (!beamRef.current || !active) return;
        const t = state.clock.elapsedTime;
        beamRef.current.scale.x = 0.5 + Math.sin(t * 30) * 0.3;
        beamRef.current.scale.y = 0.5 + Math.sin(t * 30) * 0.3;
    });

    if (!active) return null;

    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().lerp(end, 0.5);
    const length = start.distanceTo(end);
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    return (
        <group position={[mid.x, mid.y, mid.z]} rotation={[0, 0, angle]}>
            <mesh ref={beamRef}>
                <cylinderGeometry args={[0.05, 0.05, length, 8]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>
            <Trail
                width={0.5}
                length={4}
                color={color}
                attenuation={(t) => t * t}
            >
                <mesh position={[length / 2, 0, 0]}>
                    <sphereGeometry args={[0.1, 8, 8]} />
                    <meshBasicMaterial color={color} />
                </mesh>
            </Trail>
        </group>
    );
}

// Impact explosion effect
function ImpactEffect({ position, active, color }: { position: [number, number, number]; active: boolean; color: string }) {
    const [scale, setScale] = useState(0);
    
    useEffect(() => {
        if (active) {
            setScale(0);
            const interval = setInterval(() => {
                setScale(s => {
                    if (s >= 2) {
                        clearInterval(interval);
                        return 0;
                    }
                    return s + 0.2;
                });
            }, 30);
            return () => clearInterval(interval);
        }
    }, [active]);

    if (!active || scale === 0) return null;

    return (
        <group position={position}>
            <mesh scale={scale}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={1 - scale / 2} />
            </mesh>
            <mesh scale={scale * 0.7}>
                <sphereGeometry args={[0.3, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={1 - scale / 2} />
            </mesh>
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

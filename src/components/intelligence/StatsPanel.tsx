"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, Clock, Target, TrendingUp } from "lucide-react";
import { calculateStats, DuelStats } from "@/lib/duel-utils";

interface StatsPanelProps {
    onClose: () => void;
}

export default function StatsPanel({ onClose }: StatsPanelProps) {
    const stats = calculateStats();
    
    const winRate = stats.totalDuels > 0 
        ? Math.round((stats.geminiWins / stats.totalDuels) * 100) 
        : 50;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 rounded-xl bg-zinc-950 border border-zinc-800"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Historical Stats</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-zinc-500 hover:text-white text-xs"
                >
                    ✕
                </button>
            </div>
            
            {stats.totalDuels === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                    No duels recorded yet. Start your first duel!
                </div>
            ) : (
                <>
                    {/* Total Duels */}
                    <div className="text-center mb-4">
                        <div className="text-4xl font-mono font-black text-white">{stats.totalDuels}</div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Duels</div>
                    </div>
                    
                    {/* Win/Loss Record */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-center">
                            <div className="text-xl font-mono font-bold text-blue-400">{stats.geminiWins}</div>
                            <div className="text-[9px] text-zinc-500">Gemini Wins</div>
                        </div>
                        <div className="p-2 rounded-lg bg-zinc-800 text-center">
                            <div className="text-xl font-mono font-bold text-zinc-400">{stats.ties}</div>
                            <div className="text-[9px] text-zinc-500">Ties</div>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
                            <div className="text-xl font-mono font-bold text-emerald-400">{stats.openaiWins}</div>
                            <div className="text-[9px] text-zinc-500">GPT Wins</div>
                        </div>
                    </div>
                    
                    {/* Win Rate Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
                            <span>Gemini</span>
                            <span>GPT-5.2</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                            <div 
                                className="h-full bg-blue-500"
                                style={{ width: `${winRate}%` }}
                            />
                            <div 
                                className="h-full bg-emerald-500"
                                style={{ width: `${100 - winRate}%` }}
                            />
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-zinc-900 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <div>
                                <div className="text-sm font-mono text-white">{Math.floor(stats.averageTime / 60)}:{(stats.averageTime % 60).toString().padStart(2, '0')}</div>
                                <div className="text-[9px] text-zinc-500">Avg Time</div>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-zinc-900 flex items-center gap-2">
                            <Zap className="w-3 h-3 text-zinc-500" />
                            <div>
                                <div className="text-sm font-mono text-white">{stats.averageRounds}</div>
                                <div className="text-[9px] text-zinc-500">Avg Rounds</div>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-zinc-900 flex items-center gap-2">
                            <Target className="w-3 h-3 text-zinc-500" />
                            <div>
                                <div className="text-sm font-mono text-white">{stats.consensusRate}%</div>
                                <div className="text-[9px] text-zinc-500">Consensus</div>
                            </div>
                        </div>
                        <div className="p-2 rounded-lg bg-zinc-900 flex items-center gap-2">
                            <Trophy className="w-3 h-3 text-zinc-500" />
                            <div>
                                <div className="text-sm font-mono text-white">
                                    {stats.geminiAvgScore} / {stats.openaiAvgScore}
                                </div>
                                <div className="text-[9px] text-zinc-500">Avg Scores</div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
}

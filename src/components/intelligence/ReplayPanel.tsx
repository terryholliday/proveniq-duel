"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Trash2, Clock, Trophy, ChevronRight } from "lucide-react";
import { getDuelSessions, deleteDuelSession, DuelSession } from "@/lib/duel-utils";

interface ReplayPanelProps {
    onReplay: (session: DuelSession) => void;
    onClose: () => void;
}

export default function ReplayPanel({ onReplay, onClose }: ReplayPanelProps) {
    const [sessions, setSessions] = useState(getDuelSessions());
    
    const handleDelete = (id: string) => {
        deleteDuelSession(id);
        setSessions(getDuelSessions());
    };
    
    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 max-h-96 overflow-hidden flex flex-col"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Replay History</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-zinc-500 hover:text-white text-xs"
                >
                    ✕
                </button>
            </div>
            
            {sessions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                    No saved duels yet. Complete a duel to save it!
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                    {sessions.map((session) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-white truncate mb-1">
                                        {session.prompt.slice(0, 50)}...
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(session.elapsedTime)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Trophy className="w-3 h-3" />
                                            {session.winner === "gemini" ? "Gemini" : session.winner === "openai" ? "GPT-5.2" : "Tie"}
                                        </span>
                                        <span>{formatDate(session.timestamp)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onReplay(session)}
                                        className="p-1.5 rounded hover:bg-zinc-700 text-purple-400"
                                        title="Replay"
                                    >
                                        <Play className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="p-1.5 rounded hover:bg-zinc-700 text-red-400"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Score preview */}
                            {session.scorecard && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                                        <div 
                                            className="h-full bg-blue-500"
                                            style={{ width: `${session.scorecard.geminiScore}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-zinc-500">
                                        {session.scorecard.geminiScore} - {session.scorecard.openaiScore}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex justify-end">
                                        <div 
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${session.scorecard.openaiScore}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

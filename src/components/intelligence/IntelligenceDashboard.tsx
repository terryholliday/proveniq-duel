"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, RotateCcw, ChevronRight, Code, Terminal, MessageSquare, Cpu, CheckCircle2, AlertCircle, ShieldCheck, Target, Swords } from "lucide-react";
import { Iteration, AdjudicationResult, DuelScorecard } from "@/lib/intelligence/types";
import { AdminTask } from "@/lib/intelligence/orchestrator";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { soundEngine, saveDuelSession, generateSessionId, exportToClipboard, DuelSession } from "@/lib/duel-utils";
import StatsPanel from "./StatsPanel";
import DiffViewer from "./DiffViewer";
import ReplayPanel from "./ReplayPanel";
import PromptAnalyzer from "./PromptAnalyzer";
import dynamic from "next/dynamic";

const BattleArena3D = dynamic(() => import("./BattleArena3D"), { ssr: false });

export default function IntelligenceDashboard() {
    const [task, setTask] = useState("");
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const [adjudication, setAdjudication] = useState<AdjudicationResult | null>(null);
    const [duelSession, setDuelSession] = useState<DuelSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIteration, setSelectedIteration] = useState<number | null>(null);
    const [mode, setMode] = useState<"hybrid" | "orchestrate">("hybrid");
    const [orchestratedTasks, setOrchestratedTasks] = useState<AdminTask[]>([]);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Battle state
    const [battleStatus, setBattleStatus] = useState<string>("");
    const [currentRound, setCurrentRound] = useState(0);
    const [scores, setScores] = useState<{ gemini: number; openai: number }>({ gemini: 0, openai: 0 });
    const [currentAttacker, setCurrentAttacker] = useState<string>("");
    const [battleLog, setBattleLog] = useState<string[]>([]);
    const [currentPhase, setCurrentPhase] = useState<"initial" | "duel" | "scoring" | "review" | "complete">("initial");
    const [scorecard, setScorecard] = useState<DuelScorecard | null>(null);
    const [awaitingDecision, setAwaitingDecision] = useState(false);
    const [geminiCode, setGeminiCode] = useState<string>("");
    const [openaiCode, setOpenaiCode] = useState<string>("");

    // Feature state
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showStats, setShowStats] = useState(false);
    const [showReplay, setShowReplay] = useState(false);
    const [showDiff, setShowDiff] = useState(false);
    const [copied, setCopied] = useState<"gemini" | "openai" | null>(null);

    // Timer effect
    useEffect(() => {
        if (loading) {
            setElapsedTime(0);
            timerRef.current = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [loading]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const playSound = (type: "punch" | "victory" | "bell" | "error") => {
        if (!soundEnabled) return;
        switch (type) {
            case "punch": soundEngine.playPunch(); break;
            case "victory": soundEngine.playVictory(); break;
            case "bell": soundEngine.playBell(); break;
            case "error": soundEngine.playError(); break;
        }
    };

    // Save session when duel completes
    useEffect(() => {
        if (currentPhase === "complete" && iterations.length > 0) {
            const session: DuelSession = {
                id: generateSessionId(),
                timestamp: new Date().toISOString(),
                prompt: task,
                mode,
                iterations,
                scorecard,
                winner: scorecard?.winner || null,
                elapsedTime,
                geminiCode,
                openaiCode,
            };
            saveDuelSession(session);
        }
    }, [currentPhase]);

    const startRefinement = async () => {
        if (!task) return;
        setLoading(true);
        setError(null);
        setIterations([]);
        setAdjudication(null);
        setSelectedIteration(null);

        try {
            const response = await fetch("/api/intelligence/refine-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task, config: { maxIterations: 3 } }),
            });

            if (!response.ok) throw new Error("Stream request failed");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No response body");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        switch (data.type) {
                            case "start":
                                setBattleStatus(data.message);
                                setBattleLog(prev => [...prev, data.message]);
                                playSound("bell");
                                break;
                            case "phase":
                                setCurrentPhase(data.phase);
                                setBattleStatus(data.message);
                                setBattleLog(prev => [...prev, data.message]);
                                break;
                            case "round":
                                setCurrentRound(data.round);
                                setCurrentAttacker(data.attacker);
                                setBattleStatus(data.commentary);
                                setScores(data.scores);
                                if (data.phase) setCurrentPhase(data.phase);
                                const label = data.isGeneration ? `🎯 ${data.attacker}` : `⚔️ R${data.round}`;
                                setBattleLog(prev => [...prev, `${label}: ${data.commentary}`]);
                                if (data.iteration) {
                                    setIterations(prev => [...prev, data.iteration]);
                                    setSelectedIteration(data.iteration.index);
                                }
                                if (!data.isGeneration) playSound("punch");
                                break;
                            case "scoring":
                                setCurrentPhase("scoring");
                                setBattleStatus(data.message);
                                setBattleLog(prev => [...prev, data.message]);
                                break;
                            case "scorecard":
                                setScorecard(data.scorecard);
                                setBattleStatus(data.message);
                                break;
                            case "review":
                                setCurrentPhase("review");
                                setBattleStatus(data.message);
                                setScores(data.scores);
                                setScorecard(data.scorecard);
                                setAwaitingDecision(data.awaitingUserDecision || false);
                                if (data.geminiCode) setGeminiCode(data.geminiCode);
                                if (data.openaiCode) setOpenaiCode(data.openaiCode);
                                if (data.scorecard?.consensusReached) playSound("victory");
                                break;
                            case "complete":
                                setCurrentPhase("complete");
                                setBattleStatus(data.message);
                                setScores(data.scores);
                                setAdjudication(data.adjudication);
                                break;
                        }
                    } catch (e) { console.error("Parse error:", e); }
                }
            }
        } catch (error: any) {
            console.error("Refinement failed:", error);
            setError(error.message || "An unexpected error occurred");
            playSound("error");
        } finally {
            setLoading(false);
        }
    };

    const startOrchestration = async () => {
        if (!task) return;
        setLoading(true);
        setOrchestratedTasks([]);
        setIterations([]);
        setAdjudication(null);
        setDuelSession(null);

        try {
            const response = await fetch("/api/intelligence/orchestrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ objective: task }),
            });
            const data = await response.json();
            if (data.tasks) {
                setOrchestratedTasks(data.tasks);
            }
        } catch (error) {
            console.error("Orchestration failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const startHybrid = async () => {
        if (!task) return;
        setLoading(true);
        setError(null);
        setIterations([]);
        setAdjudication(null);
        setDuelSession(null);

        try {
            const response = await fetch("/api/intelligence/hybrid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ task, config: { maxIterations: 3 } }),
            });

            if (!response.ok) throw new Error("Hybrid execution failed");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error("No response body");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        switch (data.type) {
                            case "start":
                                setBattleStatus(data.message);
                                setBattleLog(prev => [...prev, data.message]);
                                playSound("bell");
                                break;
                            case "code_iteration":
                                setIterations(prev => [...prev, data.iteration]);
                                setSelectedIteration(data.iteration.index);
                                setBattleLog(prev => [...prev, `💻 Code: ${data.iteration.provider} iteration ${data.iteration.index + 1}`]);
                                break;
                            case "strategy_update":
                                setDuelSession(data.session);
                                const lastRound = data.session.rounds[data.session.rounds.length - 1];
                                if (lastRound) {
                                    setBattleLog(prev => [...prev, `🎯 Strategy: Round ${data.session.rounds.length}`]);
                                }
                                break;
                            case "complete":
                                setIterations(data.codeIterations);
                                setAdjudication(data.adjudication);
                                setDuelSession(data.strategySession);
                                setBattleStatus("✅ Dual-track execution complete!");
                                setBattleLog(prev => [...prev, "✅ Both tracks completed successfully"]);
                                playSound("victory");
                                break;
                            case "error":
                                setError(data.message);
                                playSound("error");
                                break;
                        }
                    } catch (e) { console.error("Parse error:", e); }
                }
            }
        } catch (error: any) {
            console.error("Hybrid execution failed:", error);
            setError(error.message || "An unexpected error occurred");
            playSound("error");
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        switch (mode) {
            case "hybrid": return "Describe what you want to build. I'll generate code while debating the best approach...";
            case "orchestrate": return "Describe a high-level business objective...";
        }
    };

    const getButtonLabel = () => {
        if (loading) return "Processing...";
        switch (mode) {
            case "hybrid": return "Execute Dual-Track Analysis";
            case "orchestrate": return "Generate Admin Tasks";
        }
    };

    const handleAction = () => {
        switch (mode) {
            case "hybrid": return startHybrid();
            case "orchestrate": return startOrchestration();
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto p-6 min-h-screen bg-transparent text-zinc-100 font-sans selection:bg-zinc-800 selection:text-zinc-200">
            {/* Header */}
            <div className="flex flex-col gap-2 border-l-2 border-zinc-800 pl-6 py-2">
                <h1 className="text-4xl font-light tracking-tight text-white flex items-center gap-3">
                    <Cpu className="w-8 h-8 text-zinc-400" />
                    Duel-Core <span className="text-zinc-500 font-extralight italic">Intelligence Layer</span>
                </h1>
                <p className="text-zinc-400 text-sm tracking-wider uppercase">Iterative Refinement Registry v2.2</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Control Panel */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden group">


                        <div className="flex gap-2 mb-6 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <button
                                onClick={() => setMode("hybrid")}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === "hybrid" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                Code + Strategy
                            </button>
                            <button
                                onClick={() => setMode("orchestrate")}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === "orchestrate" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                Tasks
                            </button>
                        </div>

                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 block">
                            {mode === "hybrid" ? "Primary Objective" : "Business Goal"}
                        </label>
                        <textarea
                            className="w-full h-96 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700 resize-none"
                            placeholder={getPlaceholder()}
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                        />

                        <button
                            onClick={handleAction}
                            disabled={loading || !task}
                            className={`mt-6 w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] ${mode === "hybrid" ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "bg-red-500 text-white hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]"}`}
                        >
                            {loading ? (
                                <RotateCcw className="w-4 h-4 animate-spin" />
                            ) : (
                                mode === "hybrid" ? <Sparkles className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />
                            )}
                            {getButtonLabel()}
                        </button>
                    </div>

                    {/* Adjudication Truth Card (Only for Hybrid) */}
                    <AnimatePresence>
                        {adjudication && mode === "hybrid" && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col gap-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Truth Score</span>
                                    </div>
                                    <span className={`text-2xl font-black ${adjudication.score > 80 ? "text-emerald-500" : "text-amber-500"}`}>
                                        {adjudication.score}%
                                    </span>
                                </div>
                                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${adjudication.score}%` }}
                                        className={`h-full ${adjudication.score > 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                                    />
                                </div>
                                <p className="text-sm text-zinc-400 leading-snug italic">
                                    &ldquo;{adjudication.analysis}&rdquo;
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Iteration Timeline (Only for Hybrid) */}
                    {mode === "hybrid" && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2">Refinement Registry</h3>
                            <AnimatePresence mode="popLayout">
                                {iterations.length === 0 && !loading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`p-6 text-center border-2 border-dashed rounded-2xl text-sm italic ${error ? "border-red-500/50 bg-red-500/10 text-red-400" : "border-zinc-800 text-zinc-600"}`}
                                    >
                                        {error ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <AlertCircle className="w-5 h-5" />
                                                <span>{error}</span>
                                            </div>
                                        ) : (
                                            "Awaiting initialization..."
                                        )}
                                    </motion.div>
                                )}
                                {iterations.map((iter, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        onClick={() => setSelectedIteration(idx)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${selectedIteration === idx
                                            ? "bg-zinc-100 border-zinc-100 text-black shadow-lg"
                                            : "bg-zinc-900/30 border-zinc-800 hover:border-zinc-600 text-zinc-400"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${selectedIteration === idx ? "bg-black text-white" : "bg-zinc-800 text-zinc-300"
                                                }`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-xs font-bold uppercase tracking-tighter ${selectedIteration === idx ? "text-black" : "text-zinc-200"}`}>
                                                        {iter.provider}
                                                    </p>
                                                    {iter.isConverged && (
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${selectedIteration === idx ? "bg-black text-white" : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"}`}>
                                                            Converged
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] opacity-60 tabular-nums">
                                                    {new Date(iter.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedIteration === idx ? "rotate-90" : "group-hover:translate-x-1"}`} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Right Content Area */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {/* 3D BATTLE ARENA - Show during hybrid execution */}
                        {loading && mode === "hybrid" ? (
                            <motion.div
                                key="battle-arena"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <BattleArena3D
                                    currentPhase={currentPhase}
                                    currentAttacker={currentAttacker}
                                    scores={scores}
                                    currentRound={currentRound}
                                    battleStatus={battleStatus}
                                    elapsedTime={elapsedTime}
                                />
                                {/* Battle Log below arena */}
                                <div className="mt-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 max-h-40 overflow-y-auto">
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Battle Log</div>
                                    <div className="space-y-1">
                                        {battleLog.slice(-8).map((log, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-xs text-zinc-400 font-mono"
                                            >
                                                {log}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ) : mode === "orchestrate" && orchestratedTasks.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="flex items-center gap-4 border-l-2 border-red-500 pl-4 py-1">
                                    <h2 className="text-xl font-bold text-white uppercase tracking-tight">Generated Action Items</h2>
                                    <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded font-mono">PUSHED_TO_MAIN</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {orchestratedTasks.map((t, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3 relative group overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                                                <Target className="w-10 h-10" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{t.assignee}</span>
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${t.priority === "High" ? "bg-red-500/20 text-red-500 border border-red-500/30" :
                                                    t.priority === "Medium" ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" :
                                                        "bg-zinc-800 text-zinc-500"
                                                    }`}>
                                                    {t.priority}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-bold text-zinc-100 group-hover:text-red-400 transition-colors uppercase leading-tight">{t.title}</h3>
                                            <div className="flex items-center gap-2 mt-2">
                                                <ShieldCheck className="w-3 h-3 text-zinc-600" />
                                                <span className="text-[10px] text-zinc-600 font-mono italic">Prompt Context Embedded</span>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-between items-center">
                                                <span className="text-[10px] text-zinc-500">Due: {t.dueDate}</span>
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[600px] rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center p-12 bg-zinc-950/20 backdrop-blur-3xl">
                                <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl hover:border-indigo-500/50 transition-colors">
                                    <Cpu className="w-8 h-8 text-zinc-600 animate-pulse" />
                                </div>
                                <h2 className="text-xl font-light text-zinc-200 mb-2 tracking-tight">
                                    System Idle
                                </h2>
                                <p className="max-w-xs text-sm text-zinc-500 leading-relaxed">
                                    {mode === "hybrid"
                                        ? "The intelligence layer is dormant. Initialize a dual-track sequence to activate the Gemini-OpenAI adjudication protocol."
                                        : "Autonomous orchestration is ready. Define a business goal to generate and route C-Level tasks to the command center."}
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, RotateCcw, ChevronRight, Code, Terminal, MessageSquare, Cpu, CheckCircle2, AlertCircle, ShieldCheck, Target, Swords } from "lucide-react";
import { Iteration, AdjudicationResult, DuelSession } from "@/lib/intelligence/types";
import { AdminTask } from "@/lib/intelligence/orchestrator";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function IntelligenceDashboard() {
    const [task, setTask] = useState("");
    const [iterations, setIterations] = useState<Iteration[]>([]);
    const [adjudication, setAdjudication] = useState<AdjudicationResult | null>(null);
    const [duelSession, setDuelSession] = useState<DuelSession | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIteration, setSelectedIteration] = useState<number | null>(null);
    const [mode, setMode] = useState<"refine" | "orchestrate" | "duel">("refine");
    const [orchestratedTasks, setOrchestratedTasks] = useState<AdminTask[]>([]);

    const startRefinement = async () => {
        if (!task) return;
        setLoading(true);
        setError(null);
        setIterations([]);
        setAdjudication(null);
        setSelectedIteration(null);
        setDuelSession(null);

        try {
            const response = await fetch("/api/intelligence/refine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    task,
                    config: { maxIterations: 7 }
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Refinement request failed");
            }

            if (data.iterations) {
                setIterations(data.iterations);
                setAdjudication(data.adjudication || null);
                setSelectedIteration(data.iterations.length - 1);
            }
        } catch (error: any) {
            console.error("Refinement failed:", error);
            setError(error.message || "An unexpected error occurred");
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

    const startDuel = async () => {
        if (!task) return;
        setLoading(true);
        setError(null);
        setDuelSession(null);
        setIterations([]);
        setAdjudication(null);

        try {
            const response = await fetch("/api/intelligence/duel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: task,
                    config: { maxIterations: 5 }
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Strategy Duel request failed");
            }

            if (data.id) {
                setDuelSession(data);
            }
        } catch (error: any) {
            console.error("Duel failed:", error);
            setError(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getPlaceholder = () => {
        switch (mode) {
            case "refine": return "Describe the logic or module to refine...";
            case "orchestrate": return "Describe the high-level business objective...";
            case "duel": return "Enter a strategic topic for debate (e.g., 'Monolith vs Microservices for a startup')...";
        }
    };

    const getButtonLabel = () => {
        if (loading) return "Processing...";
        switch (mode) {
            case "refine": return "Initialize Refinement";
            case "orchestrate": return "Generate Admin Tasks";
            case "duel": return "Commence Strategy Duel";
        }
    };

    const handleAction = () => {
        switch (mode) {
            case "refine": return startRefinement();
            case "orchestrate": return startOrchestration();
            case "duel": return startDuel();
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


                        <div className="flex gap-2 mb-6 p-1 bg-zinc-950 rounded-lg border border-zinc-800">
                            <button
                                onClick={() => setMode("refine")}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === "refine" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                Refine
                            </button>
                            <button
                                onClick={() => setMode("duel")}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === "duel" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                Strategy Duel
                            </button>
                            <button
                                onClick={() => setMode("orchestrate")}
                                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${mode === "orchestrate" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                                Orchestrate
                            </button>
                        </div>

                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 block">
                            {mode === "duel" ? "Debate Topic" : (mode === "refine" ? "Primary Objective" : "Business Goal")}
                        </label>
                        <textarea
                            className="w-full h-32 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-700 resize-none"
                            placeholder={getPlaceholder()}
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                        />

                        <button
                            onClick={handleAction}
                            disabled={loading || !task}
                            className={`mt-6 w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] ${mode === "duel" ? "bg-indigo-500 text-white hover:bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : (mode === "refine" ? "bg-zinc-100 text-black hover:bg-white" : "bg-red-500 text-white hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]")
                                }`}
                        >
                            {loading ? (
                                <RotateCcw className="w-4 h-4 animate-spin" />
                            ) : (
                                mode === "duel" ? <Swords className="w-4 h-4 fill-white" /> : <Play className={`w-4 h-4 ${mode === "refine" ? "fill-current" : "fill-white"}`} />
                            )}
                            {getButtonLabel()}
                        </button>
                    </div>

                    {/* Adjudication Truth Card (Only for Refine) */}
                    <AnimatePresence>
                        {adjudication && mode === "refine" && (
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

                    {/* Iteration Timeline (Only for Refine) */}
                    {mode === "refine" && (
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
                        {mode === "orchestrate" && orchestratedTasks.length > 0 ? (
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
                        ) : mode === "duel" && duelSession ? (
                            <motion.div
                                key="duel-view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col gap-6"
                            >
                                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl backdrop-blur-md">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                            <Swords className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Strategy Duel</span>
                                            <span className="text-sm font-medium text-zinc-200 line-clamp-1">{duelSession.topic}</span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${duelSession.status === "completed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                        duelSession.status === "error" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse"
                                        }`}>
                                        {duelSession.status}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-8 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar pb-20">
                                    {duelSession.rounds.map((round) => (
                                        <div key={round.index} className="flex flex-col gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Round {round.index + 1}</span>
                                                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {round.turns.map((turn, tIdx) => (
                                                    <motion.div
                                                        key={`${round.index}-${tIdx}`}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: tIdx * 0.1 }}
                                                        className={`p-6 rounded-2xl border flex flex-col gap-3 relative overflow-hidden ${turn.provider === "gemini" ? "bg-zinc-900 border-zinc-800" : "bg-black border-zinc-800"
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${turn.provider === "gemini" ? "bg-blue-400" : "bg-green-400"}`} />
                                                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{turn.model}</span>
                                                            </div>
                                                            {turn.isAgreement && (
                                                                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase">Consensus</span>
                                                            )}
                                                        </div>
                                                        <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed text-sm">
                                                            <div className="whitespace-pre-wrap">{turn.content}</div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {duelSession.consensus && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-8 rounded-3xl bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 text-center flex flex-col items-center gap-4 shadow-2xl mt-4"
                                        >
                                            <div className="p-3 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 mb-2">
                                                <ShieldCheck className="w-8 h-8" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-indigo-200 tracking-tight">Consensus Reached</h3>
                                            <p className="text-zinc-300 max-w-2xl leading-relaxed">
                                                {duelSession.consensus}
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        ) : selectedIteration !== null && mode === "refine" ? (
                            <motion.div
                                key={selectedIteration}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex flex-col gap-4 h-full"
                            >
                                {/* Visualizer Top Bar */}
                                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl backdrop-blur-md">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Active Core</span>
                                            <span className="text-sm font-medium text-zinc-200">{iterations[selectedIteration].model}</span>
                                        </div>
                                        <div className="w-[1px] h-8 bg-zinc-800" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">Status</span>
                                            <span className={`text-sm font-medium ${iterations[selectedIteration].isConverged ? "text-emerald-500" : "text-zinc-400"}`}>
                                                {iterations[selectedIteration].isConverged ? "OPTIMAL_CONVERGENCE" : "REFINEMENT_ACTIVE"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><Code className="w-4 h-4" /></button>
                                        <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><Terminal className="w-4 h-4" /></button>
                                        <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><MessageSquare className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {/* Code Window */}
                                <div className="flex-1 min-h-[500px] border border-zinc-800 rounded-2xl relative overflow-hidden bg-[#1e1e1e] group shadow-inner">
                                    <div className="absolute top-4 right-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] bg-zinc-800 px-3 py-1 rounded-full text-zinc-400 uppercase tracking-widest font-bold border border-zinc-700">Source Adjudicated</span>
                                    </div>
                                    <SyntaxHighlighter
                                        language="typescript"
                                        style={vscDarkPlus}
                                        customStyle={{
                                            margin: 0,
                                            padding: "24px",
                                            fontSize: "13px",
                                            lineHeight: "1.6",
                                            backgroundColor: "transparent",
                                        }}
                                        showLineNumbers
                                    >
                                        {iterations[selectedIteration].extractedCode}
                                    </SyntaxHighlighter>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[600px] rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center p-12 bg-zinc-950/20 backdrop-blur-3xl">
                                <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl hover:border-indigo-500/50 transition-colors">
                                    {mode === "duel" ? <Swords className="w-8 h-8 text-indigo-500 animate-pulse" /> : <Cpu className="w-8 h-8 text-zinc-600 animate-pulse" />}
                                </div>
                                <h2 className="text-xl font-light text-zinc-200 mb-2 tracking-tight">
                                    {mode === "duel" ? "Strategy Engine Idle" : "System Idle"}
                                </h2>
                                <p className="max-w-xs text-sm text-zinc-500 leading-relaxed">
                                    {mode === "refine"
                                        ? "The intelligence layer is dormant. Initialize a refinement sequence to activate the Gemini-OpenAI adjudication protocol."
                                        : mode === "duel"
                                            ? "The debate arena is empty. Propose a strategic topic to initiate the adversarial consensus loop."
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

"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Sparkles, RotateCcw, Cpu, CheckCircle2, XCircle, 
    Zap, GitMerge, Vote, ChevronDown, ChevronUp,
    Copy, Check
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { 
    CascadeSession, 
    CascadePhase, 
    ModelOutput, 
    CritiqueOutput, 
    ValidationVote,
    ModelProvider 
} from "@/lib/intelligence/types";

const PROVIDER_COLORS: Record<ModelProvider, { border: string; bg: string; text: string; glow: string }> = {
    gemini: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", glow: "shadow-blue-500/20" },
    openai: { border: "border-green-500/30", bg: "bg-green-500/10", text: "text-green-400", glow: "shadow-green-500/20" },
    claude: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-400", glow: "shadow-orange-500/20" },
};

const PROVIDER_LABELS: Record<ModelProvider, string> = {
    gemini: "Gemini 2.5 Pro",
    openai: "GPT-4o",
    claude: "Claude Sonnet 4",
};

const PHASE_LABELS: Record<CascadePhase, { label: string; icon: React.ReactNode; color: string }> = {
    generation: { label: "Generation", icon: <Sparkles className="w-4 h-4" />, color: "text-indigo-400" },
    critique: { label: "Critique", icon: <Zap className="w-4 h-4" />, color: "text-amber-400" },
    synthesis: { label: "Synthesis", icon: <GitMerge className="w-4 h-4" />, color: "text-purple-400" },
    validation: { label: "Validation", icon: <Vote className="w-4 h-4" />, color: "text-cyan-400" },
    complete: { label: "Complete", icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-400" },
    error: { label: "Error", icon: <XCircle className="w-4 h-4" />, color: "text-red-400" },
};

interface Props {
    session: CascadeSession | null;
    loading: boolean;
    onStart: (topic: string) => void;
}

export default function SynthesisCascadeView({ session, loading, onStart }: Props) {
    const [topic, setTopic] = useState("");
    const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([0]));
    const [copied, setCopied] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
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

    const toggleRound = (index: number) => {
        setExpandedRounds(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getCurrentPhase = (): CascadePhase => {
        if (!session || session.rounds.length === 0) return "generation";
        return session.rounds[session.rounds.length - 1].phase;
    };

    const renderModelOutput = (output: ModelOutput, showFull = false) => {
        const colors = PROVIDER_COLORS[output.provider];
        const content = showFull ? output.content : output.content.slice(0, 500) + (output.content.length > 500 ? "..." : "");
        
        return (
            <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
                <div className={`flex items-center justify-between px-3 py-2 border-b ${colors.border}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>
                            {output.provider}
                        </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">{output.latencyMs}ms</span>
                </div>
                <div className="p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                        {content}
                    </pre>
                </div>
            </div>
        );
    };

    const renderValidationVote = (vote: ValidationVote) => {
        const colors = PROVIDER_COLORS[vote.provider];
        return (
            <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-black uppercase tracking-widest ${colors.text}`}>
                        {vote.provider}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        vote.accept 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                        {vote.accept ? "ACCEPT" : "REJECT"}
                    </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{vote.reasoning.slice(0, 200)}...</p>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Header */}
            <div className="flex flex-col gap-2 border-l-2 border-purple-500/50 pl-6 py-2">
                <h1 className="text-3xl font-light tracking-tight text-white flex items-center gap-3">
                    <GitMerge className="w-7 h-7 text-purple-400" />
                    Synthesis Cascade
                    <span className="text-zinc-500 font-extralight italic text-xl">3-Model Truth Engine</span>
                </h1>
                <p className="text-zinc-400 text-sm tracking-wider">
                    Gemini · OpenAI · Claude — Generate → Critique → Synthesize → Validate
                </p>
            </div>

            {/* Input Section */}
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-xl">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 block">
                    Topic / Prompt
                </label>
                <textarea
                    className="w-full h-32 bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-zinc-700 resize-none"
                    placeholder="Describe what you want the three models to collaborate on..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={loading}
                />
                <button
                    onClick={() => onStart(topic)}
                    disabled={loading || !topic}
                    className="mt-4 w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <RotateCcw className="w-4 h-4 animate-spin" />
                            Running Cascade...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Start Synthesis Cascade
                        </>
                    )}
                </button>
            </div>

            {/* Status Bar */}
            {(loading || session) && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <div className="flex items-center gap-4">
                        {/* Phase Indicators */}
                        {(["generation", "critique", "synthesis", "validation"] as CascadePhase[]).map((phase, idx) => {
                            const phaseInfo = PHASE_LABELS[phase];
                            const currentPhase = getCurrentPhase();
                            const isActive = currentPhase === phase;
                            const isPast = ["generation", "critique", "synthesis", "validation"].indexOf(currentPhase) > idx;
                            
                            return (
                                <div key={phase} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold transition-all ${
                                        isActive 
                                            ? `${phaseInfo.color} bg-zinc-800 ring-1 ring-current` 
                                            : isPast 
                                                ? "text-emerald-400 bg-emerald-500/10" 
                                                : "text-zinc-600"
                                    }`}>
                                        {isPast ? <CheckCircle2 className="w-3 h-3" /> : phaseInfo.icon}
                                        <span className="uppercase tracking-wider">{phaseInfo.label}</span>
                                    </div>
                                    {idx < 3 && <div className={`w-4 h-px ${isPast ? "bg-emerald-500" : "bg-zinc-700"}`} />}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-zinc-500 font-mono">{formatTime(session?.totalLatencyMs ? Math.floor(session.totalLatencyMs / 1000) : elapsedTime)}</span>
                        {loading && <RotateCcw className="w-4 h-4 text-purple-400 animate-spin" />}
                        {session?.consensusReached && (
                            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                CONSENSUS
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* 3-Model Generation View */}
            {session && session.rounds.length > 0 && session.rounds[0].generations && (
                <div className="grid grid-cols-3 gap-4">
                    {session.rounds[0].generations.map((gen) => (
                        <motion.div
                            key={gen.provider}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex flex-col rounded-xl border ${PROVIDER_COLORS[gen.provider].border} bg-zinc-900/50 overflow-hidden`}
                        >
                            <div className={`flex items-center justify-between px-4 py-3 ${PROVIDER_COLORS[gen.provider].bg} border-b ${PROVIDER_COLORS[gen.provider].border}`}>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span className={`text-xs font-black uppercase tracking-widest ${PROVIDER_COLORS[gen.provider].text}`}>
                                        {gen.provider}
                                    </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono">{gen.latencyMs}ms</span>
                            </div>
                            <div className="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto p-4">
                                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
                                    {gen.content.slice(0, 1500)}{gen.content.length > 1500 ? "..." : ""}
                                </pre>
                            </div>
                            <div className="px-4 py-2 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-500">{gen.content.length.toLocaleString()} chars</span>
                                <span className="text-[10px] text-zinc-500 font-mono">{PROVIDER_LABELS[gen.provider]}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Rounds Timeline */}
            {session && session.rounds.length > 1 && (
                <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-2">
                        Cascade Rounds
                    </h3>
                    {session.rounds.slice(1).map((round, idx) => {
                        const phaseInfo = PHASE_LABELS[round.phase];
                        const isExpanded = expandedRounds.has(idx + 1);
                        
                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden"
                            >
                                <button
                                    onClick={() => toggleRound(idx + 1)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg bg-zinc-800 ${phaseInfo.color}`}>
                                            {phaseInfo.icon}
                                        </div>
                                        <div className="text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-zinc-200">
                                                    Round {round.index + 1}: {phaseInfo.label}
                                                </span>
                                                {round.synthesizer && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${PROVIDER_COLORS[round.synthesizer].bg} ${PROVIDER_COLORS[round.synthesizer].text}`}>
                                                        by {round.synthesizer.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            {round.votes && (
                                                <span className="text-xs text-zinc-500">
                                                    Votes: {round.votes.filter(v => v.accept).length}/{round.votes.length} Accept
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                                </button>
                                
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-zinc-800"
                                        >
                                            <div className="p-4 space-y-4">
                                                {/* Critiques */}
                                                {round.critiques && (
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {round.critiques.map((critique) => renderModelOutput(critique))}
                                                    </div>
                                                )}
                                                
                                                {/* Synthesis */}
                                                {round.synthesis && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                                            Synthesized Output
                                                        </div>
                                                        {renderModelOutput(round.synthesis, true)}
                                                    </div>
                                                )}
                                                
                                                {/* Votes */}
                                                {round.votes && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {round.votes.map((vote, vIdx) => (
                                                            <div key={vIdx}>{renderValidationVote(vote)}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Final Output */}
            {session?.finalOutput && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 overflow-hidden"
                >
                    <div className="flex items-center justify-between px-6 py-4 bg-emerald-500/10 border-b border-emerald-500/20">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm font-black uppercase tracking-widest text-emerald-400">
                                Final Synthesized Output
                            </span>
                            {session.consensusReached && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    2/3 CONSENSUS
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => copyToClipboard(session.finalOutput!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-xs font-bold"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    <div className="p-6 max-h-[500px] overflow-y-auto">
                        <SyntaxHighlighter
                            language="typescript"
                            style={vscDarkPlus}
                            customStyle={{
                                margin: 0,
                                padding: 0,
                                fontSize: "12px",
                                lineHeight: "1.6",
                                backgroundColor: "transparent",
                            }}
                            wrapLongLines
                        >
                            {session.finalOutput}
                        </SyntaxHighlighter>
                    </div>
                    <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                            {session.finalOutput.length.toLocaleString()} characters · {session.rounds.length} rounds · {Math.floor(session.totalLatencyMs / 1000)}s total
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                            Gemini + OpenAI + Claude
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {!session && !loading && (
                <div className="h-full min-h-[400px] rounded-2xl border border-zinc-800 flex flex-col items-center justify-center text-center p-12 bg-zinc-950/20 backdrop-blur-3xl">
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-orange-500/20 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
                        <GitMerge className="w-8 h-8 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-light text-zinc-200 mb-2 tracking-tight">
                        Synthesis Cascade Ready
                    </h2>
                    <p className="max-w-md text-sm text-zinc-500 leading-relaxed">
                        Three AI models will generate solutions, critique each other, synthesize the best elements, 
                        and vote on the final output. 2/3 consensus required.
                    </p>
                    <div className="flex items-center gap-4 mt-6">
                        <div className="flex items-center gap-1.5 text-xs text-blue-400">
                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                            Gemini
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-green-400">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            OpenAI
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-orange-400">
                            <div className="w-2 h-2 rounded-full bg-orange-400" />
                            Claude
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Lightbulb, AlertTriangle, CheckCircle } from "lucide-react";
import { analyzePromptQuality, PromptAnalysis } from "@/lib/duel-utils";

interface PromptAnalyzerProps {
    prompt: string;
}

export default function PromptAnalyzer({ prompt }: PromptAnalyzerProps) {
    if (!prompt || prompt.length < 5) return null;
    
    const analysis = analyzePromptQuality(prompt);
    const overallScore = Math.round((analysis.clarity + analysis.specificity) / 2);
    
    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-400";
        if (score >= 60) return "text-yellow-400";
        return "text-red-400";
    };
    
    const getScoreBg = (score: number) => {
        if (score >= 80) return "bg-emerald-500/20";
        if (score >= 60) return "bg-yellow-500/20";
        return "bg-red-500/20";
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800"
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Prompt Quality</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}>
                    {overallScore}%
                </div>
            </div>
            
            {/* Score bars */}
            <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-500 w-16">Clarity</span>
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysis.clarity}%` }}
                            className={`h-full ${analysis.clarity >= 80 ? "bg-emerald-500" : analysis.clarity >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                        />
                    </div>
                    <span className="text-[9px] text-zinc-500 w-8">{analysis.clarity}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-500 w-16">Specificity</span>
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${analysis.specificity}%` }}
                            className={`h-full ${analysis.specificity >= 80 ? "bg-emerald-500" : analysis.specificity >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                        />
                    </div>
                    <span className="text-[9px] text-zinc-500 w-8">{analysis.specificity}%</span>
                </div>
            </div>
            
            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
                <div className="space-y-1">
                    {analysis.suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px]">
                            <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                            <span className="text-zinc-400">{suggestion}</span>
                        </div>
                    ))}
                </div>
            )}
            
            {analysis.suggestions.length === 0 && (
                <div className="flex items-center gap-2 text-[10px]">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Great prompt! Ready for battle.</span>
                </div>
            )}
        </motion.div>
    );
}

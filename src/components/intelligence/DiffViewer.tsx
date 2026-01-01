"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Download, ExternalLink } from "lucide-react";
import { exportToClipboard, downloadAsFile } from "@/lib/duel-utils";

interface DiffViewerProps {
    geminiCode: string;
    openaiCode: string;
    onClose: () => void;
}

export default function DiffViewer({ geminiCode, openaiCode, onClose }: DiffViewerProps) {
    const [copiedGemini, setCopiedGemini] = useState(false);
    const [copiedOpenai, setCopiedOpenai] = useState(false);
    const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");
    
    const handleCopyGemini = async () => {
        await exportToClipboard(geminiCode);
        setCopiedGemini(true);
        setTimeout(() => setCopiedGemini(false), 2000);
    };
    
    const handleCopyOpenai = async () => {
        await exportToClipboard(openaiCode);
        setCopiedOpenai(true);
        setTimeout(() => setCopiedOpenai(false), 2000);
    };
    
    const geminiLines = geminiCode.split("\n");
    const openaiLines = openaiCode.split("\n");
    const maxLines = Math.max(geminiLines.length, openaiLines.length);
    
    // Simple diff highlighting
    const getDiffClass = (geminiLine: string | undefined, openaiLine: string | undefined) => {
        if (geminiLine === openaiLine) return "unchanged";
        if (!geminiLine) return "added";
        if (!openaiLine) return "removed";
        return "changed";
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 z-50 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white">Side-by-Side Comparison</h2>
                    <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg">
                        <button
                            onClick={() => setViewMode("side-by-side")}
                            className={`px-3 py-1 text-xs rounded ${viewMode === "side-by-side" ? "bg-zinc-700 text-white" : "text-zinc-500"}`}
                        >
                            Side by Side
                        </button>
                        <button
                            onClick={() => setViewMode("unified")}
                            className={`px-3 py-1 text-xs rounded ${viewMode === "unified" ? "bg-zinc-700 text-white" : "text-zinc-500"}`}
                        >
                            Unified
                        </button>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="text-zinc-500 hover:text-white px-3 py-1 rounded hover:bg-zinc-800"
                >
                    ✕ Close
                </button>
            </div>
            
            {/* Diff Content */}
            <div className="flex-1 overflow-hidden">
                {viewMode === "side-by-side" ? (
                    <div className="h-full grid grid-cols-2 divide-x divide-zinc-800">
                        {/* Gemini Side */}
                        <div className="flex flex-col h-full">
                            <div className="p-3 bg-blue-500/10 border-b border-zinc-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-400">GEMINI 3</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyGemini}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"
                                        title="Copy to clipboard"
                                    >
                                        {copiedGemini ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => downloadAsFile(geminiCode, "gemini-solution.ts")}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"
                                        title="Download file"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <pre className="p-4 text-xs font-mono">
                                    {geminiLines.map((line, i) => {
                                        const diffType = getDiffClass(line, openaiLines[i]);
                                        return (
                                            <div 
                                                key={i}
                                                className={`flex ${
                                                    diffType === "changed" ? "bg-blue-500/10" :
                                                    diffType === "removed" ? "bg-red-500/10" : ""
                                                }`}
                                            >
                                                <span className="w-10 text-right pr-3 text-zinc-600 select-none">{i + 1}</span>
                                                <span className={`flex-1 ${
                                                    diffType === "changed" ? "text-blue-300" :
                                                    diffType === "removed" ? "text-red-300" : "text-zinc-300"
                                                }`}>
                                                    {line || " "}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </pre>
                            </div>
                        </div>
                        
                        {/* OpenAI Side */}
                        <div className="flex flex-col h-full">
                            <div className="p-3 bg-emerald-500/10 border-b border-zinc-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-400">GPT-5.2</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCopyOpenai}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"
                                        title="Copy to clipboard"
                                    >
                                        {copiedOpenai ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <button
                                        onClick={() => downloadAsFile(openaiCode, "openai-solution.ts")}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"
                                        title="Download file"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <pre className="p-4 text-xs font-mono">
                                    {openaiLines.map((line, i) => {
                                        const diffType = getDiffClass(geminiLines[i], line);
                                        return (
                                            <div 
                                                key={i}
                                                className={`flex ${
                                                    diffType === "changed" ? "bg-emerald-500/10" :
                                                    diffType === "added" ? "bg-green-500/10" : ""
                                                }`}
                                            >
                                                <span className="w-10 text-right pr-3 text-zinc-600 select-none">{i + 1}</span>
                                                <span className={`flex-1 ${
                                                    diffType === "changed" ? "text-emerald-300" :
                                                    diffType === "added" ? "text-green-300" : "text-zinc-300"
                                                }`}>
                                                    {line || " "}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </pre>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Unified View */
                    <div className="h-full overflow-auto">
                        <pre className="p-4 text-xs font-mono">
                            {Array.from({ length: maxLines }).map((_, i) => {
                                const geminiLine = geminiLines[i];
                                const openaiLine = openaiLines[i];
                                const diffType = getDiffClass(geminiLine, openaiLine);
                                
                                if (diffType === "unchanged") {
                                    return (
                                        <div key={i} className="flex">
                                            <span className="w-10 text-right pr-3 text-zinc-600 select-none">{i + 1}</span>
                                            <span className="text-zinc-300">{geminiLine || " "}</span>
                                        </div>
                                    );
                                }
                                
                                return (
                                    <React.Fragment key={i}>
                                        {geminiLine !== undefined && (
                                            <div className="flex bg-red-500/10">
                                                <span className="w-10 text-right pr-3 text-zinc-600 select-none">-</span>
                                                <span className="text-red-300">{geminiLine || " "}</span>
                                            </div>
                                        )}
                                        {openaiLine !== undefined && (
                                            <div className="flex bg-green-500/10">
                                                <span className="w-10 text-right pr-3 text-zinc-600 select-none">+</span>
                                                <span className="text-green-300">{openaiLine || " "}</span>
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </pre>
                    </div>
                )}
            </div>
            
            {/* Footer with stats */}
            <div className="p-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex gap-4">
                    <span>Gemini: {geminiLines.length} lines</span>
                    <span>GPT-5.2: {openaiLines.length} lines</span>
                </div>
                <div>
                    Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd> to close
                </div>
            </div>
        </motion.div>
    );
}

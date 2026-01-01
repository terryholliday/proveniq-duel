// ═══════════════════════════════════════════════════════════════
// DUEL UTILITIES - Sound Effects, Stats, Replay, Export
// ═══════════════════════════════════════════════════════════════

import { Iteration, DuelScorecard } from "./intelligence/types";

// ─────────────────────────────────────────────────────────────────
// SOUND EFFECTS
// ─────────────────────────────────────────────────────────────────

const SOUND_URLS = {
    punch: "data:audio/wav;base64,UklGRl9vT19teleXBhdmVmb3JtYXRjaHVuaw==", // Placeholder - will use Web Audio API
    victory: "data:audio/wav;base64,UklGRl9vT19teleXBhdmVmb3JtYXRjaHVuaw==",
    countdown: "data:audio/wav;base64,UklGRl9vT19teleXBhdmVmb3JtYXRjaHVuaw==",
    error: "data:audio/wav;base64,UklGRl9vT19teleXBhdmVmb3JtYXRjaHVuaw==",
};

class SoundEngine {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    // Generate punch sound using Web Audio API
    playPunch() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(150, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    // Generate victory fanfare
    playVictory() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            oscillator.type = "triangle";
            
            gainNode.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
            
            oscillator.start(ctx.currentTime + i * 0.15);
            oscillator.stop(ctx.currentTime + i * 0.15 + 0.3);
        });
    }

    // Generate countdown beep
    playCountdown() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    }

    // Generate error sound
    playError() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(200, ctx.currentTime);
        oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
        oscillator.type = "sawtooth";
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
    }

    // Generate round start bell
    playBell() {
        if (!this.enabled) return;
        const ctx = this.getContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.type = "sine";
        
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
    }
}

export const soundEngine = new SoundEngine();

// ─────────────────────────────────────────────────────────────────
// DUEL SESSION - For Replay System
// ─────────────────────────────────────────────────────────────────

export interface DuelSession {
    id: string;
    timestamp: string;
    prompt: string;
    mode: "refine" | "orchestrate";
    iterations: Iteration[];
    scorecard: DuelScorecard | null;
    winner: "gemini" | "openai" | "tie" | null;
    elapsedTime: number;
    geminiCode?: string;
    openaiCode?: string;
}

const STORAGE_KEY = "proveniq_duel_sessions";

export function saveDuelSession(session: DuelSession): void {
    const sessions = getDuelSessions();
    sessions.unshift(session); // Add to beginning
    // Keep only last 50 sessions
    const trimmed = sessions.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function getDuelSessions(): DuelSession[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function getDuelSession(id: string): DuelSession | null {
    const sessions = getDuelSessions();
    return sessions.find(s => s.id === id) || null;
}

export function deleteDuelSession(id: string): void {
    const sessions = getDuelSessions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function generateSessionId(): string {
    return `duel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────
// HISTORICAL STATS
// ─────────────────────────────────────────────────────────────────

export interface DuelStats {
    totalDuels: number;
    geminiWins: number;
    openaiWins: number;
    ties: number;
    averageRounds: number;
    averageTime: number;
    consensusRate: number;
    geminiAvgScore: number;
    openaiAvgScore: number;
}

export function calculateStats(): DuelStats {
    const sessions = getDuelSessions();
    
    if (sessions.length === 0) {
        return {
            totalDuels: 0,
            geminiWins: 0,
            openaiWins: 0,
            ties: 0,
            averageRounds: 0,
            averageTime: 0,
            consensusRate: 0,
            geminiAvgScore: 0,
            openaiAvgScore: 0,
        };
    }
    
    const geminiWins = sessions.filter(s => s.winner === "gemini").length;
    const openaiWins = sessions.filter(s => s.winner === "openai").length;
    const ties = sessions.filter(s => s.winner === "tie").length;
    const consensusCount = sessions.filter(s => s.scorecard?.consensusReached).length;
    
    const totalRounds = sessions.reduce((sum, s) => sum + s.iterations.length, 0);
    const totalTime = sessions.reduce((sum, s) => sum + s.elapsedTime, 0);
    
    const geminiScores = sessions.filter(s => s.scorecard).map(s => s.scorecard!.geminiScore);
    const openaiScores = sessions.filter(s => s.scorecard).map(s => s.scorecard!.openaiScore);
    
    return {
        totalDuels: sessions.length,
        geminiWins,
        openaiWins,
        ties,
        averageRounds: Math.round(totalRounds / sessions.length),
        averageTime: Math.round(totalTime / sessions.length),
        consensusRate: Math.round((consensusCount / sessions.length) * 100),
        geminiAvgScore: geminiScores.length ? Math.round(geminiScores.reduce((a, b) => a + b, 0) / geminiScores.length) : 0,
        openaiAvgScore: openaiScores.length ? Math.round(openaiScores.reduce((a, b) => a + b, 0) / openaiScores.length) : 0,
    };
}

// ─────────────────────────────────────────────────────────────────
// EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────

export function exportToClipboard(code: string): Promise<void> {
    return navigator.clipboard.writeText(code);
}

export function downloadAsFile(code: string, filename: string): void {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function generateVSCodeUri(code: string, filename: string): string {
    // Creates a vscode:// URI that can open a new file
    const encoded = encodeURIComponent(code);
    return `vscode://file/new?content=${encoded}&filename=${filename}`;
}

// ─────────────────────────────────────────────────────────────────
// DIFF UTILITIES
// ─────────────────────────────────────────────────────────────────

export interface DiffLine {
    type: "added" | "removed" | "unchanged";
    content: string;
    lineNumber: number;
}

export function generateSimpleDiff(oldCode: string, newCode: string): { left: DiffLine[]; right: DiffLine[] } {
    const oldLines = oldCode.split("\n");
    const newLines = newCode.split("\n");
    
    const left: DiffLine[] = oldLines.map((content, i) => ({
        type: newLines[i] === content ? "unchanged" : "removed",
        content,
        lineNumber: i + 1,
    }));
    
    const right: DiffLine[] = newLines.map((content, i) => ({
        type: oldLines[i] === content ? "unchanged" : "added",
        content,
        lineNumber: i + 1,
    }));
    
    return { left, right };
}

// ─────────────────────────────────────────────────────────────────
// MERGE UTILITIES
// ─────────────────────────────────────────────────────────────────

export interface MergeRequest {
    geminiCode: string;
    openaiCode: string;
    originalPrompt: string;
}

export function generateMergePrompt(request: MergeRequest): string {
    return `
You are a CODE MERGER. Two AI models have produced different solutions. Your job is to create the BEST possible solution by combining the strengths of both.

ORIGINAL PROMPT:
${request.originalPrompt}

=== GEMINI 3's SOLUTION ===
${request.geminiCode}

=== GPT-5.2's SOLUTION ===
${request.openaiCode}

INSTRUCTIONS:
1. Identify the best parts of each solution
2. Combine them into a single, optimal solution
3. Resolve any conflicts by choosing the better approach
4. Ensure the final code is complete and runnable

Output ONLY the merged code in a single markdown code block.
`;
}

// ─────────────────────────────────────────────────────────────────
// PROMPT ANALYSIS
// ─────────────────────────────────────────────────────────────────

export interface PromptAnalysis {
    clarity: number; // 0-100
    specificity: number; // 0-100
    suggestions: string[];
}

export function analyzePromptQuality(prompt: string): PromptAnalysis {
    const suggestions: string[] = [];
    let clarity = 100;
    let specificity = 100;
    
    // Check for vague words
    const vagueWords = ["something", "stuff", "thing", "etc", "maybe", "probably", "kind of", "sort of"];
    vagueWords.forEach(word => {
        if (prompt.toLowerCase().includes(word)) {
            clarity -= 10;
            suggestions.push(`Avoid vague word: "${word}"`);
        }
    });
    
    // Check length
    if (prompt.length < 20) {
        specificity -= 30;
        suggestions.push("Prompt is too short. Add more details about requirements.");
    }
    
    // Check for technical specifics
    const hasLanguage = /\b(typescript|javascript|python|react|node|sql|api)\b/i.test(prompt);
    if (!hasLanguage) {
        specificity -= 15;
        suggestions.push("Consider specifying the programming language or framework.");
    }
    
    // Check for requirements
    const hasRequirements = /\b(must|should|need|require|include)\b/i.test(prompt);
    if (!hasRequirements) {
        specificity -= 10;
        suggestions.push("Add explicit requirements (must have, should include, etc.)");
    }
    
    // Check for edge cases mention
    const hasEdgeCases = /\b(edge case|error|handle|validate|check)\b/i.test(prompt);
    if (!hasEdgeCases) {
        suggestions.push("Consider mentioning error handling or edge cases.");
    }
    
    return {
        clarity: Math.max(0, clarity),
        specificity: Math.max(0, specificity),
        suggestions: suggestions.slice(0, 5), // Max 5 suggestions
    };
}

// ─────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────

export interface KeyboardShortcuts {
    startDuel: string;
    acceptGemini: string;
    acceptOpenai: string;
    continueDuel: string;
    toggleSound: string;
    copyCode: string;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
    startDuel: "Space",
    acceptGemini: "1",
    acceptOpenai: "2",
    continueDuel: "3",
    toggleSound: "m",
    copyCode: "c",
};

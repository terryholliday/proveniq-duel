
# HYBRID MODE INTEGRATION TEST RESULTS
**Date:** 2026-01-02T12:43:32.930Z

## Test Summary
| Test | Time |
|------|------|
| Code Generation | 6.55s |
| Strategy Debate | 36.27s |
| Task Orchestration | 23.01s |

## Detailed LLM Metrics

| # | Provider | Model | System Prompt | User Prompt | Total Input | Output | Est. Tokens | Time |
|---|----------|-------|---------------|-------------|-------------|--------|-------------|------|
| 1 | gemini | gemini-2.0-flash | 377 | 217 | 594 | 590 | 297 | 1.74s |
| 2 | openai | gpt-4o-mini | 511 | 605 | 1116 | 465 | 396 | 4.80s |
| 3 | gemini | gemini-2.0-flash | 244 | 155 | 399 | 8883 | 2321 | 11.83s |
| 4 | openai | gpt-4o-mini | 244 | 155 | 399 | 5250 | 1413 | 23.14s |
| 5 | gemini | gemini-2.0-flash | 5707 | 14 | 5721 | 5496 | 2805 | 7.16s |
| 6 | openai | gpt-4o-mini | 9340 | 14 | 9354 | 3978 | 3334 | 13.12s |
| 7 | gemini | gemini-2.0-flash | 458 | 178 | 636 | 7113 | 1938 | 12.18s |
| 8 | openai | gpt-4o-mini | 458 | 178 | 636 | 5161 | 1450 | 23.00s |

## Aggregate Summary

### GEMINI (4 calls)
- **Total Input:** 7,350 chars (~1,839 tokens)
- **Total Output:** 22,082 chars (~5,522 tokens)
- **Total Time:** 32.92s
- **Avg Response:** 8.23s

### OPENAI (4 calls)
- **Total Input:** 11,505 chars (~2,877 tokens)
- **Total Output:** 14,854 chars (~3,716 tokens)
- **Total Time:** 64.07s
- **Avg Response:** 16.02s

### COMBINED
- **Total API Calls:** 8
- **Total Input:** 18,855 chars
- **Total Output:** 36,936 chars
- **Total Est. Tokens:** 13,954
- **Total Time:** 96.99s

## Prompt Length Analysis

### System Prompts (Initial)
| Prompt Type | Length | Est. Tokens |
|-------------|--------|-------------|
| Architect (Code Gen) | 377 | 95 |
| Reviewer (Code Gen) | 511 | 128 |
| Strategy Opener | 244 | 61 |
| Orchestrator | 458 | 115 |

### User Prompts (Test Cases)
| Test Case | Length | Est. Tokens |
|-----------|--------|-------------|
| Code Generation | 208 | 52 |
| Strategy Debate | 148 | 37 |
| Task Orchestration | 167 | 42 |

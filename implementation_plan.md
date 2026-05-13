# Auto-Saving System Implementation

This document outlines the plan to build the "Auto-Saving System" with intelligent budget allocation for your Money Saver app, moving towards a pure Vanilla JS approach as requested.

## User Review Required
> [!IMPORTANT]
> The current application uses **Alpine.js** for reactivity. Since your requirements explicitly state "No frameworks required (vanilla JS preferred) - Separate logic and UI rendering - Use event listeners properly", I plan to **remove Alpine.js** and rewrite the frontend logic using pure, modular Vanilla JavaScript. 
> Please confirm if you want me to completely replace the Alpine.js implementation with Vanilla JS, or if I should integrate this new feature within the existing Alpine.js structure.

## Open Questions
1. **Scope of Rewrite:** Should I keep the existing features (Calculator, AI Insights, Chart) and rewrite them in Vanilla JS, or focus purely on replacing the main dashboard with the new Needs/Wants/Savings Auto-Saving System?
2. **Behavior Logic:** When a user overspends in "Wants" and we "Reduce future Wants allocation automatically", should we permanently change their custom ratio (e.g., from 30% to 25%), or just temporarily adjust the current month's allocation?

## Proposed Changes

### 1. Core Logic & State Management
I will create a modular Vanilla JS structure in `script.js` to manage state and calculations dynamically.
- **State Object:** Store income, expenses (needs, wants), and current ratio (e.g., { needs: 50, wants: 30, savings: 20 }).
- **Dynamic Calculation:** Instantly calculate allocations whenever income or ratio changes.
- **Smart Behavior:** Add logic to detect overspending in "Wants" and adjust the ratio dynamically, suggesting higher savings.

### 2. UI Updates (HTML & CSS)
#### [MODIFY] index.html
- Remove `Alpine.js` scripts and `x-*` attributes.
- Add an "Income Input" section that triggers the auto-split.
- Add a "Ratio Settings" modal or section to customize the 50/30/20 split (with 100% validation).
- Create a 3-card layout (Needs, Wants, Savings) displaying allocated Rp, percentage, and an animated progress bar.
- Add specific IDs and classes for Vanilla JS DOM manipulation.

#### [MODIFY] style.css
- Add CSS animations for the progress bars and card updates.
- Keep the premium glassmorphism and rich aesthetics (vibrant colors, modern typography).

#### [MODIFY] script.js
- **Event Listeners:** Attach listeners to inputs for real-time updates.
- **Render Functions:** Functions to specifically update the DOM elements (cards, progress bars, text) efficiently.
- **Currency Formatting:** Built-in IDR formatting.

## Verification Plan
### Manual Verification
1. Input a test income (e.g., Rp 10,000,000) and verify it splits correctly into 5M, 3M, 2M.
2. Change the ratio to 60/20/20 and ensure the UI updates instantly and validates the 100% total.
3. Input an expense in "Wants" that exceeds the allocated budget and verify the system automatically reduces the Wants ratio and shows a suggestion.

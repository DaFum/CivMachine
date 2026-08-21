// The four formatters every UI module shares. They were duplicated per module before the onboarding
// surfaces arrived; one definition means a number cannot be escaped in one panel and raw in another.
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
export const fmt = (n) => Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : Math.round(n).toLocaleString('en-US');
export const pct = (v, max = 100) => `${Math.max(0, Math.min(100, v / max * 100)).toFixed(0)}%`;
// Seconds as a player reads them: a run is minutes long, so 214s is worse than 3m34s.
export const duration = (seconds) => {
    const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
    const minutes = Math.floor(total / 60);
    return minutes ? `${minutes}m ${String(total % 60).padStart(2, '0')}s` : `${total}s`;
};
//# sourceMappingURL=format.js.map
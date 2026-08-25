import { text } from '../data/i18n.js';
// The four formatters every UI module shares. They were duplicated per module before the onboarding
// surfaces arrived; one definition means a number cannot be escaped in one panel and raw in another.
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
// All three branches go through the locale, not just the unabbreviated one: `toFixed` always writes a
// decimal point, so a German player read `1.5K` next to a `1.234` further down the same panel.
export const fmt = (n) => {
    const locale = text().ui.format.numberLocale;
    const scaled = (value, digits) => 
    // Grouping stays off: the abbreviated forms never had it, and this must change the separator only.
    value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false });
    return Math.abs(n) >= 1e6 ? `${scaled(n / 1e6, 2)}M`
        : Math.abs(n) >= 1e3 ? `${scaled(n / 1e3, 1)}K`
            : Math.round(n).toLocaleString(locale);
};
// A meter width, so it has to stay a length whatever it is handed. The clamp already turns an
// infinite share into a full meter and a negative one into an empty one; only NaN -- `0 / 0`, a stat
// whose ceiling has not been set yet -- survives it, and `NaN%` is not a width.
export const pct = (v, max = 100) => {
    const share = Math.max(0, Math.min(100, v / max * 100));
    return `${Number.isNaN(share) ? 0 : share.toFixed(0)}%`;
};
// Seconds as a player reads them: a run is minutes long, so 214s is worse than 3m34s.
export const duration = (seconds) => {
    const total = Math.max(0, Math.round(Number.isFinite(seconds) ? seconds : 0));
    const minutes = Math.floor(total / 60);
    const { minuteSuffix, secondSuffix } = text().ui.format;
    return minutes
        ? `${minutes}${minuteSuffix} ${String(total % 60).padStart(2, '0')}${secondSuffix}`
        : `${total}${secondSuffix}`;
};
//# sourceMappingURL=format.js.map
import { ADMIN_THEME_COOKIE } from "@/lib/admin-theme";
import { CURRENCY_COOKIE_NAME } from "@/lib/currency/constants";

// Single owner of every pre-paint <html> attribute. Runs synchronously during
// head parse, before React hydrates and before first paint:
//
//   data-currency — from the tt_currency cookie, so CSS-toggled <Price> spans
//     render the visitor's currency on the first paint of a static/ISR page.
//   data-theme    — admin/pos only, first visit only: adopt the OS colour
//     scheme and persist it so later renders carry data-theme server-side.
//
// Lives in the root layout head rather than the shop/admin/pos layouts because
// a <script> element in a nested layout is re-created on client navigation,
// where browsers never execute it (React warns). The root layout head renders
// once per document, which is exactly the script's lifetime.
//
// Both branches are cookie-driven and idempotent. Because the server cannot
// know these values without reading cookies — which would force every route
// dynamic — <html> carries suppressHydrationWarning for its own attributes.
const BOOTSTRAP = `(function(){try{var d=document.documentElement;var c=document.cookie;var m=c.match(/(?:^|;\\s*)${CURRENCY_COOKIE_NAME}=([^;]+)/);if(m){d.dataset.currency=decodeURIComponent(m[1]).toUpperCase();}if(/^\\/(admin|pos)(\\/|$)/.test(location.pathname)&&!/(^|;)\\s*${ADMIN_THEME_COOKIE}=/.test(c)){var t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.setAttribute('data-theme',t);document.cookie='${ADMIN_THEME_COOKIE}='+t+';path=/;max-age=31536000;samesite=lax';}}catch(e){}})();`;

export function BootstrapScript() {
  return <script dangerouslySetInnerHTML={{ __html: BOOTSTRAP }} />;
}

// JavaScript consumers reference the same CSS tokens as the new primitives.
export const TOKENS = {
  paper: "var(--paper)",
  surface: "var(--surface)",
  raised: "var(--raised)",
  surfaceHover: "var(--surface-hover)",
  ink: "var(--ink)",
  inkDeep: "var(--ink-deep)",
  ink2: "var(--ink-2)",
  ink3: "var(--ink-3)",
  rule: "var(--rule)",
  pine: "var(--pine)",
  pine950: "var(--pine-950)",
  pine800: "var(--pine-800)",
  pine600: "var(--pine-600)",
  pine300: "var(--pine-300)",
  pine100: "var(--pine-100)",
  pine50: "var(--pine-50)",
  pineInk: "var(--pine-ink)",
  pineWash: "var(--pine-wash)",
  brass: "var(--brass)",
  brassWash: "var(--brass-wash)",
  brassInk: "var(--brass-ink)",
  signal: "var(--signal)",
  signalWash: "var(--signal-wash)",
  ok: "var(--ok)",
  okWash: "var(--ok-wash)",
  radiusControl: "var(--radius-control)",
  radiusPanel: "var(--radius-panel)",
  shadowCard: "var(--shadow-card)",
  shadowRaised: "var(--shadow-raised)",
  shadowPop: "var(--shadow-pop)",
  fontDisplay: "var(--font-display)",
  fontUi: "var(--font-ui)",
  fontMono: "var(--font-mono)",
  easeOut: "var(--ease-out)",
  duration1: "var(--dur-1)",
  duration2: "var(--dur-2)",
  duration3: "var(--dur-3)",
};

// Preserve every legacy key while collapsing decorative colors into ink tones.
export const C = {
  navy: TOKENS.ink,
  navyDark: TOKENS.inkDeep,
  ink: TOKENS.ink,
  text: TOKENS.ink2,
  muted: TOKENS.ink3,
  white: TOKENS.surface,
  panel: TOKENS.surface,
  bg: TOKENS.paper,
  soft: TOKENS.surface,
  rowHov: TOKENS.surfaceHover,
  blue: TOKENS.pine,
  blue2: TOKENS.pine,
  blueL: TOKENS.pineWash,
  blueSoft: TOKENS.pineWash,
  green: TOKENS.ok,
  greenL: TOKENS.okWash,
  greenSoft: TOKENS.okWash,
  ok: TOKENS.ok,
  teal: TOKENS.ink2,
  tealL: TOKENS.paper,
  amber: TOKENS.ink2,
  amberL: TOKENS.paper,
  amberSoft: TOKENS.paper,
  warn: TOKENS.ink2,
  purple: TOKENS.ink2,
  purpleL: TOKENS.paper,
  violet: TOKENS.ink2,
  red: TOKENS.signal,
  redL: TOKENS.signalWash,
  redSoft: TOKENS.signalWash,
  danger: TOKENS.signal,
  gray: TOKENS.ink2,
  graySoft: TOKENS.paper,
  border: TOKENS.rule,
  line: TOKENS.rule,
};

export const SHADOW = {
  card: TOKENS.shadowCard,
  raised: TOKENS.shadowRaised,
  pop: TOKENS.shadowPop,
};

// Legacy callers expect numbers (React converts these radius values to px).
export const RADIUS = { sm: 6, md: 10, lg: 10 };

export const FONT = {
  display: TOKENS.fontDisplay,
  ui: TOKENS.fontUi,
  mono: TOKENS.fontMono,
};

export const MOTION = {
  easeOut: TOKENS.easeOut,
  fast: TOKENS.duration1,
  normal: TOKENS.duration2,
  slow: TOKENS.duration3,
};

export const SPACE = {
  4: "var(--space-4)",
  8: "var(--space-8)",
  12: "var(--space-12)",
  16: "var(--space-16)",
  24: "var(--space-24)",
  32: "var(--space-32)",
  48: "var(--space-48)",
};

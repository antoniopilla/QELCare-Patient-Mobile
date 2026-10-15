import styles from "./AuthFolio.module.css";

const aliases = {
  "page-wrap": "page",
  "brand-hero": "brand-body",
  "brand-footer": "brand-foot",
  "form-pane": "form-panel",
  "form-wrap": "form-inner",
  "back-link": "back",
  "auth-head": "form-head",
  "status-pill": "badge",
  "code-label": "label",
  "otp-helper": "helper",
  "toggle-btn": "toggle",
  "btn-main": "btn",
  "eye": "toggle",
  "footnote-link": "link",
  "terms-link": "link",
};

// Keep each screen's established presentation names while sharing one folio.
export function authClasses(value) {
  return value.split(/\s+/).filter(Boolean).map((name) => {
    const key = name.replace(/^(ls|rg|fp)-/, "");
    return styles[aliases[key] || key] || "";
  }).filter(Boolean).join(" ");
}

export function AuthRules() {
  return (
    <div className={styles.rules} aria-hidden="true">
      <svg viewBox="0 0 640 960" preserveAspectRatio="xMidYMid slice" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 18 }, (_, index) => <path key={index} d={`M0 ${80 + index * 48}H640`} />)}
          <path d="M-130 180C180 0 540 110 690 430S800 870 460 1080" />
          <path d="M-110 225C160 45 490 135 640 440S740 850 430 1040" />
          <path d="M-90 270C140 90 440 160 590 450S680 830 400 1000" />
          <path d="M-70 315C120 135 390 185 540 460S620 810 370 960" />
          <path d="M-50 360C100 180 340 210 490 470S560 790 340 920" />
        </g>
      </svg>
    </div>
  );
}

// Decorative care folio: no patient details, statuses, or clinical measurements.
export function AuthIllustration() {
  return (
    <div className={styles.illustration} aria-hidden="true">
      <svg viewBox="0 0 420 180" fill="none" focusable="false">
        <path d="M24 153H396" stroke="currentColor" opacity=".26" />
        <circle cx="360" cy="46" r="34" stroke="currentColor" opacity=".22" />
        <circle cx="360" cy="46" r="23" stroke="currentColor" opacity=".14" />
        <path d="M44 65V33M28 49H60" stroke="var(--brass)" strokeWidth="2" />
        <g className={styles.illustrationFolio}>
          <path d="M133 19 304 31 295 157 124 145Z" fill="var(--pine-300)" />
          <rect x="117" y="15" width="175" height="139" rx="7" fill="var(--surface)" stroke="var(--rule)" />
          <path d="M117 52H292" stroke="var(--rule)" />
          <rect x="134" y="30" width="18" height="5" rx="2.5" fill="var(--pine-800)" />
          <path d="M162 32H225M134 69H240M134 78H213" stroke="var(--pine-300)" strokeWidth="3" strokeLinecap="round" />
          <path d="M144 111H263" stroke="var(--rule)" strokeWidth="2" />
          <path d="M144 111H222" stroke="var(--pine-600)" strokeWidth="2" />
          <circle cx="144" cy="111" r="6" fill="var(--pine-800)" />
          <circle cx="183" cy="111" r="6" fill="var(--pine-800)" />
          <circle cx="223" cy="111" r="9" fill="var(--brass-wash)" />
          <circle cx="223" cy="111" r="5" fill="var(--brass)" />
          <circle cx="263" cy="111" r="5" fill="var(--surface)" stroke="var(--pine-300)" strokeWidth="2" />
          <path d="M135 134H158M173 134H196M212 134H235M251 134H273" stroke="var(--rule)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className={styles.illustrationCard}>
          <rect x="45" y="94" width="104" height="68" rx="7" fill="var(--paper)" stroke="var(--rule)" />
          <circle cx="68" cy="117" r="9" fill="var(--pine-100)" />
          <path d="M64 117H72M68 113V121" stroke="var(--pine-800)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M85 115H132M85 122H116M60 142H130" stroke="var(--pine-300)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className={styles.illustrationSeal}>
          <circle cx="304" cy="122" r="28" fill="var(--brass-wash)" stroke="var(--brass)" />
          <path d="m293 122 7 7 15-15" stroke="var(--brass-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

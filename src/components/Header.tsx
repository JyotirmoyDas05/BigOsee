"use client";

import { IconLogo } from "./icons";
import { useTheme } from "./ThemeProvider";

/* Sun icon for light mode */
function IconSun({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

/* Moon icon for dark mode */
function IconMoon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Header() {
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  return (
    <header className="flex items-center justify-between h-12 px-4 bg-surface border-b border-border shrink-0">
      <div className="flex items-center gap-2.5">
        <IconLogo size={22} />
        <span className="text-sm font-semibold tracking-tight text-text-primary">
          BigOSee
        </span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-accent text-black rounded-sm">
          v1.0
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-text-secondary text-[10px] font-mono">
              Space
            </kbd>
            <span>Play</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-surface-hover border border-border rounded text-text-secondary text-[10px] font-mono">
              ← →
            </kbd>
            <span>Step</span>
          </div>
        </div>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggle}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          className="relative flex items-center w-12 h-6 rounded-full border border-border bg-surface-hover transition-colors duration-300 shrink-0 cursor-pointer"
          style={{ padding: "3px" }}
        >
          {/* track fill */}
          <span
            className="absolute inset-0 rounded-full transition-colors duration-300"
            style={{
              backgroundColor: isLight
                ? "rgba(217,119,6,0.18)"
                : "rgba(99,102,241,0.18)",
            }}
          />
          {/* thumb */}
          <span
            className="relative z-10 flex items-center justify-center w-4.5 h-4.5 rounded-full shadow transition-all duration-300"
            style={{
              transform: isLight ? "translateX(22px)" : "translateX(0px)",
              backgroundColor: isLight ? "#d97706" : "#6366f1",
              color: "#fff",
            }}
          >
            {isLight ? <IconSun size={10} /> : <IconMoon size={10} />}
          </span>
        </button>
      </div>
    </header>
  );
}

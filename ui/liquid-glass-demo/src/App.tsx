import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import LiquidGlassCard from "./components/LiquidGlassCard";
import LiquidModal from "./components/LiquidModal";
import { ThemeMode, themeTokens, viewportSpillRadius } from "./lib/theme";

type SpillState = {
  id: number;
  x: number;
  y: number;
  color: string;
};

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [showModal, setShowModal] = useState(false);
  const [spill, setSpill] = useState<SpillState | null>(null);

  const reducedMotion = useReducedMotion();

  const stageX = useMotionValue(0);
  const stageY = useMotionValue(0);

  const lagX1 = useSpring(stageX, { stiffness: 70, damping: 18, mass: 0.8 });
  const lagY1 = useSpring(stageY, { stiffness: 70, damping: 18, mass: 0.8 });
  const lagX2 = useSpring(stageX, { stiffness: 52, damping: 16, mass: 1 });
  const lagY2 = useSpring(stageY, { stiffness: 52, damping: 16, mass: 1 });
  const lagX3 = useSpring(stageX, { stiffness: 40, damping: 15, mass: 1.1 });
  const lagY3 = useSpring(stageY, { stiffness: 40, damping: 15, mass: 1.1 });

  const blob1X = useTransform(lagX1, (v) => v * 0.11 - 150);
  const blob1Y = useTransform(lagY1, (v) => v * 0.11 - 110);
  const blob2X = useTransform(lagX2, (v) => v * 0.08 + 130);
  const blob2Y = useTransform(lagY2, (v) => v * 0.07 - 80);
  const blob3X = useTransform(lagX3, (v) => v * 0.06 + 10);
  const blob3Y = useTransform(lagY3, (v) => v * 0.06 + 120);

  const active = themeTokens[theme];
  const toggleRef = useRef<HTMLButtonElement>(null);

  const handleStageMove = (event: PointerEvent<HTMLDivElement>) => {
    if (typeof window === "undefined" || reducedMotion) {
      return;
    }

    const cx = event.clientX - window.innerWidth / 2;
    const cy = event.clientY - window.innerHeight / 2;
    stageX.set(cx);
    stageY.set(cy);
  };

  const launchThemeSpill = () => {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

    const rect = toggleRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : 24;
    const y = rect ? rect.top + rect.height / 2 : 24;

    setSpill({
      id: Date.now(),
      x,
      y,
      color: themeTokens[nextTheme].spillColor,
    });

    window.setTimeout(() => setTheme(nextTheme), 140);
    window.setTimeout(() => setSpill(null), 760);
  };

  const modalShadow =
    theme === "dark"
      ? "0 30px 66px rgba(5, 19, 45, 0.62), 0 0 44px rgba(39, 210, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)"
      : "0 24px 54px rgba(75, 135, 192, 0.34), 0 0 34px rgba(106, 183, 255, 0.34), inset 0 1px 0 rgba(255,255,255,0.9)";

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-8"
      onPointerMove={handleStageMove}
      style={{
        background: active.stageBackground,
        color: active.text,
      }}
    >
      <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0">
        <defs>
          <filter id="glass-refraction" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.014"
              numOctaves="2"
              seed="8"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="16s"
                repeatCount="indefinite"
                values="0.008 0.014;0.012 0.02;0.008 0.014"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" />
          </filter>

          <filter id="gooey" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <AnimatePresence>
        {spill && (
          <motion.div
            key={spill.id}
            className="pointer-events-none fixed inset-0 z-50"
            style={{ background: spill.color }}
            initial={{
              clipPath: `circle(0px at ${spill.x}px ${spill.y}px)`,
              opacity: 0.95,
            }}
            animate={{
              clipPath: `circle(${viewportSpillRadius()}px at ${spill.x}px ${spill.y}px)`,
              opacity: 1,
            }}
            transition={{ duration: 0.74, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0">
        <motion.div className="absolute inset-0" style={{ filter: "url(#gooey)" }}>
          <motion.div
            className="absolute h-56 w-56 rounded-full blur-2xl"
            style={{
              background: active.blobA,
              x: reducedMotion ? -140 : blob1X,
              y: reducedMotion ? -100 : blob1Y,
              left: "18%",
              top: "22%",
            }}
          />
          <motion.div
            className="absolute h-72 w-72 rounded-full blur-[42px]"
            style={{
              background: active.blobB,
              x: reducedMotion ? 110 : blob2X,
              y: reducedMotion ? -80 : blob2Y,
              right: "14%",
              top: "28%",
            }}
          />
          <motion.div
            className="absolute h-64 w-64 rounded-full blur-[38px]"
            style={{
              background: active.blobC,
              x: reducedMotion ? 0 : blob3X,
              y: reducedMotion ? 120 : blob3Y,
              left: "42%",
              bottom: "12%",
            }}
          />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em]" style={{ color: active.muted }}>
              Liquid glass physics
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">High-end motion and refraction surface</h2>
          </div>

          <motion.button
            ref={toggleRef}
            type="button"
            onClick={launchThemeSpill}
            whileTap={{ scale: 0.95 }}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
            style={{
              borderColor: "rgba(255,255,255,0.24)",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(25px) saturate(200%)",
              WebkitBackdropFilter: "blur(25px) saturate(200%)",
              boxShadow: `0 0 0 1px rgba(255,255,255,0.2) inset, 0 14px 30px ${active.glow}`,
            }}
          >
            {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </motion.button>
        </div>

        <LiquidGlassCard theme={theme} reducedMotion={!!reducedMotion} onOpenModal={() => setShowModal(true)} />
      </div>

      <LiquidModal isOpen={showModal} onClose={() => setShowModal(false)} theme={theme} shadow={modalShadow} />
    </div>
  );
}

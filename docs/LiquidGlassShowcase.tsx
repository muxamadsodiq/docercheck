// @ts-nocheck
"use client";

import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";

type ThemeMode = "dark" | "light";

type Ripple = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
};

type SpillState = {
  id: number;
  x: number;
  y: number;
  color: string;
};

const themeTokens = {
  dark: {
    stageBackground:
      "radial-gradient(1200px 700px at 16% 12%, rgba(0, 216, 255, 0.18), transparent 50%), radial-gradient(1000px 680px at 82% 80%, rgba(0, 110, 255, 0.2), transparent 56%), linear-gradient(150deg, #02060f, #081224 48%, #030913)",
    glow: "rgba(76, 220, 255, 0.58)",
    blobA: "linear-gradient(145deg, rgba(29, 120, 255, 0.72), rgba(66, 230, 255, 0.54))",
    blobB: "linear-gradient(145deg, rgba(16, 211, 255, 0.64), rgba(121, 94, 255, 0.44))",
    blobC: "linear-gradient(145deg, rgba(111, 255, 245, 0.58), rgba(0, 101, 255, 0.38))",
    text: "#f3f8ff",
    muted: "#99abc8",
    buttonText: "#e8f7ff",
    spillColor: "#02060f",
    modalBackground: "rgba(7, 16, 33, 0.75)",
    modalBorder: "rgba(160, 230, 255, 0.22)",
  },
  light: {
    stageBackground:
      "radial-gradient(1200px 700px at 16% 12%, rgba(132, 205, 255, 0.26), transparent 50%), radial-gradient(1000px 680px at 82% 80%, rgba(122, 224, 255, 0.24), transparent 56%), linear-gradient(150deg, #edf6ff, #f9fcff 48%, #e8f2ff)",
    glow: "rgba(64, 156, 219, 0.48)",
    blobA: "linear-gradient(145deg, rgba(148, 208, 255, 0.66), rgba(171, 229, 255, 0.54))",
    blobB: "linear-gradient(145deg, rgba(103, 196, 255, 0.58), rgba(188, 224, 255, 0.5))",
    blobC: "linear-gradient(145deg, rgba(171, 236, 255, 0.62), rgba(136, 196, 255, 0.44))",
    text: "#12243b",
    muted: "#5c7290",
    buttonText: "#0f2a4a",
    spillColor: "#eef7ff",
    modalBackground: "rgba(255, 255, 255, 0.72)",
    modalBorder: "rgba(101, 166, 224, 0.24)",
  },
} as const;

function viewportSpillRadius(): number {
  if (typeof window === "undefined") {
    return 2200;
  }
  return Math.hypot(window.innerWidth, window.innerHeight);
}

function LiquidButton({
  label,
  onClick,
  theme,
}: {
  label: string;
  onClick?: () => void;
  theme: ThemeMode;
}) {
  const [bursts, setBursts] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const burstIdRef = useRef(0);

  const createBurst = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = ++burstIdRef.current;

    setBursts((prev) => [...prev.slice(-2), { id, x, y }]);
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerDown={createBurst}
      whileTap={{ scale: 0.97 }}
      className="relative overflow-hidden rounded-full border px-5 py-2.5 text-sm font-semibold tracking-wide"
      style={{
        color: themeTokens[theme].buttonText,
        borderColor: "rgba(255,255,255,0.22)",
        background:
          theme === "dark"
            ? "linear-gradient(145deg, rgba(35, 110, 255, 0.54), rgba(64, 225, 255, 0.3))"
            : "linear-gradient(145deg, rgba(255, 255, 255, 0.66), rgba(205, 236, 255, 0.58))",
        boxShadow:
          theme === "dark"
            ? "0 12px 28px rgba(12, 61, 125, 0.34), inset 0 1px 0 rgba(255,255,255,0.26)"
            : "0 12px 24px rgba(58, 124, 180, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)",
        backdropFilter: "blur(20px) saturate(190%)",
        WebkitBackdropFilter: "blur(20px) saturate(190%)",
      }}
    >
      <span className="relative z-10">{label}</span>

      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.span
            key={burst.id}
            className="pointer-events-none absolute block h-12 w-12 rounded-full"
            style={{
              left: burst.x - 24,
              top: burst.y - 24,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.28) 38%, rgba(255,255,255,0) 70%)",
              mixBlendMode: "screen",
            }}
            initial={{ scale: 0, opacity: 0.62 }}
            animate={{ scale: 7.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => {
              setBursts((prev) => prev.filter((item) => item.id !== burst.id));
            }}
          />
        ))}
      </AnimatePresence>

      <motion.span
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        whileTap={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 50%, rgba(255,255,255,0) 100%)",
        }}
      />
    </motion.button>
  );
}

export default function LiquidGlassShowcase() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [spill, setSpill] = useState<SpillState | null>(null);

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);

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

  const localX = useMotionValue(180);
  const localY = useMotionValue(120);
  const localXSpring = useSpring(localX, { stiffness: 260, damping: 30 });
  const localYSpring = useSpring(localY, { stiffness: 260, damping: 30 });

  const cardRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const cardGlow = useMotionTemplate`radial-gradient(300px 220px at ${localXSpring}px ${localYSpring}px, rgba(255,255,255,0.28), rgba(255,255,255,0) 65%)`;

  const handleStageMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined") {
      const cx = event.clientX - window.innerWidth / 2;
      const cy = event.clientY - window.innerHeight / 2;
      stageX.set(cx);
      stageY.set(cy);
    }
  };

  const spawnRipple = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x < rect.width / 2 ? rect.width * 1.18 : -rect.width * 1.18;
    const dy = y < rect.height / 2 ? rect.height * 0.88 : -rect.height * 0.88;

    const id = ++rippleIdRef.current;

    setRipples((prev) => [...prev.slice(-4), { id, x, y, dx, dy }]);
  };

  const handleCardMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    localX.set(event.clientX - rect.left);
    localY.set(event.clientY - rect.top);
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

    window.setTimeout(() => {
      setTheme(nextTheme);
    }, 150);

    window.setTimeout(() => {
      setSpill(null);
    }, 760);
  };

  const cardShadow = useMemo(() => {
    if (theme === "dark") {
      return isHovered
        ? "0 28px 64px rgba(5, 19, 45, 0.58), 0 0 44px rgba(39, 210, 255, 0.26), inset 0 1px 0 rgba(255,255,255,0.2)"
        : "0 20px 46px rgba(5, 14, 32, 0.5), 0 0 28px rgba(39, 210, 255, 0.14), inset 0 1px 0 rgba(255,255,255,0.16)";
    }

    return isHovered
      ? "0 24px 50px rgba(70, 134, 193, 0.32), 0 0 34px rgba(106, 183, 255, 0.32), inset 0 1px 0 rgba(255,255,255,0.9)"
      : "0 16px 36px rgba(76, 131, 181, 0.22), 0 0 22px rgba(145, 202, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.84)";
  }, [isHovered, theme]);

  const active = themeTokens[theme];

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
            exit={{ opacity: 0 }}
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
              x: blob1X,
              y: blob1Y,
              left: "18%",
              top: "22%",
            }}
          />
          <motion.div
            className="absolute h-72 w-72 rounded-full blur-[42px]"
            style={{
              background: active.blobB,
              x: blob2X,
              y: blob2Y,
              right: "14%",
              top: "28%",
            }}
          />
          <motion.div
            className="absolute h-64 w-64 rounded-full blur-[38px]"
            style={{
              background: active.blobC,
              x: blob3X,
              y: blob3Y,
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
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Refraction-driven interaction panel</h2>
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

        <motion.div
          ref={cardRef}
          onPointerEnter={(event) => {
            setIsHovered(true);
            spawnRipple(event);
          }}
          onPointerLeave={() => {
            setIsHovered(false);
          }}
          onPointerMove={handleCardMove}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          animate={{
            boxShadow: cardShadow,
            backdropFilter: isHovered ? "blur(25px) saturate(260%)" : "blur(25px) saturate(200%)",
            WebkitBackdropFilter: isHovered ? "blur(25px) saturate(260%)" : "blur(25px) saturate(200%)",
          }}
          className="relative overflow-hidden rounded-[28px] border p-6 sm:p-8"
          style={{
            borderColor: "rgba(255,255,255,0.2)",
            background: "rgba(255, 255, 255, 0.08)",
            filter: "url(#glass-refraction)",
            transformStyle: "preserve-3d",
          }}
        >
          <motion.div className="pointer-events-none absolute inset-0" style={{ backgroundImage: cardGlow }} />

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
              borderRadius: 28,
            }}
          />

          <AnimatePresence>
            {ripples.map((ripple) => (
              <motion.div
                key={ripple.id}
                className="pointer-events-none absolute h-32 w-32 rounded-full"
                style={{
                  left: ripple.x - 64,
                  top: ripple.y - 64,
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.2) 32%, rgba(255,255,255,0) 72%)",
                  mixBlendMode: "screen",
                }}
                initial={{ x: 0, y: 0, scale: 0.24, opacity: 0.56 }}
                animate={{
                  x: ripple.dx,
                  y: ripple.dy,
                  scale: 2.4,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.95, ease: [0.2, 0.9, 0.2, 1] }}
                onAnimationComplete={() => {
                  setRipples((prev) => prev.filter((item) => item.id !== ripple.id));
                }}
              />
            ))}
          </AnimatePresence>

          <div className="relative z-10 grid gap-8 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold leading-tight">Spectral refraction card with physically-motivated hover dynamics</h3>
              <p className="max-w-xl text-sm leading-7" style={{ color: active.muted }}>
                The glass body uses high blur with elevated saturation, turbulence-based displacement for optical warping,
                and pointer-origin wave propagation to mimic a thin liquid membrane.
              </p>

              <div className="flex flex-wrap gap-3">
                <LiquidButton label="Primary Action" theme={theme} />
                <LiquidButton label="Open Elastic Modal" theme={theme} onClick={() => setShowModal(true)} />
              </div>
            </div>

            <div className="space-y-3">
              <div
                className="rounded-2xl border p-4"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  borderColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(25px) saturate(200%)",
                  WebkitBackdropFilter: "blur(25px) saturate(200%)",
                }}
              >
                <p className="text-xs uppercase tracking-[0.28em]" style={{ color: active.muted }}>
                  Glass spec
                </p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li>Backdrop: blur(25px) saturate(200%)</li>
                  <li>Base: rgba(255, 255, 255, 0.08)</li>
                  <li>Inner glow border: 1px rgba(255,255,255,0.2)</li>
                  <li>Displacement refraction via feTurbulence + feDisplacementMap</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              onClick={() => setShowModal(false)}
              style={{ background: "rgba(0,0,0,0.36)", backdropFilter: "blur(4px)" }}
            />

            <motion.div
              className="relative z-10 w-full max-w-lg rounded-[26px] border p-6"
              initial={{ opacity: 0, scale: 0.82, rotate: -1.8 }}
              animate={{
                opacity: 1,
                scale: [0.82, 1.06, 0.97, 1.02, 1],
                rotate: [-1.8, 1.2, -0.75, 0.26, 0],
              }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{
                duration: 0.9,
                times: [0, 0.38, 0.62, 0.8, 1],
                ease: [0.175, 0.885, 0.32, 1.2],
              }}
              style={{
                background: active.modalBackground,
                borderColor: active.modalBorder,
                boxShadow: cardShadow,
                backdropFilter: "blur(24px) saturate(190%)",
                WebkitBackdropFilter: "blur(24px) saturate(190%)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[26px]"
                style={{
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)",
                }}
              />

              <h4 className="relative text-xl font-semibold">Elastic glass modal</h4>
              <p className="relative mt-2 text-sm leading-7" style={{ color: active.muted }}>
                The modal opens with an elastic overshoot and micro-wobble to emulate soft liquid tension settling into shape.
              </p>

              <div className="relative mt-5 flex justify-end gap-2">
                <LiquidButton label="Close" onClick={() => setShowModal(false)} theme={theme} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

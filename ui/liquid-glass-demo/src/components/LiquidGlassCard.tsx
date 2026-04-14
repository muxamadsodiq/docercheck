import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ThemeMode, themeTokens } from "../lib/theme";
import LiquidButton from "./LiquidButton";

type Ripple = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
};

type LiquidGlassCardProps = {
  theme: ThemeMode;
  reducedMotion: boolean;
  onOpenModal: () => void;
};

export default function LiquidGlassCard({ theme, reducedMotion, onOpenModal }: LiquidGlassCardProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const rippleIdRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const localX = useMotionValue(200);
  const localY = useMotionValue(130);
  const localXSpring = useSpring(localX, { stiffness: 260, damping: 30 });
  const localYSpring = useSpring(localY, { stiffness: 260, damping: 30 });

  const cardGlow = useMotionTemplate`radial-gradient(300px 220px at ${localXSpring}px ${localYSpring}px, rgba(255,255,255,0.28), rgba(255,255,255,0) 65%)`;

  const active = themeTokens[theme];

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

  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    setIsHovered(true);
    spawnRipple(event);
  };

  const onPointerLeave = () => {
    setIsHovered(false);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    localX.set(event.clientX - rect.left);
    localY.set(event.clientY - rect.top);
  };

  const spawnRipple = (event: PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) {
      return;
    }

    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const dx = x < rect.width / 2 ? rect.width * 1.15 : -rect.width * 1.15;
    const dy = y < rect.height / 2 ? rect.height * 0.9 : -rect.height * 0.9;

    const id = ++rippleIdRef.current;
    setRipples((prev) => [...prev.slice(-4), { id, x, y, dx, dy }]);
  };

  return (
    <motion.section
      ref={cardRef}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      whileHover={reducedMotion ? undefined : { scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      animate={{
        boxShadow: cardShadow,
        backdropFilter: isHovered ? "blur(25px) saturate(260%)" : "blur(25px) saturate(200%)",
        WebkitBackdropFilter: isHovered ? "blur(25px) saturate(260%)" : "blur(25px) saturate(200%)",
      }}
      className="relative overflow-hidden rounded-[28px] border p-6 sm:p-8"
      style={{
        borderColor: "rgba(255,255,255,0.2)",
        background: active.panelGradient,
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
            animate={{ x: ripple.dx, y: ripple.dy, scale: 2.4, opacity: 0 }}
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
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Refraction-first liquid glass card</h1>
          <p className="max-w-xl text-sm leading-7" style={{ color: active.muted }}>
            Physical blur, spectral saturation shifts, and pointer-origin liquid wave propagation are composited in real time.
          </p>

          <div className="flex flex-wrap gap-3">
            <LiquidButton label="Primary Action" theme={theme} />
            <LiquidButton label="Open Elastic Modal" theme={theme} onClick={onOpenModal} />
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
              Physics profile
            </p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>Backdrop: blur(25px) saturate(200%)</li>
              <li>Glass base: rgba(255,255,255,0.08)</li>
              <li>Inner glow border: 1px rgba(255,255,255,0.2)</li>
              <li>Displacement refraction with animated turbulence</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ThemeMode, themeTokens } from "../lib/theme";

type Burst = {
  id: number;
  x: number;
  y: number;
};

type LiquidButtonProps = {
  label: string;
  theme: ThemeMode;
  onClick?: () => void;
};

export default function LiquidButton({ label, theme, onClick }: LiquidButtonProps) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burstIdRef = useRef(0);

  const createBurst = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = ++burstIdRef.current;

    setBursts((prev) => [
      ...prev.slice(-2),
      {
        id,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
    ]);
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

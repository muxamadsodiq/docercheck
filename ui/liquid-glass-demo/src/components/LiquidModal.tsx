import { AnimatePresence, motion } from "framer-motion";
import LiquidButton from "./LiquidButton";
import { ThemeMode, themeTokens } from "../lib/theme";

type LiquidModalProps = {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  shadow: string;
};

export default function LiquidModal({ isOpen, onClose, theme, shadow }: LiquidModalProps) {
  const active = themeTokens[theme];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close modal"
            onClick={onClose}
            style={{ background: "rgba(0,0,0,0.36)", backdropFilter: "blur(4px)" }}
          />

          <motion.div
            className="relative z-10 w-full max-w-lg rounded-[26px] border p-6"
            initial={{ opacity: 0, scale: 0.82, rotate: -1.8, borderRadius: 36 }}
            animate={{
              opacity: 1,
              scale: [0.82, 1.07, 0.97, 1.02, 1],
              rotate: [-1.8, 1.2, -0.7, 0.2, 0],
              borderRadius: [36, 18, 30, 24, 26],
            }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{
              duration: 0.92,
              times: [0, 0.34, 0.58, 0.78, 1],
              ease: [0.175, 0.885, 0.32, 1.15],
            }}
            style={{
              background: active.modalBackground,
              borderColor: active.modalBorder,
              boxShadow: shadow,
              backdropFilter: "blur(24px) saturate(190%)",
              WebkitBackdropFilter: "blur(24px) saturate(190%)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-[26px]"
              style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)" }}
            />

            <h3 className="relative text-xl font-semibold">Elastic liquid modal</h3>
            <p className="relative mt-2 text-sm leading-7" style={{ color: active.muted }}>
              Edge wobble and overshoot are tuned to feel like surface tension before the glass settles.
            </p>

            <div className="relative mt-6 flex justify-end">
              <LiquidButton label="Close" theme={theme} onClick={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

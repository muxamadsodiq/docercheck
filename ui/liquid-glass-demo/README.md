# Liquid Glass Demo

High-end React + Tailwind + Framer Motion component demo for liquid glassmorphism physics.

## Included Effects

- Glass base with `blur(25px) saturate(200%)` and translucent `rgba(255,255,255,0.08)` layers.
- SVG refraction with `feTurbulence` + `feDisplacementMap`.
- Gooey blob merge via `feGaussianBlur` + `feColorMatrix`.
- Hover spring scale (`stiffness: 300`, `damping: 20`) and dynamic depth/saturation.
- Pointer-origin liquid ripple wave over the card.
- Dark/light theme spill transition using expanding clip-path.
- Liquid-fill button click bursts.
- Elastic modal wobble animation.

## Run

Prerequisite: Node.js 20+ with npm/yarn/pnpm/bun.

```bash
cd ui/liquid-glass-demo
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Structure

- `src/App.tsx` - stage, filters, gooey blobs, theme spill orchestration.
- `src/components/LiquidGlassCard.tsx` - interactive refraction card.
- `src/components/LiquidButton.tsx` - liquid-fill click button.
- `src/components/LiquidModal.tsx` - elastic modal.
- `src/lib/theme.ts` - dark/light palettes and shared helpers.

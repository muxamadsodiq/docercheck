export type ThemeMode = "dark" | "light";

export type ThemePalette = {
  stageBackground: string;
  glow: string;
  blobA: string;
  blobB: string;
  blobC: string;
  text: string;
  muted: string;
  buttonText: string;
  spillColor: string;
  modalBackground: string;
  modalBorder: string;
  panelGradient: string;
};

export const themeTokens: Record<ThemeMode, ThemePalette> = {
  dark: {
    stageBackground:
      "radial-gradient(1200px 700px at 16% 12%, rgba(0, 216, 255, 0.18), transparent 50%), radial-gradient(1000px 680px at 82% 80%, rgba(0, 110, 255, 0.2), transparent 56%), linear-gradient(150deg, #02060f, #081224 48%, #030913)",
    glow: "rgba(76, 220, 255, 0.58)",
    blobA: "linear-gradient(145deg, rgba(29, 120, 255, 0.72), rgba(66, 230, 255, 0.54))",
    blobB: "linear-gradient(145deg, rgba(16, 211, 255, 0.64), rgba(121, 94, 255, 0.44))",
    blobC: "linear-gradient(145deg, rgba(111, 255, 245, 0.58), rgba(0, 101, 255, 0.38))",
    text: "#f3f8ff",
    muted: "#9ab2d4",
    buttonText: "#e8f7ff",
    spillColor: "#02060f",
    modalBackground: "rgba(7, 16, 33, 0.78)",
    modalBorder: "rgba(160, 230, 255, 0.22)",
    panelGradient: "linear-gradient(142deg, rgba(10, 28, 58, 0.54), rgba(22, 52, 85, 0.24))",
  },
  light: {
    stageBackground:
      "radial-gradient(1200px 700px at 16% 12%, rgba(132, 205, 255, 0.26), transparent 50%), radial-gradient(1000px 680px at 82% 80%, rgba(122, 224, 255, 0.24), transparent 56%), linear-gradient(150deg, #edf6ff, #f9fcff 48%, #e8f2ff)",
    glow: "rgba(64, 156, 219, 0.48)",
    blobA: "linear-gradient(145deg, rgba(148, 208, 255, 0.66), rgba(171, 229, 255, 0.54))",
    blobB: "linear-gradient(145deg, rgba(103, 196, 255, 0.58), rgba(188, 224, 255, 0.5))",
    blobC: "linear-gradient(145deg, rgba(171, 236, 255, 0.62), rgba(136, 196, 255, 0.44))",
    text: "#12243b",
    muted: "#56708f",
    buttonText: "#0f2a4a",
    spillColor: "#eef7ff",
    modalBackground: "rgba(255, 255, 255, 0.74)",
    modalBorder: "rgba(101, 166, 224, 0.24)",
    panelGradient: "linear-gradient(142deg, rgba(255, 255, 255, 0.68), rgba(220, 240, 255, 0.44))",
  },
};

export function viewportSpillRadius(): number {
  if (typeof window === "undefined") {
    return 2200;
  }
  return Math.hypot(window.innerWidth, window.innerHeight);
}

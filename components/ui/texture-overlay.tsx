import { cn } from "@/lib/utils"

export type TextureType =
  | "dots"
  | "grid"
  | "noise"
  | "crosshatch"
  | "diagonal"
  | "scatteredDots"
  | "halftone"
  | "triangular"
  | "chevron"
  | "paperGrain"
  | "horizontalLines"
  | "verticalLines"
  | "none"

interface TextureOverlayProps {
  texture: TextureType
  opacity?: number
  className?: string
}

interface TextureStyles {
  backgroundImage?: string
  backgroundSize?: string
  backgroundPosition?: string
}

const textureStyles: Record<TextureType, TextureStyles> = {
  dots: {
    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.4) 1px, transparent 0)",
    backgroundSize: "8px 8px",
  },
  grid: {
    backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.15) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  noise: {
    backgroundImage: "radial-gradient(circle at 2px 2px, rgba(0, 0, 0, 0.25) 1px, transparent 0)",
    backgroundSize: "6px 6px",
  },
  crosshatch: {
    backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px), repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)",
  },
  diagonal: {
    backgroundImage: "repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2) 1px, transparent 1px, transparent 6px)",
  },
  scatteredDots: {
    backgroundImage: "radial-gradient(circle at 3px 7px, rgba(0, 0, 0, 0.3) 1px, transparent 0), radial-gradient(circle at 11px 2px, rgba(0, 0, 0, 0.3) 1px, transparent 0), radial-gradient(circle at 7px 12px, rgba(0, 0, 0, 0.3) 1px, transparent 0)",
    backgroundSize: "16px 16px",
  },
  halftone: {
    backgroundImage: "radial-gradient(circle, rgba(0, 0, 0, 0.4) 25%, transparent 25%)",
    backgroundSize: "10px 10px",
    backgroundPosition: "0 0, 5px 5px",
  },
  triangular: {
    backgroundImage: "conic-gradient(from 0deg at 50% 50%, rgba(0, 0, 0, 0.3) 0deg 120deg, transparent 120deg 240deg, rgba(0, 0, 0, 0.3) 240deg 360deg)",
    backgroundSize: "8px 8px",
    backgroundPosition: "0 0, 4px 4px",
  },
  chevron: {
    backgroundImage: "repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.2) 0px, rgba(0, 0, 0, 0.2) 2px, transparent 2px, transparent 8px), repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.2) 0px, rgba(0, 0, 0, 0.2) 2px, transparent 2px, transparent 8px)",
  },
  paperGrain: {
    backgroundImage: "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.1) 0px, transparent 1px, transparent 4px), repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.05) 0px, transparent 1px, transparent 5px)",
  },
  horizontalLines: {
    backgroundImage: "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.25) 0px, rgba(0, 0, 0, 0.25) 1px, transparent 1px, transparent 4px)",
  },
  verticalLines: {
    backgroundImage: "repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.25) 0px, rgba(0, 0, 0, 0.25) 1px, transparent 1px, transparent 4px)",
  },
  none: {},
}

const defaultOpacities: Record<TextureType, number> = {
  dots: 1,
  grid: 1,
  noise: 1,
  crosshatch: 1,
  diagonal: 1,
  scatteredDots: 1,
  halftone: 1,
  triangular: 1,
  chevron: 1,
  paperGrain: 1,
  horizontalLines: 1,
  verticalLines: 1,
  none: 0,
}

export function TextureOverlay({
  texture,
  opacity,
  className,
}: TextureOverlayProps) {
  if (texture === "none") return null

  const finalOpacity = opacity ?? defaultOpacities[texture]
  const styles = textureStyles[texture]

  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        opacity: finalOpacity,
        ...styles,
      }}
    />
  )
}


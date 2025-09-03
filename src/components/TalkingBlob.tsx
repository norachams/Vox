"use client";
import { motion, useSpring, useTransform } from "framer-motion";

type Props = {
  active?: boolean;
  size?: number;
};

export default function TalkingBlob({ active = false, size = 180 }: Props) {
  // go back to this to see if you can make it looks better and more dynamic
  const energy = useSpring(active ? 1 : 0, { stiffness: 140, damping: 18 });
  const scale  = useTransform(energy, [0, 1], [1, 1.18]);           // core grow
  const rotate = useTransform(energy, [0, 1], [0, 10]);             // subtle tilt
  const glow   = useTransform(energy, [0, 1], [6, 24]);             // drop-shadow
  const glowFilter = useTransform(glow, (g) => `drop-shadow(0 0 ${g}px rgba(0,0,0,0.25))`);

  const S = size;
  const satellite = (w: number, h: number, className = "") => (
    <motion.div
      className={`absolute rounded-full ${className}`}
      style={{ width: w, height: h }}
      animate={
        active
          ? { x: [12, -12, 12], y: [-8, 8, -8] }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 2.6, repeat: active ? Infinity : 0, ease: "easeInOut" }}
    />
  );

  return (
    <div className="relative" style={{ width: S, height: S }}>
      {/* SVG goo filter */}
      <svg className="absolute inset-0 w-0 h-0" aria-hidden>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur" mode="matrix"
            values="
              1 0 0 0 0
              0 1 0 0 0
              0 0 1 0 0
              0 0 0 18 -8"
            result="goo"
          />
          <feBlend in="SourceGraphic" in2="goo" />
        </filter>
      </svg>

      {/* blob stack (goo applied) */}
      <div className="absolute inset-0" style={{ filter: "url(#goo)" }}>
        {/* main orb */}
        <motion.div
          className="absolute inset-0 m-auto rounded-full bg-primary"
          style={{
            width: S * 0.78,
            height: S * 0.78,
            scale,
            rotate,
          }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
        />

        {/* playful satellites (accent + teal) */}
        <div className="absolute inset-0">
          {/* top-left */}
          <div
            className="absolute"
            style={{ left: S * 0.14, top: S * 0.12 }}
          >
            {satellite(S * 0.22, S * 0.22, "bg-accent")}
          </div>
          {/* bottom-right */}
          <div
            className="absolute"
            style={{ right: S * 0.12, bottom: S * 0.12 }}
          >
            {satellite(S * 0.18, S * 0.18, "bg-teal")}
          </div>
        </div>
      </div>

      {/* soft glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          filter: glowFilter,
        }}
      />
    </div>
  );
}

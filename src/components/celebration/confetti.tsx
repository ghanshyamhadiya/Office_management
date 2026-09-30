"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

const palette = ["#4f6ef7", "#f472b6", "#facc15", "#34d399", "#fb923c", "#a78bfa", "#38bdf8", "#f87171"];

function seededRandom(seed: number) {
  let state = (seed * 2654435761) >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Particle = {
  id: number;
  color: string;
  size: number;
  round: boolean;
  dx: number;
  up: number;
  fall: number;
  rotate: number;
  delay: number;
  duration: number;
};

function makeParticles(count: number, spread: number, seed: number): Particle[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const angle = (random() - 0.5) * spread;
    const power = 280 + random() * 420;
    return {
      id: seed * 10_000 + index,
      color: palette[index % palette.length]!,
      size: 6 + random() * 7,
      round: random() > 0.65,
      dx: Math.sin(angle) * power,
      up: -(Math.cos(angle) * power * 0.9 + 80),
      fall: 420 + random() * 420,
      rotate: (random() - 0.5) * 1080,
      delay: random() * 0.15,
      duration: 2.4 + random() * 1.4,
    };
  });
}

export function ConfettiBurst({
  burstKey,
  count = 140,
  origin = { x: 0.5, y: 0.45 },
  spread = Math.PI * 1.1,
}: {
  burstKey: number;
  count?: number;
  origin?: { x: number; y: number };
  spread?: number;
}) {
  const reduceMotion = useReducedMotion();
  const particles = React.useMemo(() => makeParticles(count, spread, burstKey), [count, spread, burstKey]);

  if (reduceMotion || burstKey === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {particles.map((particle) => (
        <motion.span
          animate={{
            x: [0, particle.dx * 0.8, particle.dx],
            y: [0, particle.up, particle.up + particle.fall],
            rotate: [0, particle.rotate * 0.6, particle.rotate],
            opacity: [1, 1, 0],
            scale: [0.4, 1, 0.9],
          }}
          className="absolute block will-change-transform"
          initial={{ x: 0, y: 0, opacity: 0 }}
          key={particle.id}
          style={{
            left: `${origin.x * 100}%`,
            top: `${origin.y * 100}%`,
            width: particle.size,
            height: particle.round ? particle.size : particle.size * 0.45,
            borderRadius: particle.round ? 999 : 2,
            background: particle.color,
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            times: [0, 0.28, 1],
            ease: ["easeOut", [0.45, 0, 0.9, 0.6]],
          }}
        />
      ))}
    </div>
  );
}

const balloonColors = ["#f472b6", "#4f6ef7", "#facc15", "#34d399", "#fb923c", "#a78bfa", "#38bdf8"];

export function Balloons({ count = 9, seed = 1 }: { count?: number; seed?: number }) {
  const reduceMotion = useReducedMotion();
  const balloons = React.useMemo(() => {
    const random = seededRandom(seed + 7919);
    return Array.from({ length: count }, (_, index) => ({
        id: index,
        color: balloonColors[index % balloonColors.length]!,
        left: 4 + (index / Math.max(1, count - 1)) * 88 + (random() - 0.5) * 6,
        size: 44 + random() * 26,
        delay: random() * 1.2,
        duration: 6 + random() * 3,
        sway: 14 + random() * 22,
      }));
  }, [count, seed]);

  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[65] overflow-hidden">
      {balloons.map((balloon) => (
        <motion.div
          animate={{ y: "-130vh", x: [0, balloon.sway, -balloon.sway, balloon.sway * 0.5, 0] }}
          className="absolute bottom-0 will-change-transform"
          initial={{ y: "20vh" }}
          key={balloon.id}
          style={{ left: `${balloon.left}%` }}
          transition={{
            y: { duration: balloon.duration, delay: balloon.delay, ease: [0.4, 0, 0.6, 1] },
            x: { duration: balloon.duration, delay: balloon.delay, ease: "easeInOut" },
          }}
        >
          <svg height={balloon.size * 1.9} viewBox="0 0 40 76" width={balloon.size}>
            <ellipse cx="20" cy="22" fill={balloon.color} rx="18" ry="21" />
            <ellipse cx="13" cy="14" fill="#fff" opacity="0.35" rx="4" ry="6" />
            <path d="M17 42h6l-3 4z" fill={balloon.color} />
            <path d="M20 46c-3 8 3 14 0 22" fill="none" stroke="#94a3b8" strokeWidth="1" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

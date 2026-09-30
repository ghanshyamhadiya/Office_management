"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";
import { ease } from "@/components/motion/tokens";

const defaultFormat = (value: number) => Math.round(value).toLocaleString("en-IN");

export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 0.8,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const current = React.useRef(0);
  const formatRef = React.useRef(format);
  const reduceMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    formatRef.current = format;
    if (ref.current) ref.current.textContent = format(current.current);
  }, [format]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion) {
      current.current = value;
      node.textContent = formatRef.current(value);
      return;
    }

    const controls = animate(current.current, value, {
      duration,
      ease: ease.out,
      onUpdate: (latest) => {
        current.current = latest;
        node.textContent = formatRef.current(latest);
      },
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return (
    <span className="tabular-nums" ref={ref}>
      {format(0)}
    </span>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cake, Gift, PartyPopper, Sparkles, X } from "lucide-react";
import { Balloons, ConfettiBurst } from "@/components/celebration/confetti";
import { spring } from "@/components/motion/tokens";
import { Button } from "@/components/ui/button";
import type { BirthdayInfo } from "@/lib/services/birthday-service";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function storageKey(kind: "overlay" | "banner", userId: string, date: string) {
  return `officeflow:birthday-${kind}:${userId}:${date}`;
}

function readFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {}
}

function AnimatedHeadline({ text }: { text: string }) {
  return (
    <motion.h2
      animate="show"
      aria-label={text}
      className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl"
      initial="hidden"
      transition={{ staggerChildren: 0.035, delayChildren: 0.35 }}
    >
      {text.split("").map((char, index) => (
        <motion.span
          aria-hidden
          className="inline-block"
          key={`${char}-${index}`}
          variants={{
            hidden: { opacity: 0, y: 24, rotate: -8, scale: 0.8 },
            show: { opacity: 1, y: 0, rotate: 0, scale: 1, transition: spring.snappy },
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.h2>
  );
}

function CakeBadge() {
  return (
    <motion.div
      animate={{ scale: 1, rotate: 0 }}
      className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-pink-400 via-rose-400 to-orange-300 text-[#fff] shadow-[0_18px_40px_rgba(244,114,182,0.45)]"
      initial={{ scale: 0, rotate: -30 }}
      transition={{ ...spring.soft, delay: 0.15 }}
    >
      <motion.span
        animate={{ scaleY: [1, 1.25, 0.9, 1.15, 1], opacity: [0.9, 1, 0.8, 1, 0.9] }}
        className="absolute -top-3 left-1/2 h-4 w-2.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-400 to-yellow-200 blur-[0.5px]"
        style={{ originY: 1 }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
      <Cake className="h-11 w-11" strokeWidth={1.75} />
      {[0, 1, 2].map((index) => (
        <motion.span
          animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
          className="absolute text-yellow-200"
          key={index}
          style={{ top: ["-8px", "60%", "10%"][index], left: ["-10px", "-14px", "90%"][index] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.5 }}
        >
          <Sparkles className="h-4 w-4" />
        </motion.span>
      ))}
    </motion.div>
  );
}

export function BirthdayCelebration({ userId, userName, info }: { userId: string; userName: string; info: BirthdayInfo }) {
  const [overlayOpen, setOverlayOpen] = React.useState(false);
  const [bannerOpen, setBannerOpen] = React.useState(false);
  const [burst, setBurst] = React.useState(0);
  const [balloonsKey, setBalloonsKey] = React.useState(0);

  const hasColleagues = info.colleagues.length > 0;

  React.useEffect(() => {
    if (!info.isMyBirthday && !hasColleagues) return;
    // Decide immediately so the banner is part of the first layout (no content jump);
    // only the celebration effects wait a moment for the page to settle.
    const showOverlay = info.isMyBirthday && !readFlag(storageKey("overlay", userId, info.date));
    const showBanner = !readFlag(storageKey("banner", userId, info.date));
    const frame = window.requestAnimationFrame(() => setBannerOpen(showBanner));
    const timer = window.setTimeout(() => {
      if (showOverlay) {
        setOverlayOpen(true);
        setBurst((value) => value + 1);
        setBalloonsKey((value) => value + 1);
      } else if (showBanner) {
        setBurst((value) => value + 1);
      }
    }, 600);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [info.isMyBirthday, info.date, hasColleagues, userId]);

  React.useEffect(() => {
    if (!overlayOpen) return;
    const second = window.setTimeout(() => setBurst((value) => value + 1), 900);
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeOverlay();
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(second);
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayOpen]);

  function closeOverlay() {
    writeFlag(storageKey("overlay", userId, info.date));
    setOverlayOpen(false);
  }

  function dismissBanner() {
    writeFlag(storageKey("banner", userId, info.date));
    setBannerOpen(false);
  }

  function celebrateAgain() {
    setBurst((value) => value + 1);
    setBalloonsKey((value) => value + 1);
  }

  if (!info.isMyBirthday && !hasColleagues) return null;

  const colleagueNames = joinNames(info.colleagues.map((person) => firstName(person.name)));
  const bannerTitle = info.isMyBirthday
    ? `Happy birthday, ${firstName(userName)}!`
    : `Today is ${colleagueNames}'s birthday`;
  const bannerText = info.isMyBirthday
    ? hasColleagues
      ? `You share your special day with ${colleagueNames}. Have a wonderful one!`
      : "Wishing you a fantastic year ahead from the whole team."
    : `Take a moment to wish ${info.colleagues.length > 1 ? "them" : firstName(info.colleagues[0]!.name)} a happy birthday.`;

  return (
    <>
      <ConfettiBurst burstKey={burst} origin={overlayOpen ? { x: 0.5, y: 0.4 } : { x: 0.5, y: 0.12 }} />
      {balloonsKey > 0 && overlayOpen ? <Balloons key={balloonsKey} seed={balloonsKey} /> : null}

      <AnimatePresence>
        {bannerOpen ? (
          <motion.div
            animate={{ opacity: 1, height: "auto", y: 0 }}
            className="overflow-hidden"
            exit={{ opacity: 0, height: 0, y: -8 }}
            initial={{ opacity: 0, height: 0, y: -8 }}
            transition={spring.soft}
          >
            <div className="pb-6">
            <div className="relative flex items-center gap-4 overflow-hidden rounded-[var(--radius)] border border-pink-200/70 bg-gradient-to-r from-pink-50 via-amber-50 to-indigo-50 px-5 py-4 shadow-[var(--shadow-sm)]">
              <motion.div
                animate={{ x: ["-100%", "220%"] }}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 2.5, ease: "easeInOut" }}
              />
              <motion.div
                animate={{ rotate: [0, -12, 10, -6, 0] }}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-400 to-orange-300 text-[#fff] shadow-[0_8px_20px_rgba(244,114,182,0.35)]"
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
              >
                {info.isMyBirthday ? <Cake className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
              </motion.div>
              <div className="relative min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{bannerTitle}</p>
                <p className="text-sm text-slate-600">{bannerText}</p>
              </div>
              <Button className="relative hidden border-pink-200 bg-white/80 sm:inline-flex" onClick={celebrateAgain} size="sm" type="button" variant="outline">
                <PartyPopper className="h-4 w-4 text-pink-500" />
                Celebrate
              </Button>
              <button
                aria-label="Dismiss birthday banner"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                onClick={dismissBanner}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {overlayOpen ? (
          <motion.div
            animate={{ opacity: 1 }}
            aria-labelledby="birthday-title"
            aria-modal="true"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md"
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            initial={{ opacity: 0 }}
            onClick={closeOverlay}
            role="dialog"
          >
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white p-8 text-center shadow-[0_30px_80px_rgba(15,23,42,0.35)]"
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              initial={{ opacity: 0, scale: 0.7, y: 40, rotate: -4 }}
              onClick={(event) => event.stopPropagation()}
              transition={spring.soft}
            >
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-pink-100 via-amber-50 to-transparent" />
              <button
                aria-label="Close"
                className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={closeOverlay}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative space-y-5">
                <CakeBadge />
                <div className="space-y-3" id="birthday-title">
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500"
                    initial={{ opacity: 0, y: 8 }}
                    transition={{ delay: 0.25 }}
                  >
                    It&apos;s your day
                  </motion.p>
                  <AnimatedHeadline text={`Happy Birthday, ${firstName(userName)}!`} />
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm leading-6 text-slate-500"
                    initial={{ opacity: 0, y: 8 }}
                    transition={{ delay: 0.9 }}
                  >
                    The whole OfficeFlow team wishes you a joyful year full of wins, laughs, and great moments.
                    {hasColleagues ? ` You share today with ${colleagueNames}!` : ""}
                  </motion.p>
                </div>
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 sm:flex-row"
                  initial={{ opacity: 0, y: 12 }}
                  transition={{ delay: 1.1, ...spring.soft }}
                >
                  <Button className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500" onClick={closeOverlay} type="button">
                    Thank you!
                  </Button>
                  <Button className="flex-1" onClick={celebrateAgain} type="button" variant="outline">
                    <PartyPopper className="h-4 w-4 text-pink-500" />
                    Celebrate again
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

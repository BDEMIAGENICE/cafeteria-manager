import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

// Up to two decimals, as much as the value has (stock can be counted in halves).
const placesOf = (value) => Math.min(2, (String(value).split('.')[1] || '').length);
const show = (n, places) => String(Number(n.toFixed(places)));

// A number that counts up to its value when it appears, and glides to the new value when it
// changes. Screen readers get the final value at once; the digits in between are hidden from
// them. Nothing moves for people who ask their system for reduced motion.
export default function CountUp({ value, duration = 900, delay = 0 }) {
  const target = Number(value);
  const places = placesOf(target);
  const final = Number.isFinite(target) ? show(target, places) : String(value);
  const animate = Number.isFinite(target) && !prefersReducedMotion();

  const [text, setText] = useState(animate ? show(0, places) : final);
  const shown = useRef(0); // what is on screen right now, as a number
  const played = useRef(false); // the first run waits for `delay`, later ones go straight away

  useEffect(() => {
    if (!animate) {
      shown.current = target;
      setText(final);
      return undefined;
    }
    const from = shown.current;
    const length = played.current ? Math.min(duration, 600) : duration;
    let frame;
    let start = null;

    const step = (now) => {
      if (start === null) start = now;
      const progress = Math.min(1, (now - start) / length);
      shown.current = from + (target - from) * easeOutCubic(progress);
      setText(progress === 1 ? final : show(shown.current, places));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    const timer = setTimeout(
      () => {
        played.current = true;
        frame = requestAnimationFrame(step);
      },
      played.current ? 0 : delay,
    );
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{final}</span>
    </>
  );
}

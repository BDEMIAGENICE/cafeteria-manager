import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDownIcon } from './icons.jsx';

// A button that opens a short list of actions (WAI-ARIA menu button pattern).
// items: [{ label, onSelect, disabled }]
export default function Menu({ label, items, className = 'btn btn-secondary' }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const button = useRef(null);
  const id = useId();

  const entries = () => [...root.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
  const focusAt = (i) => {
    const list = entries();
    list[(i + list.length) % list.length]?.focus();
  };

  // Close on a click or focus outside the menu.
  useEffect(() => {
    if (!open) return;
    const away = (e) => !root.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('focusin', away);
    focusAt(0);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('focusin', away);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    button.current.focus();
  };

  const onKeyDown = (e) => {
    const list = entries();
    const i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowDown') focusAt(i + 1);
    else if (e.key === 'ArrowUp') focusAt(i - 1);
    else if (e.key === 'Home') focusAt(0);
    else if (e.key === 'End') focusAt(-1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="menu" ref={root} onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={button}
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
        <ChevronDownIcon />
      </button>
      {open && (
        <div className="menu-list elev-md" role="menu" id={id} aria-label={label}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="menu-item"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

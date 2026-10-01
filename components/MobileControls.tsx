"use client";

import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { AbilityId } from "@/game/types";
import { ABILITIES } from "@/game/data";

type Props = {
  direction: { x: number; y: number };
  onDirection: (x: number, y: number) => void;
  onAction: () => void;
  onAbility: (id: AbilityId) => void;
  abilities: AbilityId[];
  cooldowns: Record<AbilityId, number>;
};

export default function MobileControls({ direction, onDirection, onAction, onAbility, abilities, cooldowns }: Props) {
  const padRef = useRef<HTMLDivElement | null>(null);

  const updateStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const radius = rect.width * 0.36;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    onDirection((dx * scale) / radius, (dy * scale) / radius);
  };

  const releaseStick = () => onDirection(0, 0);

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <div
        ref={padRef}
        className="joystick"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); updateStick(event); }}
        onPointerMove={updateStick}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
        onPointerLeave={(event) => { if ((event.currentTarget as HTMLElement).hasPointerCapture(event.pointerId)) return; releaseStick(); }}
      >
        <span className="joystick-dot" style={{ transform: `translate(${direction.x * 29}px, ${direction.y * 29}px)` }} />
        <span className="joystick-cross horizontal" />
        <span className="joystick-cross vertical" />
      </div>
      <div className="mobile-actions">
        <div className="touch-abilities">
          {abilities.map((id) => (
            <button key={id} className="touch-ability" onPointerDown={() => onAbility(id)} disabled={cooldowns[id] > 0} aria-label={ABILITIES[id].name}>
              <span>{ABILITIES[id].symbol}</span>
              <small>{cooldowns[id] > 0 ? cooldowns[id].toFixed(1) : id}</small>
            </button>
          ))}
        </div>
        <button className="touch-action" onPointerDown={onAction} aria-label="Action">ACT</button>
      </div>
    </div>
  );
}

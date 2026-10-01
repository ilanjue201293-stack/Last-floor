"use client";

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

export default function MobileControls({
  direction,
  onDirection,
  onAction,
  onAbility,
  abilities,
  cooldowns,
}: Props) {
  const pad = (x: number, y: number) => onDirection(x, y);

  return (
    <div className="mobile-controls" aria-label="Touch controls">
      <div
        className="joystick"
        onPointerLeave={() => pad(0, 0)}
        onPointerUp={() => pad(0, 0)}
        onPointerCancel={() => pad(0, 0)}
      >
        <button onPointerDown={() => pad(-1, 0)} aria-label="Move left">‹</button>
        <button onPointerDown={() => pad(1, 0)} aria-label="Move right">›</button>
        <button onPointerDown={() => pad(0, -1)} aria-label="Move up">↑</button>
        <button onPointerDown={() => pad(0, 1)} aria-label="Move down">↓</button>
        <span className="joystick-dot" style={{ transform: `translate(${direction.x * 8}px, ${direction.y * 8}px)` }} />
      </div>
      <div className="mobile-actions">
        <button className="touch-action" onPointerDown={onAction}>ACT</button>
        <div className="touch-abilities">
          {abilities.map((id) => (
            <button
              key={id}
              className="touch-ability"
              onPointerDown={() => onAbility(id)}
              disabled={cooldowns[id] > 0}
              title={ABILITIES[id].name}
            >
              <span>{ABILITIES[id].symbol}</span>
              <small>{cooldowns[id] > 0 ? cooldowns[id].toFixed(1) : ABILITIES[id].name}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

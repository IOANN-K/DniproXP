import { useId, useState } from "react";
import type { ImpactPhoto } from "../../entities/impact/types";
import { Photo } from "../../shared/ui/primitives";

export function BeforeAfter({
  before,
  after,
}: {
  before: ImpactPhoto | null;
  after: ImpactPhoto | null;
}) {
  const [position, setPosition] = useState(50);
  const id = useId();
  if (!before && !after)
    return (
      <p className="impact-note">
        Фото до / після не додані. Відсутність фото не замінюється зображенням з
        іншого квесту.
      </p>
    );
  if (!before || !after) {
    const photo = (before || after)!;
    return (
      <figure className="impact-single-photo">
        <Photo src={photo.url} alt={photo.alt} />
        <figcaption>
          {before ? "До" : "Після"} · {photo.alt} · Демонстраційне зображення,
          не доказ реальної зміни.
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="impact-comparison">
      <div className="impact-comparison-stage">
        <Photo src={before.url} alt={`До: ${before.alt}`} />
        <div
          className="impact-after-layer"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <Photo src={after.url} alt={`Після: ${after.alt}`} />
        </div>
        <span className="impact-photo-label">До</span>
        <span className="impact-photo-label impact-photo-after">Після</span>
        <span
          className="impact-comparison-divider"
          style={{ left: `${position}%` }}
        />
      </div>
      <label htmlFor={id}>Порівняти до / після · {position}%</label>
      <input
        id={id}
        type="range"
        min="0"
        max="100"
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
      />
      <figcaption>
        {before.alt} / {after.alt}. Демонстраційні зображення — не доказ
        реальних змін. Повзунок підтримує клавіші зі стрілками.
      </figcaption>
    </figure>
  );
}

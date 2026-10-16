export type BrandIconName =
  | "logo" | "compass" | "care" | "quest" | "community" | "achievement"
  | "location" | "eco" | "workspace" | "animals" | "culture" | "education" | "growth";

/** Generated brand artwork. Controls keep familiar action symbols and text labels. */
export function BrandIcon({
  name,
  size = 28,
  className = "",
}: {
  name: BrandIconName;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={`/brand/${name}.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`brand-icon ${className}`}
      draggable={false}
    />
  );
}

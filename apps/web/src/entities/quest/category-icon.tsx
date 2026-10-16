import { BrandIcon } from "../../features/brand/brand-icon";
import type { BrandIconName } from "../../features/brand/brand-icon";
import type { QuestCategory } from "../types";
const icons: Record<QuestCategory["icon"], BrandIconName> = {
  leaf: "eco", heart: "care", paw: "animals", palette: "culture",
  book: "education", building: "workspace",
};
export function CategoryIcon({ category, size = 32 }: { category: QuestCategory; size?: number }) {
  return <BrandIcon name={icons[category.icon]} size={Math.max(size, 24)} />;
}

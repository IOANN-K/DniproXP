import {
  Leaf,
  Heart,
  PawPrint,
  Palette,
  BookOpen,
  Building2,
} from "lucide-react";
import type { QuestCategory } from "../types";
const icons = {
  leaf: Leaf,
  heart: Heart,
  paw: PawPrint,
  palette: Palette,
  book: BookOpen,
  building: Building2,
};
export function CategoryIcon({
  category,
  size = 24,
}: {
  category: QuestCategory;
  size?: number;
}) {
  const Icon = icons[category.icon];
  return <Icon size={size} aria-hidden="true" />;
}

export {
  Dialog as Sheet,
  DialogTrigger as SheetTrigger,
  DialogClose as SheetClose,
} from "./dialog";
import { DialogContent } from "./dialog";
import type { ComponentProps } from "react";
export function SheetContent(
  props: Omit<ComponentProps<typeof DialogContent>, "sheet">,
) {
  return <DialogContent {...props} sheet />;
}

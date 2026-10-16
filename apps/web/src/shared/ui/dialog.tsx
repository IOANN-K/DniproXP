import * as Primitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export const Dialog = Primitive.Root;
export const DialogTrigger = Primitive.Trigger;
export const DialogClose = Primitive.Close;
export function DialogContent({
  title,
  description,
  children,
  sheet = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  sheet?: boolean;
}) {
  return (
    <Primitive.Portal>
      <Primitive.Overlay className="dialog-overlay" />
      <Primitive.Content
        className={sheet ? "dialog-content sheet-content" : "dialog-content"}
      >
        <Primitive.Title>{title}</Primitive.Title>
        <Primitive.Description>{description}</Primitive.Description>
        {children}
        <Primitive.Close className="dialog-close" aria-label="Закрити">
          <X size={20} />
        </Primitive.Close>
      </Primitive.Content>
    </Primitive.Portal>
  );
}

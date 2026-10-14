"use client";

import * as React from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import { cn } from "cn";

// Rechtsklick-Menü (shadcn base-nova, verschlankt und an die Tokens angepasst: Optik wie das Markier-Menü im Editor).

function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger({ ...props }: ContextMenuPrimitive.Trigger.Props) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuContent({ className, ...props }: ContextMenuPrimitive.Popup.Props) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner className="isolate z-50 outline-none" align="start" alignOffset={4} side="right" sideOffset={0}>
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(
            "z-50 min-w-40 origin-(--transform-origin) rounded-[10px] bg-card p-1 text-fg shadow-[0_0_0_1px_var(--line2),0_12px_32px_rgba(0,0,0,.28)] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
            className
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({ className, variant = "default", ...props }: ContextMenuPrimitive.Item.Props & { variant?: "default" | "destructive" }) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-variant={variant}
      className={cn(
        "flex min-h-8 cursor-default items-center gap-2 rounded-[7px] px-2 text-[13px] outline-hidden select-none data-highlighted:bg-hover data-[variant=destructive]:text-st-red [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({ className, ...props }: ContextMenuPrimitive.Separator.Props) {
  return <ContextMenuPrimitive.Separator data-slot="context-menu-separator" className={cn("-mx-1 my-1 h-px bg-line", className)} {...props} />;
}

export { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator };

"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { SearchIcon } from "lucide-react"
import { cn } from "cn"

// Befehlsleiste im Graphit-Stil (Board „Übersicht“): Suchzeile 52px, Gruppen mit Mono-Label,
// Zeilen 38px, Kürzel rechts in Kästchen. Basis ist cmdk, der Dialog kommt von Base UI.

function CommandDialog({
  title = "Befehlsleiste",
  children,
  ...props
}: DialogPrimitive.Root.Props & { title?: string; children: React.ReactNode }) {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup className="fixed top-[12vh] left-1/2 z-50 w-[min(600px,calc(100%-32px))] -translate-x-1/2 overflow-hidden rounded-2xl bg-card text-fg shadow-[0_0_0_1px_var(--line2),var(--shadow-cmdk)] outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-[.98] data-ending-style:opacity-0 data-starting-style:scale-[.98] data-starting-style:opacity-0">
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive data-slot="command" className={cn("flex flex-col", className)} {...props} />
}

function CommandInput({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex h-[52px] items-center gap-2.5 border-b border-line px-4">
      <SearchIcon className="size-4 shrink-0 text-fg-3" aria-hidden />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "h-[50px] min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-3",
          className
        )}
        {...props}
      />
      {children}
    </div>
  )
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("max-h-[min(420px,60vh)] scroll-py-2 overflow-y-auto overscroll-contain p-2", className)}
      {...props}
    />
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("px-3 py-8 text-center text-[13.5px] text-fg-2", className)}
      {...props}
    />
  )
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:tracking-[.12em] [&_[cmdk-group-heading]]:text-fg-3 [&_[cmdk-group-heading]]:uppercase",
        className
      )}
      {...props}
    />
  )
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "flex h-[38px] cursor-default items-center gap-3 rounded-[9px] px-3 text-[13.5px] text-fg-2 select-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-active data-[selected=true]:text-fg [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "rounded-[5px] px-[5px] font-mono text-[10.5px] leading-4 text-fg-3 shadow-[inset_0_0_0_1px_var(--line2)]",
        className
      )}
      {...props}
    />
  )
}

function CommandShortcut({ keys }: { keys: string[] }) {
  return (
    <span className="ml-auto flex gap-1" aria-hidden>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </span>
  )
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, Kbd }

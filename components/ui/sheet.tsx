"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@ui-sdk/react/drawer"

import { cn } from "@/lib/utils"
import { asChildProps } from "./as-child"

type WithClass<T> = Omit<T, "className"> & { className?: string }
type Side = "top" | "right" | "bottom" | "left"

const SideContext = React.createContext<Side>("right")

const SIDE_CLASSES: Record<Side, string> = {
  right: "h-dvh w-3/4 border-l sm:max-w-sm",
  left: "h-dvh w-3/4 border-r sm:max-w-sm",
  bottom: "max-h-[90dvh] w-full rounded-t-2xl border-t",
  top: "w-full border-b",
}

function Sheet({
  side = "right",
  ...props
}: Omit<React.ComponentProps<typeof Drawer>, "side"> & { side?: Side }) {
  return (
    <SideContext.Provider value={side}>
      <Drawer side={side} {...props} />
    </SideContext.Provider>
  )
}

function SheetTrigger({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DrawerTrigger>, "children"> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <DrawerTrigger {...props} {...asChildProps(asChild, children)} />
}

function SheetClose({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DrawerClose>, "children"> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <DrawerClose {...props} {...asChildProps(asChild, children)} />
}

function SheetContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: WithClass<React.ComponentProps<typeof DrawerContent>> & {
  showCloseButton?: boolean
  children?: React.ReactNode
}) {
  const side = React.useContext(SideContext)
  return (
    <>
      <DrawerBackdrop className="fixed inset-0 bg-black/55" />
      <DrawerContent
        className={cn(
          "bg-background text-foreground relative flex flex-col gap-4 shadow-2xl outline-none",
          SIDE_CLASSES[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DrawerClose
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring/50 absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px] [&_svg]:size-4"
          >
            <XIcon aria-hidden="true" />
          </DrawerClose>
        )}
      </DrawerContent>
    </>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: WithClass<React.ComponentProps<typeof DrawerTitle>>) {
  return <DrawerTitle className={cn("text-foreground font-semibold", className)} {...props} />
}

function SheetDescription({
  className,
  ...props
}: WithClass<React.ComponentProps<typeof DrawerDescription>>) {
  return (
    <DrawerDescription className={cn("text-muted-foreground text-sm", className)} {...props} />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

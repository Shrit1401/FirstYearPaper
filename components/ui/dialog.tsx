"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import {
  Dialog as DialogRoot,
  DialogBackdrop,
  DialogClose as DialogClosePart,
  DialogContent as DialogContentPart,
  DialogDescription as DialogDescriptionPart,
  DialogTitle as DialogTitlePart,
  DialogTrigger as DialogTriggerPart,
} from "@ui-sdk/react/dialog"

import { cn } from "@/lib/utils"
import { asChildProps } from "./as-child"

type WithClass<T> = Omit<T, "className"> & { className?: string }

const Dialog = DialogRoot

function DialogTrigger({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogTriggerPart>, "children"> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <DialogTriggerPart {...props} {...asChildProps(asChild, children)} />
}

function DialogClose({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof DialogClosePart>, "children"> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <DialogClosePart {...props} {...asChildProps(asChild, children)} />
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: WithClass<React.ComponentProps<typeof DialogContentPart>> & {
  showCloseButton?: boolean
  children?: React.ReactNode
}) {
  return (
    <>
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
      <DialogContentPart
        className={cn(
          "bg-background text-foreground fixed top-1/2 left-1/2 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-6 shadow-2xl outline-none sm:max-w-lg",
          "transition-[opacity,scale] duration-200 ease-[var(--ease-out)] data-starting-style:scale-[0.96] data-starting-style:opacity-0 data-ending-style:scale-[0.96] data-ending-style:opacity-0 motion-reduce:transition-none",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClosePart
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:ring-ring/50 absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-[3px] [&_svg]:size-4"
          >
            <XIcon aria-hidden="true" />
          </DialogClosePart>
        )}
      </DialogContentPart>
    </>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: WithClass<React.ComponentProps<typeof DialogTitlePart>>) {
  return (
    <DialogTitlePart
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: WithClass<React.ComponentProps<typeof DialogDescriptionPart>>) {
  return (
    <DialogDescriptionPart
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}

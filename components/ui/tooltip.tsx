"use client"

import * as React from "react"
import {
  Tooltip as TooltipRoot,
  TooltipArrow,
  TooltipContent as TooltipContentPart,
  TooltipTrigger as TooltipTriggerPart,
} from "@ui-sdk/react/tooltip"

import { cn } from "@/lib/utils"
import { asChildProps } from "./as-child"

const DelayContext = React.createContext<number | undefined>(undefined)

function TooltipProvider({
  delayDuration,
  children,
}: {
  delayDuration?: number
  children?: React.ReactNode
}) {
  return <DelayContext.Provider value={delayDuration}>{children}</DelayContext.Provider>
}

function Tooltip({ delay, ...props }: React.ComponentProps<typeof TooltipRoot>) {
  const shared = React.useContext(DelayContext)
  return <TooltipRoot delay={delay ?? shared} {...props} />
}

function TooltipTrigger({
  asChild,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TooltipTriggerPart>, "children"> & {
  asChild?: boolean
  children?: React.ReactNode
}) {
  return <TooltipTriggerPart {...props} {...asChildProps(asChild, children)} />
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: Omit<React.ComponentProps<typeof TooltipContentPart>, "className" | "children"> & {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <TooltipContentPart
      sideOffset={sideOffset}
      className={cn(
        "bg-foreground text-background w-fit max-w-xs origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
        "transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
      <TooltipArrow className="size-2.5 rotate-45 rounded-[2px] bg-inherit" />
    </TooltipContentPart>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

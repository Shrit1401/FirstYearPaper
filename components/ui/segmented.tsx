"use client"

import * as React from "react"
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from "@ui-sdk/react/segmented-control"

import { cn } from "@/lib/utils"

type Option<T extends string> = { value: T; label: React.ReactNode }

function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  itemClassName,
  indicatorClassName,
  ...props
}: {
  value: T
  onValueChange: (value: T) => void
  options: readonly Option<T>[]
  className?: string
  itemClassName?: string
  indicatorClassName?: string
  "aria-label": string
}) {
  return (
    <SegmentedControl
      value={value}
      onValueChange={(next) => {
        if (next != null) onValueChange(next as T)
      }}
      className={cn("relative isolate flex gap-1 p-1", className)}
      {...props}
    >
      <SegmentedControlIndicator
        className={cn(
          "absolute -z-10 top-(--segmented-control-indicator-top) left-(--segmented-control-indicator-left) h-(--segmented-control-indicator-height) w-(--segmented-control-indicator-width) bg-background shadow-sm",
          "transition-[left,width] duration-250 [transition-timing-function:var(--ease-out)] motion-reduce:transition-none",
          indicatorClassName
        )}
      />
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          className={cn(
            "flex-1 cursor-pointer px-3 py-2 text-xs font-medium transition-[color,transform] duration-150 ease-out outline-none select-none active:scale-[0.97] data-checked:text-foreground data-unchecked:text-muted-foreground data-unchecked:hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:active:scale-100",
            itemClassName
          )}
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

export { Segmented }

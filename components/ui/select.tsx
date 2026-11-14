"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import {
  Select as SelectRoot,
  SelectContent as SelectContentPart,
  SelectItem as SelectItemPart,
  SelectItemIndicator,
  SelectItemText,
  SelectTrigger as SelectTriggerPart,
  SelectValue as SelectValuePart,
  type SelectProps,
} from "@ui-sdk/react/select"

import { cn } from "@/lib/utils"

type WithClass<T> = Omit<T, "className"> & { className?: string }

function Select({
  value,
  defaultValue,
  onValueChange,
  ...props
}: Omit<SelectProps<string>, "value" | "defaultValue" | "onValueChange" | "multiple"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <SelectRoot
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (next != null) onValueChange?.(next)
      }}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: WithClass<React.ComponentProps<typeof SelectTriggerPart>> & {
  size?: "sm" | "default"
  children?: React.ReactNode
}) {
  return (
    <SelectTriggerPart
      data-size={size}
      className={cn(
        "group/select border-input data-placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,background-color] outline-none focus-visible:ring-[3px] data-disabled:cursor-not-allowed data-disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        size === "sm" ? "h-8" : "h-9",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon aria-hidden="true" className="size-4 opacity-50 transition-transform duration-200 ease-out group-data-open/select:rotate-180" />
    </SelectTriggerPart>
  )
}

function SelectValue(props: WithClass<React.ComponentProps<typeof SelectValuePart>>) {
  return <SelectValuePart {...props} />
}

function SelectContent({
  className,
  children,
  sideOffset = 4,
  ...props
}: WithClass<React.ComponentProps<typeof SelectContentPart>> & {
  children?: React.ReactNode
}) {
  return (
    <SelectContentPart
      sideOffset={sideOffset}
      className={cn(
        "bg-popover text-popover-foreground max-h-[min(24rem,var(--available-height))] min-w-[max(8rem,var(--anchor-width))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border p-1 shadow-xl outline-none",
        "transition-[opacity,scale] duration-150 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    >
      {children}
    </SelectContentPart>
  )
}

function SelectItem({
  className,
  children,
  textValue,
  label,
  ...props
}: WithClass<React.ComponentProps<typeof SelectItemPart>> & {
  textValue?: string
  children?: React.ReactNode
}) {
  return (
    <SelectItemPart
      label={label ?? textValue}
      className={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <SelectItemText className="min-w-0 flex-1">{children}</SelectItemText>
      <SelectItemIndicator className="absolute right-2 flex size-3.5 items-center justify-center">
        <CheckIcon aria-hidden="true" className="size-4" />
      </SelectItemIndicator>
    </SelectItemPart>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }

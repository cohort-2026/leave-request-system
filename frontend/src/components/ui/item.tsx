import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function ItemGroup({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="item-group"
      className={cn("flex w-full flex-col gap-2", className)}
      {...props}
    />
  )
}

const itemVariants = cva(
  "flex w-full flex-wrap items-center gap-3 rounded-lg border border-transparent p-3 text-sm",
  {
    variants: {
      variant: {
        default: "",
        outline: "border-border",
        muted: "bg-muted/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Item({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"li"> & VariantProps<typeof itemVariants>) {
  return (
    <li
      data-slot="item"
      data-variant={variant}
      className={cn(itemVariants({ variant }), className)}
      {...props}
    />
  )
}

function ItemMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-media"
      className={cn("flex shrink-0 items-center justify-center", className)}
      {...props}
    />
  )
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  )
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-title"
      className={cn("text-sm leading-snug font-medium", className)}
      {...props}
    />
  )
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="item-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="item-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

export {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
}

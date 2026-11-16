"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";
import * as React from "react";

interface ScrollAreaProps extends ScrollAreaPrimitive.Root.Props {
  viewportClassName?: string;
  orientation?: "both" | "horizontal" | "vertical";
  /** Edge fade for the scrolling viewport. Defaults to the x-axis for
      horizontal scrollers and the y-axis otherwise; `false` opts out. */
  fade?: "x" | "y" | false;
}

function ScrollArea({
  className,
  viewportClassName,
  orientation = "both",
  fade,
  children,
  ...props
}: ScrollAreaProps) {
  const fadeAxis = fade ?? (orientation === "horizontal" ? "x" : "y");
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("scroll-area-root relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:ring-inset",
          fadeAxis === "x" && "scroll-fade-x",
          fadeAxis === "y" && "scroll-fade",
          viewportClassName,
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" && <ScrollBar orientation="vertical" />}
      {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
      {orientation === "both" && <ScrollAreaPrimitive.Corner />}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "scroll-area-bar flex touch-none p-0.5 transition-opacity duration-200 select-none",
        orientation === "vertical"
          ? "h-full w-2.5 border-l border-l-transparent"
          : "h-2.5 w-full flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-muted-foreground/30 transition-[background-color] hover:bg-muted-foreground/50"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };

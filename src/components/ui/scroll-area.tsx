import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  /** which scrollbars to render (default: both) */
  orientation?: "horizontal" | "vertical" | "both";
  /** when false the scrollbars stay mounted but are hidden, so the area still scrolls */
  showScrollbar?: boolean;
  /** render children directly in the viewport instead of a content wrapper */
  disableImplicitContentElement?: boolean;
  viewportClassName?: string;
  viewportStyle?: React.CSSProperties;
  viewportRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  scrollbarClassName?: string;
  thumbClassName?: string;
  cornerClassName?: string;
}

function ScrollArea({
  className,
  style,
  children,
  orientation = "both",
  showScrollbar = true,
  disableImplicitContentElement,
  viewportClassName,
  viewportStyle,
  viewportRef,
  onScroll,
  scrollbarClassName,
  thumbClassName,
  cornerClassName,
  ...props
}: ScrollAreaProps) {
  const horizontal = orientation !== "vertical";
  const vertical = orientation !== "horizontal";

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      style={{ position: undefined, ...style }}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        disableImplicitContentElement={disableImplicitContentElement}
        className={cn(
          "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
          viewportClassName,
        )}
        style={viewportStyle}
        onScroll={onScroll}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {vertical ? (
        <ScrollBar
          orientation="vertical"
          className={cn(scrollbarClassName, !showScrollbar && "hidden")}
          thumbClassName={thumbClassName}
        />
      ) : null}
      {horizontal ? (
        <ScrollBar
          orientation="horizontal"
          className={cn(scrollbarClassName, !showScrollbar && "hidden")}
          thumbClassName={thumbClassName}
        />
      ) : null}
      {horizontal && vertical ? (
        <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" className={cornerClassName} />
      ) : null}
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  thumbClassName,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar> & {
  thumbClassName?: string;
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn("bg-border relative flex-1 rounded-full", thumbClassName)}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };

import * as React from "react";
import { ScrollArea } from "../components/ui/scroll-area";
import { cn } from "../lib/utils";
import { CLASSES } from "../CSSClassNames";

// radix positions the scrollbar absolutely (top/right/bottom/left inline); only the thickness and
// stacking order are styled here, matching the upstream 6px mini scrollbar
const SCROLLBAR_CLASSES =
    "z-[1] data-[orientation=horizontal]:h-[6px] data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-[6px]";
const THUMB_CLASSES =
    "bg-[var(--fl-color-mini-scroll-indicator)] hover:bg-[var(--fl-color-mini-scroll-indicator-hovered)]";
const CORNER_CLASSES = "bg-transparent";

/** @internal props for the shadcn ScrollArea used by the tab strips and tab content */
export interface ITabScrollAreaProps {
    className?: string;
    style?: React.CSSProperties;
    rootRef?: React.Ref<HTMLDivElement>;
    viewportClassName?: string;
    viewportStyle?: React.CSSProperties;
    viewportRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    orientation: "horizontal" | "vertical" | "both";
    /** when false the thumb is hidden (enableScrollbars/enableTabScrollbar), but the scroll area still scrolls */
    showScrollbar: boolean;
    /** when false the viewport is not scrollable; used by tabs with enableScrollbars=false */
    scrollEnabled?: boolean;
    classNameMapper: (className: string) => string;
    children?: React.ReactNode;
}

/**
 * @internal Scroll area for the tab strips and tab content, built on the shadcn ScrollArea
 * (Radix). Children render directly in the viewport (no implicit content wrapper), so the
 * upstream tab strip/tab content DOM and drag/measure logic stay intact; the shadcn scrollbar
 * replaces the native one (and the old mini scrollbar).
 */
export const TabScrollArea = (props: ITabScrollAreaProps) => {
    const { classNameMapper: cm, orientation, showScrollbar, scrollEnabled = true } = props;
    const horizontal = orientation !== "vertical";
    const vertical = orientation !== "horizontal";
    const overflow = scrollEnabled ? "auto" : "hidden";

    const scrollbarClass = cn(
        SCROLLBAR_CLASSES,
        cm(CLASSES.FLEXLAYOUT__SCROLL_AREA_SCROLLBAR),
        !showScrollbar && cm(CLASSES.FLEXLAYOUT__SCROLL_AREA_SCROLLBAR_HIDDEN),
    );

    return (
        <ScrollArea
            ref={props.rootRef}
            type="hover"
            className={cn("relative flex min-h-0 min-w-0 grow overflow-hidden", props.className)}
            style={props.style}
            orientation={orientation}
            showScrollbar={showScrollbar}
            disableImplicitContentElement
            viewportClassName={props.viewportClassName}
            viewportStyle={{
                overflowX: horizontal ? overflow : "hidden",
                overflowY: vertical ? overflow : "hidden",
                ...props.viewportStyle,
            }}
            viewportRef={props.viewportRef}
            onScroll={props.onScroll}
            scrollbarClassName={scrollbarClass}
            thumbClassName={cn(THUMB_CLASSES, cm(CLASSES.FLEXLAYOUT__SCROLL_AREA_THUMB))}
            cornerClassName={cn(CORNER_CLASSES, cm(CLASSES.FLEXLAYOUT__SCROLL_AREA_CORNER))}
        >
            {props.children}
        </ScrollArea>
    );
};

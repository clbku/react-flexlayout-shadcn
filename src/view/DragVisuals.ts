import { CLASSES } from "../CSSClassNames";
import { cn } from "../lib/utils";

// drag previews and drop outlines are rendered imperatively, outside React, so their utility
// classes live here instead of in component class names

/** wrapper for a custom drag image (also used by the offscreen tab stamp) */
export const DRAG_RECT_CLASSES =
    "box-border flex flex-col justify-center overflow-hidden rounded-[5px] border-2 border-[color:var(--fl-color-drag-rect-border)] bg-[var(--fl-color-drag-rect-background)] px-[0.8em] py-[0.3em] break-words text-[var(--fl-color-drag-rect)] [font-family:var(--fl-font-family)] [font-size:var(--fl-font-size)]";

/** splitter drag preview line */
export const SPLITTER_DRAG_CLASSES = "absolute z-[1000] flex items-center justify-center rounded-[5px] bg-[var(--fl-color-splitter-drag)]";

/** the grip drawn on the splitter drag preview */
export const SPLITTER_HANDLE_CLASSES = "rounded-[3px] bg-[var(--fl-color-splitter-handle)] [visibility:var(--fl-splitter-handle-visibility)]";
export const SPLITTER_HANDLE_HORZ_CLASSES = "h-[30px] w-[3px]";
export const SPLITTER_HANDLE_VERT_CLASSES = "h-[3px] w-[30px]";

/** drop outline; the edge variant marks an edge dock rather than a split */
export function outlineRectClasses(className: string, mapper: (className: string) => string) {
    return cn(
        "pointer-events-none absolute z-[1000] box-border rounded-[5px] border-2",
        className === CLASSES.FLEXLAYOUT__OUTLINE_RECT_EDGE
            ? "border-[color:var(--fl-color-drag2)] bg-[color:var(--fl-color-drag2-background)]"
            : "border-[color:var(--fl-color-drag1)] bg-[color:var(--fl-color-drag1-background)]",
        mapper(className),
    );
}

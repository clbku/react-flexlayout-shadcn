import * as React from "react";
import { Actions } from "../model/Actions";
import { BorderNode } from "../model/BorderNode";
import { DockLocation } from "../model/DockLocation";
import { RowNode } from "../model/RowNode";
import { Orientation } from "../model/Orientation";
import { CLASSES } from "../CSSClassNames";
import { I18nLabel } from "./I18nLabel";
import { LayoutController } from "./layout/LayoutInternal";
import { enablePointerOnIFrames, hasModifier, isDesktop, startDrag } from "./Utils";
import { Rect } from "../model/Rect";
import { Separator } from "../components/ui/separator";
import { SPLITTER_DRAG_CLASSES, SPLITTER_HANDLE_CLASSES, SPLITTER_HANDLE_HORZ_CLASSES, SPLITTER_HANDLE_VERT_CLASSES } from "./DragVisuals";
import { cn } from "../lib/utils";

/** @internal */
export interface ISplitterProps {
    controller: LayoutController;
    node: RowNode | BorderNode;
    index: number;
    horizontal: boolean;
}

/** @internal */
export const Splitter = (props: ISplitterProps) => {
    const { controller, node, index, horizontal } = props;

    const selfRef = React.useRef<HTMLDivElement>(null);
    const pBounds = React.useRef<number[]>([]);
    const outlineDiv = React.useRef<HTMLDivElement | undefined>(undefined);
    const handleDiv = React.useRef<HTMLDivElement | undefined>(undefined);
    const dragStartX = React.useRef<number>(0);
    const dragStartY = React.useRef<number>(0);
    const initalSizes = React.useRef<{ initialSizes: number[]; sum: number; startPosition: number }>({ initialSizes: [], sum: 0, startPosition: 0 });
    const draggingTimerRef = React.useRef<number | undefined>(undefined);

    const onTouchStart = React.useCallback((event: TouchEvent) => {
        event.preventDefault();
        event.stopImmediatePropagation();
    }, []);

    React.useEffect(() => {
        const self = selfRef.current;
        // Android fix: must have passive touchstart handler to prevent default handling
        self?.addEventListener("touchstart", onTouchStart, { passive: false });
        return () => {
            self?.removeEventListener("touchstart", onTouchStart);
            // clean up any mid-drag resources if the splitter unmounts
            if (draggingTimerRef.current !== undefined) {
                clearTimeout(draggingTimerRef.current);
                draggingTimerRef.current = undefined;
            }
            if (outlineDiv.current) {
                controller.getRootDiv()?.removeChild(outlineDiv.current);
                outlineDiv.current = undefined;
                enablePointerOnIFrames(true, controller.getCurrentDocument()!);
                controller.setSplitterDragging(false);
            }
        };
    }, [onTouchStart, controller]);

    const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
        event.stopPropagation();
        if (node instanceof RowNode) {
            initalSizes.current = node.getSplitterInitials(index);
        }

        controller.setSplitterDragging(true);
        enablePointerOnIFrames(false, controller.getCurrentDocument()!);
        startDrag(event.currentTarget.ownerDocument, event, onDragMove, onDragEnd, onDragCancel);

        pBounds.current = node instanceof BorderNode ? node.getSplitterBounds(true) : node.getSplitterBounds(index);
        const rootdiv = controller.getRootDiv();
        outlineDiv.current = controller.getCurrentDocument()!.createElement("div");
        outlineDiv.current.className = cn(
            SPLITTER_DRAG_CLASSES,
            horizontal ? "flex-row" : "flex-col",
            horizontal ? "cursor-ew-resize" : "cursor-ns-resize",
            controller.getClassName(CLASSES.FLEXLAYOUT__SPLITTER_DRAG),
            node instanceof BorderNode && controller.getClassName(CLASSES.FLEXLAYOUT__SPLITTER_BORDER),
        );

        handleDiv.current = controller.getCurrentDocument()!.createElement("div");
        handleDiv.current.className = cn(
            SPLITTER_HANDLE_CLASSES,
            horizontal ? SPLITTER_HANDLE_HORZ_CLASSES : SPLITTER_HANDLE_VERT_CLASSES,
            cm(CLASSES.FLEXLAYOUT__SPLITTER_HANDLE),
            cm(horizontal ? CLASSES.FLEXLAYOUT__SPLITTER_HANDLE_HORZ : CLASSES.FLEXLAYOUT__SPLITTER_HANDLE_VERT),
        );
        outlineDiv.current.appendChild(handleDiv.current);

        const r = selfRef.current!.getBoundingClientRect()!;
        const rect = new Rect(r.x - controller.getDomRect()!.x, r.y - controller.getDomRect()!.y, r.width, r.height);

        dragStartX.current = event.clientX - r.x;
        dragStartY.current = event.clientY - r.y;

        rect.positionElement(outlineDiv.current);
        if (rootdiv) {
            rootdiv.appendChild(outlineDiv.current);
        }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (hasModifier(event)) {
            return; // modified arrows are left for keymap bindings (e.g. tabset cycling)
        }
        let delta = 0;
        if (horizontal) {
            // vertical separator: left/right arrows
            if (event.key === "ArrowLeft") delta = -10;
            if (event.key === "ArrowRight") delta = 10;
        } else {
            if (event.key === "ArrowUp") delta = -10;
            if (event.key === "ArrowDown") delta = 10;
        }
        if (delta !== 0) {
            event.preventDefault();
            controller.setSplitterDragging(true);
            if (node instanceof BorderNode) {
                // moving towards the border edge shrinks it; bottom/right borders grow the other way
                const location = node.getLocation();
                const grow = location === DockLocation.BOTTOM || location === DockLocation.RIGHT ? -delta : delta;
                const size = Math.max(node.getMinSize(), Math.min(node.getMaxSize(), node.getSize() + grow));
                controller.doAction(Actions.adjustBorderSplit(node.getId(), size));
            } else {
                const initials = node.getSplitterInitials(index);
                // an unmeasured row (all zero rects) cannot be split: skip rather than emitting
                // Infinity/NaN weights from a division by the zero sum
                if (initials.sum <= 0) {
                    controller.setSplitterDragging(false);
                    return;
                }
                const bounds = node.getSplitterBounds(index);
                const pos = Math.max(bounds[0], Math.min(bounds[1], initials.startPosition + delta));
                const weights = node.calculateSplit(index, pos, initials.initialSizes, initials.sum, initials.startPosition);
                controller.doAction(Actions.adjustWeights(node.getId(), weights));
            }
            // keep the flag long enough for the ResizeObserver to fire
            setTimeout(() => controller.setSplitterDragging(false), 300);
        }
    };

    const onDragCancel = () => {
        if (outlineDiv.current) {
            // commit an in-progress realtime resize so the undo snapshot taken at drag start is
            // flushed here rather than leaking into the next action; a non-realtime drag only moved
            // the preview outline, so a cancelled drag leaves the model untouched
            if (controller.isRealtimeResize()) {
                updateLayout(false);
            }
            const rootdiv = controller.getRootDiv();
            if (rootdiv && outlineDiv.current) {
                rootdiv.removeChild(outlineDiv.current as HTMLElement);
            }
            outlineDiv.current = undefined;
        }
        draggingTimerRef.current = window.setTimeout(() => controller.setSplitterDragging(false), 300);
        enablePointerOnIFrames(true, controller.getCurrentDocument()!);
    };

    const onDragMove = (x: number, y: number) => {
        if (outlineDiv.current) {
            const clientRect = controller.getDomRect();
            if (!clientRect) {
                return;
            }
            if (node.getOrientation() === Orientation.VERT) {
                outlineDiv.current!.style.top = getBoundPosition(y - clientRect.y - dragStartY.current) + "px";
            } else {
                outlineDiv.current!.style.left = getBoundPosition(x - clientRect.x - dragStartX.current) + "px";
            }

            if (controller.isRealtimeResize()) {
                updateLayout(true);
            }
        }
    };

    const onDragEnd = () => {
        if (outlineDiv.current) {
            updateLayout(false);

            const rootdiv = controller.getRootDiv();
            if (rootdiv && outlineDiv.current) {
                rootdiv.removeChild(outlineDiv.current as HTMLElement);
            }
            outlineDiv.current = undefined;
        }
        // keep the flag until the ResizeObserver has fired
        draggingTimerRef.current = window.setTimeout(() => controller.setSplitterDragging(false), 300);
        enablePointerOnIFrames(true, controller.getCurrentDocument()!);
    };

    const updateLayout = (adjusting: boolean) => {
        const redraw = () => {
            if (outlineDiv.current) {
                let value: number;
                if (node.getOrientation() === Orientation.VERT) {
                    value = outlineDiv.current!.offsetTop;
                } else {
                    value = outlineDiv.current!.offsetLeft;
                }

                if (node instanceof BorderNode) {
                    const pos = (node as BorderNode).calculateSplit(node, value);
                    controller.doAction(Actions.adjustBorderSplit(node.getId(), pos).setAdjusting(adjusting));
                } else {
                    const init = initalSizes.current;
                    // an unmeasured row (all zero rects) cannot be split: skip rather than emitting
                    // Infinity/NaN weights from a division by the zero sum
                    if (init.sum <= 0) {
                        return;
                    }
                    const weights = node.calculateSplit(index, value, init.initialSizes, init.sum, init.startPosition);
                    controller.doAction(Actions.adjustWeights(node.getId(), weights).setAdjusting(adjusting));
                }
            }
        };

        redraw();
    };

    const getBoundPosition = (p: number) => {
        const bounds = pBounds.current as number[];
        let rtn = p;
        if (p < bounds[0]) {
            rtn = bounds[0];
        }
        if (p > bounds[1]) {
            rtn = bounds[1];
        }

        return rtn;
    };

    const cm = controller.getClassName;
    const style: React.CSSProperties & { [key: string]: any } = {};

    let className = cn(
        "relative z-10 flex touch-none items-center justify-center bg-[var(--fl-color-splitter)]",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--fl-color-focus)]",
        "hover:rounded-[5px] hover:bg-[var(--fl-color-splitter-hover)] hover:transition-[background-color] hover:delay-[50ms] hover:duration-100 hover:ease-in",
        horizontal
            ? [
                  "w-[var(--fl-splitter-size)] min-w-[var(--fl-splitter-size)] flex-col cursor-ew-resize",
                  "before:absolute before:inset-y-0 before:left-1/2 before:z-[1] before:w-[var(--fl-splitter-active-size)] before:-translate-x-1/2 before:content-['']",
              ]
            : [
                  "h-[var(--fl-splitter-size)] min-h-[var(--fl-splitter-size)] flex-row cursor-ns-resize",
                  "before:absolute before:inset-x-0 before:top-1/2 before:z-[1] before:h-[var(--fl-splitter-active-size)] before:-translate-y-1/2 before:content-['']",
              ],
        cm(CLASSES.FLEXLAYOUT__SPLITTER),
        cm(CLASSES.FLEXLAYOUT__SPLITTER_ + node.getOrientation().getName()),
    );

    if (node instanceof BorderNode) {
        className = cn(className, cm(CLASSES.FLEXLAYOUT__SPLITTER_BORDER));
    } else {
        if (node.getModel().getMaximizedTabset(controller.getLayoutId()) !== undefined) {
            style.display = "none";
        }
    }

    if (!isDesktop()) {
        style["--fl-splitter-active-size"] = `30px`;
    }

    // value announced to assistive technology: row splitters report a 0-100 percentage position
    // within the row; border splitters report the border size in px (with min/max as the range)
    let splitterValue: number | undefined = undefined;
    let splitterMin: number | undefined = undefined;
    let splitterMax: number | undefined = undefined;
    let splitterValueText: string | undefined = undefined;
    if (node instanceof RowNode) {
        const rowRect = node.getRect();
        const prev = node.getChildren()[index - 1];
        const extent = horizontal ? rowRect.width : rowRect.height;
        if (prev && extent > 0) {
            const prevRect = prev.getRect();
            splitterValue = Math.round(((horizontal ? prevRect.getRight() - rowRect.x : prevRect.getBottom() - rowRect.y) / extent) * 100);
            splitterMin = 0;
            splitterMax = 100;
            splitterValueText = splitterValue + "%"; // announced preferentially over the raw number
        }
    } else {
        splitterValue = Math.round(node.getSize());
        splitterMin = Math.round(node.getMinSize());
        splitterMax = Math.round(node.getMaxSize());
        splitterValueText = splitterValue + "px"; // announced preferentially over the raw number
    }

    return (
        <div
            className={className}
            style={style}
            ref={selfRef}
            role="separator"
            aria-label={controller.i18nName(I18nLabel.Splitter)}
            aria-orientation={horizontal ? "vertical" : "horizontal"}
            aria-valuenow={splitterValue}
            aria-valuemin={splitterMin}
            aria-valuemax={splitterMax}
            aria-valuetext={splitterValueText}
            tabIndex={0}
            onKeyDown={onKeyDown}
            data-layout-path={node.getPath() + "/s" + (index - 1)}
            onPointerDown={onPointerDown}
        >
            <Separator
                orientation={horizontal ? "vertical" : "horizontal"}
                className={cn(
                    SPLITTER_HANDLE_CLASSES,
                    horizontal
                        ? "data-[orientation=vertical]:h-[30px] data-[orientation=vertical]:min-h-[30px] data-[orientation=vertical]:max-h-[30px] data-[orientation=vertical]:w-[3px] data-[orientation=vertical]:min-w-[3px] data-[orientation=vertical]:max-w-[3px]"
                        : "data-[orientation=horizontal]:h-[3px] data-[orientation=horizontal]:min-h-[3px] data-[orientation=horizontal]:max-h-[3px] data-[orientation=horizontal]:w-[30px] data-[orientation=horizontal]:min-w-[30px] data-[orientation=horizontal]:max-w-[30px]",
                    cm(CLASSES.FLEXLAYOUT__SPLITTER_HANDLE),
                    cm(horizontal ? CLASSES.FLEXLAYOUT__SPLITTER_HANDLE_HORZ : CLASSES.FLEXLAYOUT__SPLITTER_HANDLE_VERT),
                )}
            />
        </div>
    );
};

Splitter.displayName = "Splitter"; // name in react dev tools

import * as React from "react";

/** a floating window resize direction; corners combine n/s with e/w */
export type ResizeDirection = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

const RESIZE_ZINDEX = 10;
const RESIZE_MARGIN = -4;
const RESIZE_EDGE_SIZE = 8;
const RESIZE_CORNER_SIZE = 12;

interface IResizeHandle {
    direction: ResizeDirection;
    style: React.CSSProperties;
}

// the handles overhang the window edge by RESIZE_MARGIN so the pointer can grab it
const RESIZE_HANDLES: IResizeHandle[] = [
    { direction: "n", style: { top: RESIZE_MARGIN, left: RESIZE_EDGE_SIZE, right: RESIZE_EDGE_SIZE, height: RESIZE_EDGE_SIZE, cursor: "ns-resize" } },
    { direction: "s", style: { bottom: RESIZE_MARGIN, left: RESIZE_EDGE_SIZE, right: RESIZE_EDGE_SIZE, height: RESIZE_EDGE_SIZE, cursor: "ns-resize" } },
    { direction: "e", style: { top: RESIZE_EDGE_SIZE, bottom: RESIZE_EDGE_SIZE, right: RESIZE_MARGIN, width: RESIZE_EDGE_SIZE, cursor: "ew-resize" } },
    { direction: "w", style: { top: RESIZE_EDGE_SIZE, bottom: RESIZE_EDGE_SIZE, left: RESIZE_MARGIN, width: RESIZE_EDGE_SIZE, cursor: "ew-resize" } },
    { direction: "nw", style: { top: RESIZE_MARGIN, left: RESIZE_MARGIN, width: RESIZE_CORNER_SIZE, height: RESIZE_CORNER_SIZE, cursor: "nwse-resize" } },
    { direction: "ne", style: { top: RESIZE_MARGIN, right: RESIZE_MARGIN, width: RESIZE_CORNER_SIZE, height: RESIZE_CORNER_SIZE, cursor: "nesw-resize" } },
    { direction: "sw", style: { bottom: RESIZE_MARGIN, left: RESIZE_MARGIN, width: RESIZE_CORNER_SIZE, height: RESIZE_CORNER_SIZE, cursor: "nesw-resize" } },
    { direction: "se", style: { bottom: 0, right: 0, width: RESIZE_CORNER_SIZE, height: RESIZE_CORNER_SIZE, cursor: "nwse-resize" } },
];

/** @internal */
export interface IResizeHandlesProps {
    onResizePointerDown: (event: React.PointerEvent<HTMLElement>, direction: ResizeDirection) => void;
}

/** @internal the eight invisible edge/corner drag zones of a floating window */
export const ResizeHandles = (props: IResizeHandlesProps) => (
    <>
        {RESIZE_HANDLES.map((handle) => (
            <div
                key={handle.direction}
                data-resize-handle={handle.direction}
                style={{ position: "absolute", zIndex: RESIZE_ZINDEX, ...handle.style }}
                onPointerDown={(event) => props.onResizePointerDown(event, handle.direction)}
            />
        ))}
    </>
);

ResizeHandles.displayName = "ResizeHandles"; // name in react dev tools

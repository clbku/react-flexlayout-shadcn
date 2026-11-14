import * as React from "react";
import { Orientation } from "../model/Orientation";
import { LayoutController } from "./layout/LayoutInternal";
import { BorderNode } from "../model/BorderNode";
import { Splitter } from "./Splitter";
import { DockLocation } from "../model/DockLocation";
import { CLASSES } from "../CSSClassNames";
import { cn } from "../lib/utils";

const OVERLAY_LOCATION_CLASSES: Record<string, string> = {
    top: "inset-x-0 top-0 flex-col",
    bottom: "inset-x-0 bottom-0 flex-col",
    left: "inset-y-0 left-0 flex-row",
    right: "inset-y-0 right-0 flex-row",
};

/** @internal */
export interface IBorderTabProps {
    controller: LayoutController;
    borderNode: BorderNode;
    show: boolean;
}

export function BorderTab(props: IBorderTabProps) {
    const { controller, borderNode, show } = props;
    const selfRef = React.useRef<HTMLDivElement>(null);

    // callback ref: fires on attach/detach including remounts, unlike an effect
    const setSelfRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            selfRef.current = element;
            controller.registerMeasurable(borderNode, "bordercontent", element);
        },
        [controller, borderNode],
    );

    let horizontal = true;
    const style: React.CSSProperties = {};

    if (borderNode.getOrientation() === Orientation.HORZ) {
        style.width = borderNode.getSize();
        style.minWidth = borderNode.getMinSize();
        style.maxWidth = borderNode.getMaxSize();
    } else {
        style.height = borderNode.getSize();
        style.minHeight = borderNode.getMinSize();
        style.maxHeight = borderNode.getMaxSize();
        horizontal = false;
    }

    const className = cn("box-border overflow-hidden bg-[var(--fl-color-border-tab-content)]", controller.getClassName(CLASSES.FLEXLAYOUT__BORDER_TAB_CONTENTS));
    const contentFirst = borderNode.getLocation() === DockLocation.LEFT || borderNode.getLocation() === DockLocation.TOP;

    if (borderNode.isOverlay()) {
        // overlay mode: the host + splitter render in an absolutely positioned wrapper overlaying
        // the main layout area (anchored to the border's edge) instead of insetting it; the
        // measured host still drives the tab panel position via the border's contentRect
        style.display = "flex";
        const wrapperStyle: React.CSSProperties = { display: show ? "flex" : "none" };
        if (horizontal) {
            // match the default border geometry: left/right panels (and their splitters) are
            // truncated by open top/bottom panels, which span the full width. Open default
            // top/bottom borders shrink the anchor element in flow, but open overlay ones do
            // not, so inset the wrapper by their size (+ splitter) explicitly
            const model = controller.getModel();
            for (const other of model.getBorderSet().getBorders()) {
                if (other !== borderNode && other.isOverlay() && other.isShowing() && other.getSelected() !== -1) {
                    const inset = other.getSize() + model.getSplitterSize();
                    if (other.getLocation() === DockLocation.TOP) {
                        wrapperStyle.top = inset;
                    } else if (other.getLocation() === DockLocation.BOTTOM) {
                        wrapperStyle.bottom = inset;
                    }
                }
            }
        }
        const wrapperClassName = cn(
            "absolute z-[100]",
            OVERLAY_LOCATION_CLASSES[borderNode.getLocation().getName()],
            controller.getClassName(CLASSES.FLEXLAYOUT__BORDER_TAB_OVERLAY),
            controller.getClassName(CLASSES.FLEXLAYOUT__BORDER_TAB_OVERLAY_ + borderNode.getLocation().getName()),
        );
        return (
            <div className={wrapperClassName} style={wrapperStyle}>
                {contentFirst && <div ref={setSelfRef} style={style} className={className}></div>}
                {show && <Splitter controller={controller} node={borderNode} index={0} horizontal={horizontal} />}
                {!contentFirst && <div ref={setSelfRef} style={style} className={className}></div>}
            </div>
        );
    }

    style.display = show ? "flex" : "none";

    if (contentFirst) {
        return (
            <>
                <div ref={setSelfRef} style={style} className={className}></div>
                {show && <Splitter controller={controller} node={borderNode} index={0} horizontal={horizontal} />}
            </>
        );
    } else {
        return (
            <>
                {show && <Splitter controller={controller} node={borderNode} index={0} horizontal={horizontal} />}
                <div ref={setSelfRef} style={style} className={className}></div>
            </>
        );
    }
}

BorderTab.displayName = "BorderTab"; // name in react dev tools

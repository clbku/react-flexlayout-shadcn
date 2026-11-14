import { LayoutController } from "./layout/LayoutInternal";
import { CLASSES } from "../CSSClassNames";
import { cn } from "../lib/utils";

/** @internal */
export interface IOverlayProps {
    controller: LayoutController;
    show: boolean;
}

/** @internal */
export const Overlay = (props: IOverlayProps) => {
    const { controller: controller, show } = props;

    return (
        <div
            aria-hidden="true"
            className={cn("absolute inset-0 z-[1000]", controller.getClassName(CLASSES.FLEXLAYOUT__LAYOUT_OVERLAY))}
            style={{
                display: show ? "flex" : "none",
                // display: (show ? "flex" : "none"), backgroundColor: "rgba(0, 0, 0, 0.2)"
            }}
        />
    );
};

Overlay.displayName = "Overlay"; // name in react dev tools

import * as React from "react";
import { DockLocation } from "../../model/DockLocation";
import { BorderTabSet } from "../BorderTabSet";
import { BorderTab } from "../BorderTab";
import { CLASSES } from "../../CSSClassNames";
import { LayoutController } from "./LayoutInternal";
import { cn } from "../../lib/utils";

export interface IBorderContainerProps {
    controller: LayoutController;
    inner: React.ReactNode;
}

export const BorderContainer = ({ controller, inner }: IBorderContainerProps) => {
    const classMain = cn("relative flex grow basis-0 min-h-0 min-w-0", controller.getClassName(CLASSES.FLEXLAYOUT__LAYOUT_MAIN));
    const borders = controller.getModel().getBorderSet().getBorderMap();

    if (controller.isMainLayout() && borders.size > 0) {
        const innerContent = (
            <div className={classMain} ref={controller.getMainRef()}>
                {inner}
            </div>
        );
        const borderSetComponents = new Map<DockLocation, React.ReactNode>();
        const borderSetContentComponents = new Map<DockLocation, React.ReactNode>();

        for (const [_, location] of DockLocation.values) {
            const border = borders.get(location);
            const showBorder =
                border && border.isShowing() && (!border.isAutoHide() || (border.isAutoHide() && (border.getChildren().length > 0 || controller.getState().showHiddenBorder === location)));

            if (showBorder) {
                borderSetComponents.set(location, <BorderTabSet controller={controller} borderNode={border} size={controller.getState().calculatedBorderBarSize} />);
                borderSetContentComponents.set(location, <BorderTab controller={controller} borderNode={border} show={border.getSelected() !== -1} />);
            }
        }

        const classBorderOuter = cn("flex grow basis-0 min-h-0 min-w-0", controller.getClassName(CLASSES.FLEXLAYOUT__LAYOUT_BORDER_CONTAINER));
        const classBorderInner = cn("relative flex grow basis-0 min-h-0 min-w-0", controller.getClassName(CLASSES.FLEXLAYOUT__LAYOUT_BORDER_CONTAINER_INNER));

        const innerWithBorderTabs = (
            <div className={cn(classBorderInner, "flex-col")}>
                {borderSetContentComponents.get(DockLocation.TOP)}
                <div className={cn(classBorderInner, "flex-row")}>
                    {borderSetContentComponents.get(DockLocation.LEFT)}
                    {innerContent}
                    {borderSetContentComponents.get(DockLocation.RIGHT)}
                </div>
                {borderSetContentComponents.get(DockLocation.BOTTOM)}
            </div>
        );
        return (
            <div className={cn(classBorderOuter, "flex-col")}>
                {borderSetComponents.get(DockLocation.TOP)}
                <div className={cn(classBorderInner, "flex-row")}>
                    {borderSetComponents.get(DockLocation.LEFT)}
                    {innerWithBorderTabs}
                    {borderSetComponents.get(DockLocation.RIGHT)}
                </div>
                {borderSetComponents.get(DockLocation.BOTTOM)}
            </div>
        );
    } else {
        // no borders
        return (
            <div className={cn(classMain, "absolute inset-0")} ref={controller.getMainRef()}>
                {inner}
            </div>
        );
    }
};

BorderContainer.displayName = "BorderContainer"; // name in react dev tools

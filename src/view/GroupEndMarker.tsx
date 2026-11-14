import * as React from "react";
import { Actions } from "../model/Actions";
import { TabGroupNode } from "../model/TabGroupNode";
import { LayoutController } from "./layout/LayoutInternal";
import { CLASSES } from "../CSSClassNames";
import { badgeVariants } from "../components/ui/badge";
import { cn } from "../lib/utils";

/** @internal */
export interface IGroupEndMarkerProps {
    controller: LayoutController;
    groupNode: TabGroupNode;
    path: string;
}

/** @internal the right-side cap of a split pill, rendered after the group's last tab */
export const GroupEndMarker = (props: IGroupEndMarkerProps) => {
    const { controller, groupNode, path } = props;
    const selfRef = React.useRef<HTMLDivElement>(null);

    const setSelfRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            selfRef.current = element;
            controller.registerMeasurable(groupNode, "groupendmarker", element);
        },
        [controller, groupNode],
    );

    const onClick = (event: React.MouseEvent<HTMLElement>) => {
        controller.doAction(Actions.updateNodeAttributes(groupNode.getId(), { opened: !groupNode.isOpened() } as any));
        event.stopPropagation();
    };

    const color = groupNode.getColor();
    const style: React.CSSProperties = {
        backgroundColor: color,
        borderColor: color,
    };

    return (
        <div
            ref={setSelfRef}
            data-layout-path={path}
            title={groupNode.getName()}
            aria-hidden={true}
            className={cn(
                badgeVariants({ variant: "secondary" }),
                "my-[2px] inline-block box-border cursor-pointer rounded-l-none rounded-r-[var(--fl-tabgroup-pill-radius)] border border-l-0 border-[color:var(--fl-color-tabset-divider-line)] px-[7px] py-[2px] [font-size:inherit] font-normal",
                controller.getClassName(CLASSES.FLEXLAYOUT__GROUP_END_MARKER),
            )}
            style={style}
            onClick={onClick}
        >
            {"\u200B"}
        </div>
    );
};

GroupEndMarker.displayName = "GroupEndMarker";

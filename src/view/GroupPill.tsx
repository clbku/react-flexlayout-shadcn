import * as React from "react";
import { Actions } from "../model/Actions";
import { TabGroupNode } from "../model/TabGroupNode";
import { TabNode } from "../model/TabNode";
import { LayoutController } from "./layout/LayoutInternal";
import { CLASSES } from "../CSSClassNames";
import { I18nLabel } from "./I18nLabel";
import { badgeVariants } from "../components/ui/badge";
import { cn } from "../lib/utils";

/** @internal */
export interface IGroupPillProps {
    controller: LayoutController;
    groupNode: TabGroupNode;
    path: string;
}

/** @internal */
export const GroupPill = (props: IGroupPillProps) => {
    const { controller, groupNode, path } = props;
    const selfRef = React.useRef<HTMLDivElement>(null);

    // callback ref: fires on attach/detach including remounts, unlike an effect
    const setSelfRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            selfRef.current = element;
            controller.registerMeasurable(groupNode, "grouppill", element);
        },
        [controller, groupNode],
    );

    const onDragStart = (event: React.DragEvent<HTMLElement>) => {
        if (groupNode.isEnableDrag()) {
            event.stopPropagation(); // prevent starting a tabset drag as well
            controller.getDragDropManager().setDragNode(event.nativeEvent, groupNode);
        } else {
            event.preventDefault();
        }
    };

    const onDragEnd = (_event: React.DragEvent<HTMLElement>) => {
        controller.getDragDropManager().onDragEnded();
    };

    const onContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        controller.showContextMenu(groupNode, event);
    };

    const toggleOpen = () => {
        // click/Enter/Space toggles the group open/closed (Chrome style collapse/expand)
        controller.doAction(Actions.updateNodeAttributes(groupNode.getId(), { opened: !groupNode.isOpened() } as any));
    };

    const onClick = (event: React.MouseEvent<HTMLElement>) => {
        toggleOpen();
        event.stopPropagation();
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            toggleOpen();
            event.preventDefault();
        } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            // open the group menu at the pill: redispatched as a real contextmenu event so it
            // flows through the same onContextMenu pipeline (and positioning) as a right click
            const r = selfRef.current!.getBoundingClientRect();
            selfRef.current!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
            event.preventDefault();
        }
    };

    const cm = controller.getClassName;
    const isOpened = groupNode.isOpened();
    const isUnderline = controller.getModel().getTabGroupType() === "underline";

    const classNames = cn(
        badgeVariants({ variant: "secondary" }),
        "box-border inline-flex cursor-pointer items-center gap-[0.35em] px-2 py-[2px] my-[2px] whitespace-nowrap select-none [font-size:inherit] font-normal",
        "rounded-l-[var(--fl-tabgroup-pill-radius)] border border-r-0 border-[color:var(--fl-color-tabset-divider-line)] text-[var(--fl-color-tabgroup-pill-text)]",
        "focus-visible:outline-2 focus-visible:outline-[var(--fl-color-focus)]",
        (!isOpened || isUnderline) && "rounded-r-[var(--fl-tabgroup-pill-radius)] border-r",
        cm(CLASSES.FLEXLAYOUT__GROUP_PILL),
        !isOpened && cm(CLASSES.FLEXLAYOUT__GROUP_PILL_COLLAPSED),
        isOpened && isUnderline && cm(CLASSES.FLEXLAYOUT__GROUP_PILL_UNDERLINE),
    );

    const color = groupNode.getColor();
    const style: React.CSSProperties = {
        backgroundColor: color,
        borderColor: color,
    };

    const tooltip = controller.i18nName(I18nLabel.Group_Pill_Tooltip);

    return (
        <div
            ref={setSelfRef}
            data-layout-path={path}
            // a disclosure button: activation collapses/expands the group (aria-expanded)
            role="button"
            aria-label={groupNode.getName()}
            aria-expanded={groupNode.isOpened()}
            tabIndex={0}
            title={tooltip}
            className={classNames}
            style={style}
            draggable={true}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={onClick}
            onKeyDown={onKeyDown}
            onContextMenu={onContextMenu}
        >
            <span className={cn("max-w-[10em] overflow-hidden text-ellipsis", cm(CLASSES.FLEXLAYOUT__GROUP_PILL_NAME))}>
                {"\u200B"}
                {groupNode.getName()}
            </span>
            {!groupNode.isOpened() && (
                <span aria-hidden="true" className={cn("text-[0.85em] opacity-70", cm(CLASSES.FLEXLAYOUT__GROUP_PILL_COUNT))}>
                    {(groupNode.getChildren() as TabNode[]).length}
                </span>
            )}
        </div>
    );
};

GroupPill.displayName = "GroupPill"; // name in react dev tools

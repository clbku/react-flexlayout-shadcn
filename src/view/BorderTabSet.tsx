import * as React from "react";
import { DockLocation } from "../model/DockLocation";
import { BorderNode } from "../model/BorderNode";
import { TabNode } from "../model/TabNode";
import { TabGroupNode } from "../model/TabGroupNode";
import { BorderButton } from "./BorderButton";
import { GroupPill } from "./GroupPill";
import { GroupEndMarker } from "./GroupEndMarker";
import { LayoutController } from "./layout/LayoutInternal";
import { ITabSetRenderValues } from "./layout/LayoutTypes";
import { showOverflowMenu } from "./PopupMenu";
import { Actions } from "../model/Actions";
import { I18nLabel } from "./I18nLabel";
import { useTabOverflow } from "./TabOverflowHook";
import { TabScrollArea } from "./TabScrollArea";
import { Orientation } from "../model/Orientation";
import { CLASSES } from "../CSSClassNames";
import { isAuxMouseEvent, tabButtonPath } from "./Utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { LayoutTooltip } from "./LayoutTooltip";
import { tabsListVariants } from "../components/ui/tabs";
import { cn } from "../lib/utils";

const BORDER_LOCATION_CLASSES: Record<string, string> = {
    top: "flex-row items-center border-b border-b-[color:var(--fl-color-border-divider-line)]",
    bottom: "flex-row items-center border-t border-t-[color:var(--fl-color-border-divider-line)]",
    left: "flex-col content-center border-r border-r-[color:var(--fl-color-border-divider-line)]",
    right: "flex-col content-center border-l border-l-[color:var(--fl-color-border-divider-line)]",
};

const TOOLBAR_LOCATION_CLASSES: Record<string, string> = {
    top: "pl-[0.5em] pr-[0.3em]",
    bottom: "pl-[0.5em] pr-[0.3em]",
    left: "flex-col pt-[0.5em] pb-[0.3em]",
    right: "flex-col pt-[0.5em] pb-[0.3em]",
};

/** @internal */
export interface IBorderTabSetProps {
    borderNode: BorderNode;
    controller: LayoutController;
    size: number;
}

/** @internal */
export const BorderTabSet = (props: IBorderTabSetProps) => {
    const { borderNode, controller, size } = props;

    // Must define `selfRef` before it is used in `useLayoutEffect`
    const selfRef = React.useRef<HTMLDivElement>(null);
    const toolbarRef = React.useRef<HTMLDivElement>(null);
    const overflowbuttonRef = React.useRef<HTMLButtonElement>(null);
    const stickyButtonsRef = React.useRef<HTMLDivElement>(null);
    const tabStripInnerRef = React.useRef<HTMLDivElement>(null);
    const [overflowMenuOpen, setOverflowMenuOpen] = React.useState(false);
    const hideOverflowRef = React.useRef<(() => void) | null>(null);

    const icons = controller.getIcons();

    // cleanup: close overflow menu on unmount to prevent listener/portal leak
    React.useEffect(() => () => hideOverflowRef.current?.(), []);

    const scrollOrientation = Orientation.flip(borderNode.getOrientation());

    const { userControlledPositionRef, onScroll, hiddenTabs, onMouseWheel, isDockStickyButtons, isShowHiddenTabs } = useTabOverflow(
        controller,
        borderNode,
        scrollOrientation,
        tabStripInnerRef,
        selfRef,
        controller.getClassName(CLASSES.FLEXLAYOUT__BORDER_BUTTON),
        stickyButtonsRef,
    );

    // callback ref: fires on attach/detach including remounts, unlike an effect
    const setSelfRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            selfRef.current = element;
            controller.registerMeasurable(borderNode, "borderheader", element);
        },
        [controller, borderNode],
    );

    const onAuxMouseClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (isAuxMouseEvent(event)) {
            controller.auxMouseClick(borderNode, event);
        }
    };

    const onContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        controller.showContextMenu(borderNode, event);
    };

    const onInterceptPointerDown = (event: React.PointerEvent) => {
        event.stopPropagation();
    };

    const onOverflowClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        const callback = controller.getShowOverflowMenu();
        const tabs = borderNode.getTabNodes();
        const items = hiddenTabs.map((h) => {
            return { index: h, node: tabs[h] };
        });
        if (callback !== undefined) {
            callback(borderNode, event, items, onOverflowItemSelect);
        } else {
            const element = overflowbuttonRef.current!;
            setOverflowMenuOpen(true);
            hideOverflowRef.current = showOverflowMenu(element, borderNode, items, onOverflowItemSelect, controller, () => {
                setOverflowMenuOpen(false);
                hideOverflowRef.current = null;
            });
        }
        event.stopPropagation();
    };

    const onOverflowItemSelect = (item: { node: TabNode; index: number }) => {
        controller.doAction(Actions.selectTab(item.node.getId()));
        userControlledPositionRef.current = false;
    };

    const onPopoutWindow = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        const selectedTabNode = borderNode.getSelectedNode();
        if (selectedTabNode !== undefined) {
            controller.doAction(Actions.popoutTab(selectedTabNode.getId(), "window"));
        }
        event.stopPropagation();
    };

    const onPopoutFloat = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        const selectedTabNode = borderNode.getSelectedNode();
        if (selectedTabNode !== undefined) {
            controller.doAction(Actions.popoutTab(selectedTabNode.getId(), "float"));
        }
        event.stopPropagation();
    };

    const cm = controller.getClassName;

    const renderTabs = () => {
        const tabButtons: React.ReactNode[] = [];
        const isSplitPill = controller.getModel().getTabGroupType() === "splitpill";
        let flatIndex = 0;
        let hasPrev = false;
        let dividerKey = 0;
        const makeDivider = () => <div key={"divider" + dividerKey++} className={cn("w-[4px]", cm(CLASSES.FLEXLAYOUT__BORDER_TAB_DIVIDER))}></div>;
        const isLeftBorderUp = borderNode.getLocation() === DockLocation.LEFT && controller.getModel().getBorderLeftTabDirection() !== "down";
        for (const child of borderNode.getChildren()) {
            if (child instanceof TabGroupNode) {
                const groupTabs = child.getChildren() as TabNode[];
                if (isLeftBorderUp && child.isOpened()) {
                    // reversed: end marker first, tabs in reverse, pill last
                    if (hasPrev) {
                        tabButtons.push(makeDivider());
                    }
                    if (isSplitPill) {
                        tabButtons.push(<GroupEndMarker key={child.getId() + "/end"} controller={controller} groupNode={child} path={child.getPath() + "/end"} />);
                    }
                    const groupStartIndex = flatIndex;
                    for (let j = groupTabs.length - 1; j >= 0; j--) {
                        const isSelected = borderNode.getSelected() === groupStartIndex + j;
                        if (j < groupTabs.length - 1) {
                            tabButtons.push(makeDivider());
                        }
                        tabButtons.push(
                            <BorderButton
                                controller={controller}
                                border={borderNode.getLocation().getName()}
                                tabNode={groupTabs[j]}
                                path={tabButtonPath(groupTabs[j])}
                                key={groupTabs[j].getId()}
                                selected={isSelected}
                                icons={icons}
                            />,
                        );
                    }
                    flatIndex += groupTabs.length;
                    tabButtons.push(<GroupPill key={child.getId()} controller={controller} groupNode={child} path={child.getPath()} />);
                    hasPrev = true;
                } else {
                    if (hasPrev) {
                        tabButtons.push(makeDivider());
                    }
                    tabButtons.push(<GroupPill key={child.getId()} controller={controller} groupNode={child} path={child.getPath()} />);
                    hasPrev = true;
                    if (child.isOpened()) {
                        for (let j = 0; j < groupTabs.length; j++) {
                            const isSelected = borderNode.getSelected() === flatIndex;
                            if (j > 0) {
                                tabButtons.push(makeDivider());
                            }
                            tabButtons.push(
                                <BorderButton
                                    controller={controller}
                                    border={borderNode.getLocation().getName()}
                                    tabNode={groupTabs[j]}
                                    path={tabButtonPath(groupTabs[j])}
                                    key={groupTabs[j].getId()}
                                    selected={isSelected}
                                    icons={icons}
                                />,
                            );
                            flatIndex++;
                        }
                        if (isSplitPill) {
                            tabButtons.push(<GroupEndMarker key={child.getId() + "/end"} controller={controller} groupNode={child} path={child.getPath() + "/end"} />);
                        }
                    }
                }
                continue;
            }
            const tab = child as TabNode;
            const isSelected = borderNode.getSelected() === flatIndex;
            if (hasPrev) {
                tabButtons.push(makeDivider());
            }
            tabButtons.push(
                <BorderButton controller={controller} border={borderNode.getLocation().getName()} tabNode={tab} path={tabButtonPath(tab)} key={tab.getId()} selected={isSelected} icons={icons} />,
            );
            hasPrev = true;
            flatIndex++;
        }
        return tabButtons;
    };

    const renderButtons = () => {
        // allow customization of tabset
        let leading: React.ReactNode = undefined;
        let buttons: React.ReactNode[] = [];
        let stickyButtons: React.ReactNode[] = [];
        let stickyBar: React.ReactNode = undefined;
        const renderState: ITabSetRenderValues = { leading, buttons, stickyButtons: stickyButtons, overflowPosition: undefined };
        controller.customizeTabSet(borderNode, renderState);
        leading = renderState.leading;
        stickyButtons = renderState.stickyButtons;
        buttons = renderState.buttons;

        if (renderState.overflowPosition === undefined) {
            renderState.overflowPosition = stickyButtons.length;
        }

        // sticky bar outside tablist (tablist may only contain tab children)
        if (stickyButtons.length > 0) {
            if (isDockStickyButtons) {
                buttons = [...stickyButtons, ...buttons];
            } else {
                stickyBar = (
                    <div
                        ref={stickyButtonsRef}
                        key="sticky_buttons_container"
                        onPointerDown={onInterceptPointerDown}
                        onDragStart={(e) => {
                            e.preventDefault();
                        }}
                        className={cn("flex items-center gap-[0.3em] pl-[5px]", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_STICKY_BUTTONS_CONTAINER))}
                    >
                        {stickyButtons}
                    </div>
                );
            }
        }

        if (isShowHiddenTabs) {
            const overflowTitle = controller.i18nName(I18nLabel.Overflow_Menu_Tooltip);
            let overflowContent;
            if (typeof icons.more === "function") {
                const tabs = borderNode.getTabNodes();
                const items = hiddenTabs.map((h) => {
                    return { index: h, node: tabs[h] };
                });

                overflowContent = icons.more(borderNode, items);
            } else {
                overflowContent = (
                    <>
                        {icons.more}
                        <Badge variant="secondary" className={cn("h-4 px-1 text-[10px]", cm(CLASSES.FLEXLAYOUT__TAB_BUTTON_OVERFLOW_COUNT))}>
                            {hiddenTabs.length > 0 ? hiddenTabs.length : ""}
                        </Badge>
                    </>
                );
            }
            buttons.splice(
                Math.min(renderState.overflowPosition, buttons.length),
                0,
                // explicit tabindex: Safari skips native buttons in tab order
                <LayoutTooltip key="overflowbutton" label={overflowTitle}>
                    <Button
                        tabIndex={0}
                        aria-haspopup="menu"
                        aria-expanded={overflowMenuOpen}
                        aria-label={overflowTitle}
                        ref={overflowbuttonRef}
                        variant="ghost"
                        size="icon-xs"
                        className={cn(
                            "size-5 text-[var(--fl-color-overflow)]",
                            cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON),
                            cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON_OVERFLOW),
                            cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON_OVERFLOW_ + borderNode.getLocation().getName()),
                        )}
                        onClick={onOverflowClick}
                        onPointerDown={onInterceptPointerDown}
                    >
                        {overflowContent}
                    </Button>
                </LayoutTooltip>,
            );
        }

        const selectedIndex = borderNode.getSelected();
        if (selectedIndex !== -1) {
            const selectedTabNode = borderNode.getSelectedNode();

            if (selectedTabNode !== undefined && controller.isMainLayout()) {
                if (selectedTabNode.isEnableFloat() && selectedTabNode.isEnableFloatIcon()) {
                    const popoutFloatTitle = controller.i18nName(I18nLabel.Popout_Tab_Float);
                    buttons.push(
                        <LayoutTooltip key="popout-float" label={popoutFloatTitle}>
                            <Button
                                tabIndex={0}
                                aria-label={popoutFloatTitle}
                                variant="ghost"
                                size="icon-xs"
                                className={cn("size-5", cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON_FLOAT))}
                                onClick={onPopoutFloat}
                                onPointerDown={onInterceptPointerDown}
                            >
                                {typeof icons.popoutFloat === "function" ? icons.popoutFloat(selectedTabNode) : icons.popoutFloat}
                            </Button>
                        </LayoutTooltip>,
                    );
                }

                if (controller.isSupportsPopout() && selectedTabNode.isEnablePopoutIcon() && selectedTabNode.isAllowedInWindow()) {
                    const popoutTitle = controller.i18nName(I18nLabel.Popout_Tab);
                    buttons.push(
                        <LayoutTooltip key="popout" label={popoutTitle}>
                            <Button
                                tabIndex={0}
                                aria-label={popoutTitle}
                                variant="ghost"
                                size="icon-xs"
                                className={cn("size-5", cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_BUTTON_FLOAT))}
                                onClick={onPopoutWindow}
                                onPointerDown={onInterceptPointerDown}
                            >
                                {typeof icons.popout === "function" ? icons.popout(selectedTabNode) : icons.popout}
                            </Button>
                        </LayoutTooltip>,
                    );
                }
            }
        }
        const toolbar = (
            <div
                key="toolbar"
                ref={toolbarRef}
                className={cn(
                    "flex items-center gap-[0.3em]",
                    TOOLBAR_LOCATION_CLASSES[borderNode.getLocation().getName()],
                    cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR),
                    cm(CLASSES.FLEXLAYOUT__BORDER_TOOLBAR_ + borderNode.getLocation().getName()),
                )}
            >
                {buttons}
            </div>
        );

        return { leading, toolbar, stickyBar };
    };

    const tabButtons = renderTabs();
    const { leading, toolbar, stickyBar } = renderButtons();

    const borderClasses = cn(
        "box-border flex overflow-hidden [font-family:var(--fl-font-family)] [font-size:var(--fl-font-size)] [font-weight:var(--fl-font-weight)] bg-[var(--fl-color-border-background)] text-[var(--fl-color-border)]",
        BORDER_LOCATION_CLASSES[borderNode.getLocation().getName()],
        cm(CLASSES.FLEXLAYOUT__BORDER),
        cm(CLASSES.FLEXLAYOUT__BORDER_ + borderNode.getLocation().getName()),
        borderNode.getClassName(),
    );

    let innerStyle: React.CSSProperties;
    let outerStyle: React.CSSProperties;
    const borderHeight = size - 1;
    if (borderNode.getLocation() === DockLocation.LEFT) {
        // left border tabs read up by default, or down (like the right border) via global.borderLeftTabDirection
        const tabsReadDown = controller.getModel().getBorderLeftTabDirection() === "down";
        innerStyle = tabsReadDown ? { left: "100%", top: 0 } : { right: "100%", top: 0 };
        outerStyle = { width: borderHeight, overflowY: "auto" };
    } else if (borderNode.getLocation() === DockLocation.RIGHT) {
        innerStyle = { left: "100%", top: 0 };
        outerStyle = { width: borderHeight, overflowY: "auto" };
    } else {
        innerStyle = { left: 0 };
        outerStyle = { height: borderHeight, overflowX: "auto" };
    }

    let leadingContainer: React.ReactNode = undefined;
    if (leading) {
        leadingContainer = <div className={cn("flex", cm(CLASSES.FLEXLAYOUT__BORDER_LEADING))}>{leading}</div>;
    }

    // side borders lay their tabs out in a row and rotate the whole container
    const location = borderNode.getLocation();
    const leftDown = location === DockLocation.LEFT && controller.getModel().getBorderLeftTabDirection() === "down";
    const tabContainerClassName = cn(
        tabsListVariants({ orientation: "horizontal" }),
        "absolute box-border items-center px-[2px] whitespace-nowrap",
        location === DockLocation.RIGHT || leftDown ? "origin-top-left rotate-90" : undefined,
        location === DockLocation.LEFT && !leftDown ? "-rotate-90 origin-top-right flex-row-reverse" : undefined,
        cm(CLASSES.FLEXLAYOUT__BORDER_INNER_TAB_CONTAINER),
        cm(CLASSES.FLEXLAYOUT__BORDER_INNER_TAB_CONTAINER_ + location.getName()),
        leftDown ? cm(CLASSES.FLEXLAYOUT__BORDER_INNER_TAB_CONTAINER_LEFT_DOWN) : undefined,
    );

    return (
        <div
            ref={setSelfRef}
            className={borderClasses}
            data-layout-path={borderNode.getPath()}
            onClick={onAuxMouseClick}
            onAuxClick={onAuxMouseClick}
            onContextMenu={onContextMenu}
            onWheel={onMouseWheel}
        >
            {leadingContainer}
            <TabScrollArea
                className={cm(CLASSES.FLEXLAYOUT__MINI_SCROLLBAR_CONTAINER)}
                viewportClassName={cn(
                    "relative box-border flex grow items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    cm(CLASSES.FLEXLAYOUT__BORDER_INNER),
                    cm(CLASSES.FLEXLAYOUT__BORDER_INNER_ + borderNode.getLocation().getName()),
                )}
                viewportStyle={outerStyle}
                viewportRef={tabStripInnerRef}
                onScroll={onScroll}
                orientation={scrollOrientation === Orientation.HORZ ? "horizontal" : "vertical"}
                showScrollbar={borderNode.isEnableTabScrollbar()}
                classNameMapper={cm}
            >
                <div
                    style={innerStyle}
                    // drop tablist role during rename
                    role={controller.getEditingTab()?.getParent() === borderNode ? undefined : "tablist"}
                    aria-orientation={
                        controller.getEditingTab()?.getParent() !== borderNode && (borderNode.getLocation() === DockLocation.LEFT || borderNode.getLocation() === DockLocation.RIGHT)
                            ? "vertical"
                            : undefined
                    }
                    className={tabContainerClassName}
                >
                    {tabButtons}
                </div>
                {stickyBar}
            </TabScrollArea>
            {toolbar}
        </div>
    );
};

BorderTabSet.displayName = "BorderTabSet"; // name in react dev tools

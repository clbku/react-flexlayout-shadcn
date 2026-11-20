import * as React from "react";
import { I18nLabel } from "./I18nLabel";
import { Actions } from "../model/Actions";
import { TabNode } from "../model/TabNode";
import { TabSetNode } from "../model/TabSetNode";
import { TabGroupNode } from "../model/TabGroupNode";
import { GroupPill } from "./GroupPill";
import { GroupEndMarker } from "./GroupEndMarker";
import { showOverflowMenu } from "./PopupMenu";
import { ITabSetRenderValues } from "./layout/LayoutTypes";
import { LayoutController } from "./layout/LayoutInternal";
import { TabButton } from "./TabButton";
import { useTabOverflow } from "./TabOverflowHook";
import { TabScrollArea } from "./TabScrollArea";
import { Orientation } from "../model/Orientation";
import { CLASSES } from "../CSSClassNames";
import { isAuxMouseEvent, tabButtonPath, toAriaKeyShortcuts } from "./Utils";
import { createPortal } from "react-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { LayoutTooltip } from "./LayoutTooltip";
import { tabsListVariants } from "../components/ui/tabs";
import { cn } from "../lib/utils";

/** @internal */
export interface ITabSetProps {
    controller: LayoutController;
    tabsetNode: TabSetNode;
}

const TABBAR_LOCATION_CLASSES: Record<string, string> = {
    top: "px-[2px] py-1 border-b border-b-[color:var(--fl-color-tabset-divider-line)]",
    bottom: "px-[2px] py-1 border-t border-t-[color:var(--fl-color-tabset-divider-line)]",
};

const TAB_CONTAINER_LOCATION_CLASSES: Record<string, string> = {
    top: "border-t-2 border-t-transparent",
    bottom: "border-b-2 border-b-transparent",
};

/** @internal */
export const TabSet = (props: ITabSetProps) => {
    const { tabsetNode, controller } = props;

    // Must define `selfRef` before it is used in `useLayoutEffect`
    const selfRef = React.useRef<HTMLDivElement>(null);
    const tabStripRef = React.useRef<HTMLDivElement>(null);
    const tabStripInnerRef = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const buttonBarRef = React.useRef<HTMLDivElement>(null);
    const overflowbuttonRef = React.useRef<HTMLButtonElement>(null);
    const stickyButtonsRef = React.useRef<HTMLDivElement>(null);
    const [overflowMenuOpen, setOverflowMenuOpen] = React.useState(false);
    const hideOverflowRef = React.useRef<(() => void) | null>(null);

    const icons = controller.getIcons();

    // cleanup: close overflow menu on unmount to prevent listener/portal leak
    React.useEffect(() => () => hideOverflowRef.current?.(), []);

    // must be after useEffect so the node rect is already set
    const { userControlledPositionRef, onScroll, hiddenTabs, onMouseWheel, isDockStickyButtons, isShowHiddenTabs } = useTabOverflow(
        controller,
        tabsetNode,
        Orientation.HORZ,
        tabStripInnerRef,
        tabStripRef,
        controller.getClassName(CLASSES.FLEXLAYOUT__TAB_BUTTON),
        stickyButtonsRef,
    );

    // callback refs: fire on attach/detach including remounts, unlike effects
    const setSelfRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            selfRef.current = element;
            controller.registerMeasurable(tabsetNode, "tabset", element);
        },
        [controller, tabsetNode],
    );
    const setTabStripRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            tabStripRef.current = element;
            controller.registerMeasurable(tabsetNode, "tabstrip", element);
        },
        [controller, tabsetNode],
    );
    const setContentRef = React.useCallback(
        (element: HTMLDivElement | null) => {
            contentRef.current = element;
            controller.registerMeasurable(tabsetNode, "tabsetcontent", element);
        },
        [controller, tabsetNode],
    );

    const onOverflowClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        const callback = controller.getShowOverflowMenu();
        const tabs = tabsetNode.getTabNodes();
        const items = hiddenTabs.map((h) => {
            return { index: h, node: tabs[h] };
        });
        if (callback !== undefined) {
            callback(tabsetNode, event, items, onOverflowItemSelect);
        } else {
            const element = overflowbuttonRef.current!;
            setOverflowMenuOpen(true);
            hideOverflowRef.current = showOverflowMenu(element, tabsetNode, items, onOverflowItemSelect, controller, () => {
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

    const onDragStart = (event: React.DragEvent<HTMLElement>) => {
        if (!controller.getEditingTab()) {
            if (tabsetNode.isEnableDrag()) {
                event.stopPropagation();
                controller.getDragDropManager().setDragNode(event.nativeEvent, tabsetNode as TabSetNode);
            } else {
                event.preventDefault();
            }
        } else {
            event.preventDefault();
        }
    };

    const onDragEnd = (_event: React.DragEvent<HTMLElement>) => {
        controller.getDragDropManager().onDragEnded();
    };

    const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
        if (!isAuxMouseEvent(event) && !tabsetNode.isActive()) {
            controller.doAction(Actions.setActiveTabset(tabsetNode.getId(), controller.getLayoutId()));
        }
    };

    const onAuxMouseClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (isAuxMouseEvent(event)) {
            controller.auxMouseClick(tabsetNode, event);
        }
    };

    const onContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        controller.showContextMenu(tabsetNode, event);
    };

    const onInterceptPointerDown = (event: React.PointerEvent) => {
        event.stopPropagation();
    };

    const onMaximizeToggle = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (tabsetNode.canMaximize()) {
            controller.maximize(tabsetNode);
        }
        event.stopPropagation();
    };

    const onClose = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        controller.doAction(Actions.deleteTabset(tabsetNode.getId()));
        event.stopPropagation();
    };

    const onCloseTab = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        controller.doAction(Actions.deleteTab(tabsetNode.getChildren()[0].getId()));
        event.stopPropagation();
    };

    const onPopoutWindow = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (selectedTabNode !== undefined) {
            controller.doAction(Actions.popoutTab(selectedTabNode.getId(), "window"));
        }
        event.stopPropagation();
    };

    const onPopoutFloat = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (selectedTabNode !== undefined) {
            controller.doAction(Actions.popoutTab(selectedTabNode.getId(), "float"));
        }
        event.stopPropagation();
    };

    const onDoubleClick = (_event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        if (tabsetNode.canMaximize()) {
            controller.maximize(tabsetNode);
        }
    };

    // Start Render

    const cm = controller.getClassName;
    const selectedTabNode = tabsetNode.getSelectedNode() as TabNode | undefined;
    const path = tabsetNode.getPath();
    const children = tabsetNode.getChildren();
    const isSingleTabStretched = tabsetNode.isEnableSingleTabStretch() && children.length === 1 && children[0] instanceof TabNode;

    const makeSpacer = (key: number, isSelected: boolean, lastOneSelected: boolean, showDivider: boolean) => {
        let cns = cm(CLASSES.FLEXLAYOUT__TABSET_TAB_SPACER);
        if (showDivider) {
            cns = cn(cns, "w-[4px]", cm(CLASSES.FLEXLAYOUT__TABSET_TAB_DIVIDER));
        }
        if (!tabsetNode.isEnableTabWrap() && !isSingleTabStretched) {
            if (isSelected) {
                cns = cn(cns, cm(CLASSES.FLEXLAYOUT__TABSET_TAB_DIVIDER_SELECTED_BEFORE));
            } else if (lastOneSelected) {
                cns = cn(cns, cm(CLASSES.FLEXLAYOUT__TABSET_TAB_DIVIDER_SELECTED_AFTER));
            }
        }
        return (
            <div key={"divider" + key} className={cns}>
                <div className={cm(CLASSES.FLEXLAYOUT__TABSET_TAB_DIVIDER_INNER)}></div>
            </div>
        );
    };

    const renderTabs = () => {
        const tabs = [];
        const isSplitPill = controller.getModel().getTabGroupType() === "splitpill";
        let flatIndex = 0;
        let spacerKey = 0;
        let lastOneSelected = false;
        let lastWasTab = false;
        let hasPrev = false;
        if (tabsetNode.isEnableTabStrip()) {
            for (const child of children) {
                if (child instanceof TabGroupNode) {
                    // a divider spacer before the pill, like before any other tab
                    tabs.push(makeSpacer(spacerKey++, false, lastOneSelected, hasPrev));
                    tabs.push(<GroupPill key={child.getId()} controller={controller} groupNode={child} path={child.getPath()} />);
                    hasPrev = true;
                    lastWasTab = false;
                    if (child.isOpened()) {
                        const groupTabs = child.getChildren() as TabNode[];
                        for (let j = 0; j < groupTabs.length; j++) {
                            const groupTab = groupTabs[j];
                            const isSelected = tabsetNode.getSelected() === flatIndex;
                            // the pill leads its own tabs, so only later group tabs get a divider
                            tabs.push(makeSpacer(spacerKey++, isSelected, lastOneSelected, j > 0));
                            tabs.push(<TabButton controller={controller} tabNode={groupTab} path={tabButtonPath(groupTab)} key={groupTab.getId()} selected={isSelected} />);
                            lastOneSelected = isSelected;
                            lastWasTab = true;
                            hasPrev = true;
                            flatIndex++;
                        }
                        // end marker closes the split pill (right cap, no behaviour)
                        if (isSplitPill) {
                            tabs.push(makeSpacer(spacerKey++, false, lastOneSelected, false));
                            tabs.push(<GroupEndMarker key={child.getId() + "/end"} controller={controller} groupNode={child} path={child.getPath() + "/end"} />);
                            lastOneSelected = false; // end marker is not a tab; don't propagate selection to next divider
                        }
                    }
                    continue;
                }
                const tab = child as TabNode;
                const isSelected = tabsetNode.getSelected() === flatIndex;
                tabs.push(makeSpacer(spacerKey++, isSelected, lastOneSelected, hasPrev));
                tabs.push(<TabButton controller={controller} tabNode={tab} path={tabButtonPath(tab)} key={tab.getId()} selected={isSelected} />);
                lastOneSelected = isSelected;
                lastWasTab = true;
                hasPrev = true;
                flatIndex++;
            }
            if (lastWasTab) {
                let cns = cm(CLASSES.FLEXLAYOUT__TABSET_TAB_SPACER);
                if (!tabsetNode.isEnableTabWrap() && !isSingleTabStretched && lastOneSelected) {
                    cns = cn(cns, cm(CLASSES.FLEXLAYOUT__TABSET_TAB_DIVIDER_SELECTED_AFTER));
                }
                tabs.push(
                    <div key={"divider" + spacerKey} className={cns}>
                        <div className={cm(CLASSES.FLEXLAYOUT__TABSET_TAB_DIVIDER_INNER)}></div>
                    </div>,
                );
            }
        }
        return tabs;
    };

    const renderButtons = () => {
        let leading: React.ReactNode = undefined;
        let stickyButtons: React.ReactNode[] = [];
        let buttons: React.ReactNode[] = [];

        // allow customization of header contents and buttons
        const renderState: ITabSetRenderValues = { leading, stickyButtons, buttons, overflowPosition: undefined };
        controller.customizeTabSet(tabsetNode, renderState);
        leading = renderState.leading;
        stickyButtons = renderState.stickyButtons;
        buttons = renderState.buttons;

        const isTabStretch = isSingleTabStretched;
        let showClose = (isTabStretch && (tabsetNode.getChildren()[0] as TabNode).isCloseable()) || tabsetNode.isCloseable();
        showClose = showClose && tabsetNode.isEnableCloseButton();

        if (renderState.overflowPosition === undefined) {
            renderState.overflowPosition = stickyButtons.length;
        }

        // sticky bar outside tablist (tablist may only contain tab children)
        let stickyBar: React.ReactNode = undefined;
        if (stickyButtons.length > 0) {
            if (!tabsetNode.isEnableTabWrap() && (isDockStickyButtons || isTabStretch)) {
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

        if (!tabsetNode.isEnableTabWrap()) {
            if (isShowHiddenTabs) {
                const overflowTitle = controller.i18nName(I18nLabel.Overflow_Menu_Tooltip);
                let overflowContent;
                if (typeof icons.more === "function") {
                    const tabs = tabsetNode.getTabNodes();
                    const items = hiddenTabs.map((h) => {
                        return { index: h, node: tabs[h] };
                    });
                    overflowContent = icons.more(tabsetNode, items);
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
                            data-layout-path={path + "/button/overflow"}
                            aria-haspopup="menu"
                            aria-expanded={overflowMenuOpen}
                            aria-label={overflowTitle}
                            ref={overflowbuttonRef}
                            variant="ghost"
                            size="icon-xs"
                            className={cn("size-5 w-[2em] text-[var(--fl-color-overflow)]", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__TAB_BUTTON_OVERFLOW))}
                            onClick={onOverflowClick}
                            onPointerDown={onInterceptPointerDown}
                        >
                            {overflowContent}
                        </Button>
                    </LayoutTooltip>,
                );
            }
        }

        if (selectedTabNode !== undefined && !selectedTabNode.isPinned()) {
            if (selectedTabNode.isEnableFloat() && selectedTabNode.isEnableFloatIcon()) {
                const popoutFloatTitle = controller.i18nName(I18nLabel.Popout_Tab_Float);
                buttons.push(
                    <LayoutTooltip key="popout-float" label={popoutFloatTitle}>
                        <Button
                            tabIndex={0}
                            data-layout-path={path + "/button/popout-float"}
                            aria-label={popoutFloatTitle}
                            variant="ghost"
                            size="icon-xs"
                            className={cn("size-5", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON_FLOAT))}
                            onClick={onPopoutFloat}
                            onPointerDown={onInterceptPointerDown}
                        >
                            {typeof icons.popoutFloat === "function" ? icons.popoutFloat(selectedTabNode) : icons.popoutFloat}
                        </Button>
                    </LayoutTooltip>,
                );
            }

            if (controller.isSupportsPopout() && selectedTabNode.isAllowedInWindow() && selectedTabNode.isEnablePopoutIcon()) {
                const popoutTitle = controller.i18nName(I18nLabel.Popout_Tab);
                buttons.push(
                    <LayoutTooltip key="popout" label={popoutTitle}>
                        <Button
                            tabIndex={0}
                            data-layout-path={path + "/button/popout"}
                            aria-label={popoutTitle}
                            variant="ghost"
                            size="icon-xs"
                            className={cn("size-5", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON_FLOAT))}
                            onClick={onPopoutWindow}
                            onPointerDown={onInterceptPointerDown}
                        >
                            {typeof icons.popout === "function" ? icons.popout(selectedTabNode) : icons.popout}
                        </Button>
                    </LayoutTooltip>,
                );
            }
        }

        if (tabsetNode.canMaximize()) {
            const minTitle = controller.i18nName(I18nLabel.Restore);
            const maxTitle = controller.i18nName(I18nLabel.Maximize);
            const title = tabsetNode.isMaximized() ? minTitle : maxTitle;
            buttons.push(
                <LayoutTooltip key="max" label={title}>
                    <Button
                        tabIndex={0}
                        data-layout-path={path + "/button/max"}
                        aria-label={title}
                        aria-pressed={tabsetNode.isMaximized()}
                        variant="ghost"
                        size="icon-xs"
                        className={cn("size-5", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON_ + (tabsetNode.isMaximized() ? "max" : "min")))}
                        onClick={onMaximizeToggle}
                        onPointerDown={onInterceptPointerDown}
                    >
                        {tabsetNode.isMaximized()
                            ? typeof icons.restore === "function"
                                ? icons.restore(tabsetNode)
                                : icons.restore
                            : typeof icons.maximize === "function"
                              ? icons.maximize(tabsetNode)
                              : icons.maximize}
                    </Button>
                </LayoutTooltip>,
            );
        }

        if (!tabsetNode.isMaximized() && showClose) {
            const title = isTabStretch ? controller.i18nName(I18nLabel.Close_Tab) : controller.i18nName(I18nLabel.Close_Tabset);
            buttons.push(
                <LayoutTooltip key="close" label={title}>
                    <Button
                        tabIndex={0}
                        data-layout-path={path + "/button/close"}
                        aria-label={title}
                        variant="ghost"
                        size="icon-xs"
                        className={cn("size-5", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON), cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_BUTTON_CLOSE))}
                        onClick={isTabStretch ? onCloseTab : onClose}
                        onPointerDown={onInterceptPointerDown}
                    >
                        {typeof icons.closeTabset === "function" ? icons.closeTabset(tabsetNode) : icons.closeTabset}
                    </Button>
                </LayoutTooltip>,
            );
        }

        if (tabsetNode.isActive() && tabsetNode.isEnableActiveIcon()) {
            const title = controller.i18nName(I18nLabel.Active_Tabset);
            buttons.push(
                <div
                    key="active"
                    data-layout-path={path + "/button/active"}
                    title={title}
                    aria-hidden="true"
                    className={cn(
                        "m-0 border-0 bg-transparent p-px outline-none [font-size:inherit]",
                        cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR_ICON),
                    )}
                >
                    {typeof icons.activeTabset === "function" ? icons.activeTabset(tabsetNode) : icons.activeTabset}
                </div>,
            );
        }

        const buttonbar = (
            <div
                key="buttonbar"
                ref={buttonBarRef}
                className={cn("flex items-center gap-[0.3em] pl-[0.5em] pr-[0.3em]", cm(CLASSES.FLEXLAYOUT__TAB_TOOLBAR))}
                onPointerDown={onInterceptPointerDown}
                onDragStart={(e) => {
                    e.preventDefault();
                }}
            >
                {buttons}
            </div>
        );

        return { leading, buttonbar, stickyBar };
    };

    const renderTabBar = (tabs: React.ReactNode[], leading: React.ReactNode, buttonbar: React.ReactNode, stickyBar: React.ReactNode) => {
        let tabStrip;

        // tabset cycling shortcuts on the tablist
        const keyMap = controller.getKeyMap();
        const tablistKeyshortcuts = [toAriaKeyShortcuts(keyMap.focusNextTabset), toAriaKeyShortcuts(keyMap.focusPreviousTabset)].filter(Boolean).join(" ") || undefined;

        // drop tablist role during rename
        const editingHere = controller.getEditingTab()?.getParent() === tabsetNode;
        const tablistRole = editingHere ? undefined : "tablist";

        const isTabStretch = isSingleTabStretched;
        const stretchClassName = isTabStretch ? (tabsetNode.getChildren()[0] as TabNode).getTabSetClassName() : undefined;

        const tabStripClasses = cn(
            "box-border flex min-h-[1.5em] items-center overflow-hidden bg-[var(--fl-color-tabset-background)] [font-size:var(--fl-font-size)] [font-weight:var(--fl-font-weight)]",
            TABBAR_LOCATION_CLASSES[tabsetNode.getTabLocation()],
            cm(CLASSES.FLEXLAYOUT__TABSET_TABBAR_OUTER),
            cm(CLASSES.FLEXLAYOUT__TABSET_TABBAR_OUTER_ + tabsetNode.getTabLocation()),
            tabsetNode.getClassNameTabStrip(),
            tabsetNode.isActive() && [cm(CLASSES.FLEXLAYOUT__TABSET_SELECTED), "bg-[var(--fl-color-tabset-background-selected)]"],
            tabsetNode.isMaximized() && [cm(CLASSES.FLEXLAYOUT__TABSET_MAXIMIZED), "bg-[var(--fl-color-tabset-background-maximized)]"],
            stretchClassName,
        );

        let leadingContainer: React.ReactNode = undefined;
        if (leading) {
            leadingContainer = <div className={cn("flex", cm(CLASSES.FLEXLAYOUT__TABSET_LEADING))}>{leading}</div>;
        }

        if (tabsetNode.isEnableTabWrap()) {
            if (tabsetNode.isEnableTabStrip()) {
                tabStrip = (
                    <div
                        className={cn(tabStripClasses, "mt-[2px] flex-wrap gap-px")}
                        ref={setTabStripRef}
                        data-layout-path={path + "/tabstrip"}
                        onPointerDown={onPointerDown}
                        onDoubleClick={onDoubleClick}
                        onContextMenu={onContextMenu}
                        onClick={onAuxMouseClick}
                        onAuxClick={onAuxMouseClick}
                        draggable={true}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                    >
                        {leadingContainer}
                        {/* display: contents so the tabs keep wrapping in the strip's flex flow;
                            the tablist element may only contain the tabs, not the toolbar buttons */}
                        <div
                            role={tablistRole}
                            aria-orientation={editingHere ? undefined : "horizontal"}
                            aria-label={editingHere ? undefined : tabsetNode.getName()}
                            aria-keyshortcuts={editingHere ? undefined : tablistKeyshortcuts}
                            className="contents"
                        >
                            {tabs}
                        </div>
                        {stickyBar}
                        <div className="flex grow justify-end">{buttonbar}</div>
                    </div>
                );
            }
        } else {
            if (tabsetNode.isEnableTabStrip()) {
                tabStrip = (
                    <div
                        className={tabStripClasses}
                        ref={setTabStripRef}
                        data-layout-path={path + "/tabstrip"}
                        onPointerDown={onPointerDown}
                        onDoubleClick={onDoubleClick}
                        onContextMenu={onContextMenu}
                        onClick={onAuxMouseClick}
                        onAuxClick={onAuxMouseClick}
                        draggable={true}
                        onWheel={onMouseWheel}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                    >
                        {leadingContainer}
                        <TabScrollArea
                            className={cm(CLASSES.FLEXLAYOUT__MINI_SCROLLBAR_CONTAINER)}
                            viewportClassName={cn(
                                "relative box-border flex grow [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                                cm(CLASSES.FLEXLAYOUT__TABSET_TABBAR_INNER),
                                cm(CLASSES.FLEXLAYOUT__TABSET_TABBAR_INNER_ + tabsetNode.getTabLocation()),
                            )}
                            viewportRef={tabStripInnerRef}
                            onScroll={onScroll}
                            orientation="horizontal"
                            showScrollbar={tabsetNode.isEnableTabScrollbar()}
                            classNameMapper={cm}
                        >
                            <div
                                style={{ width: isTabStretch ? "100%" : "none" }}
                                role={tablistRole}
                                aria-orientation={editingHere ? undefined : "horizontal"}
                                aria-label={editingHere ? undefined : tabsetNode.getName()}
                                aria-keyshortcuts={editingHere ? undefined : tablistKeyshortcuts}
                                className={cn(
                                    tabsListVariants({ orientation: "horizontal" }),
                                    "relative box-border items-center px-[4px] whitespace-nowrap",
                                    TAB_CONTAINER_LOCATION_CLASSES[tabsetNode.getTabLocation()],
                                    cm(CLASSES.FLEXLAYOUT__TABSET_TABBAR_INNER_TAB_CONTAINER),
                                    cm(CLASSES.FLEXLAYOUT__TABSET_TABBAR_INNER_TAB_CONTAINER_ + tabsetNode.getTabLocation()),
                                )}
                            >
                                {tabs}
                            </div>
                            {stickyBar}
                        </TabScrollArea>
                        {buttonbar}
                    </div>
                );
            }
        }
        return tabStrip;
    };

    const renderContent = (tabStrip: React.ReactNode) => {
        let emptyTabset: React.ReactNode;
        if (tabsetNode.getTabNodes().length === 0) {
            const placeHolderCallback = controller.getTabSetPlaceHolderCallback();
            if (placeHolderCallback) {
                emptyTabset = placeHolderCallback(tabsetNode);
            }
        }

        let content = (
            <div ref={setContentRef} className={cn("relative box-border flex grow basis-0 min-h-0 min-w-0", cm(CLASSES.FLEXLAYOUT__TABSET_CONTENT))}>
                {emptyTabset}
            </div>
        );

        if (tabsetNode.getTabLocation() === "top") {
            content = (
                <>
                    {tabStrip}
                    {content}
                </>
            );
        } else {
            content = (
                <>
                    {content}
                    {tabStrip}
                </>
            );
        }
        return content;
    };

    const tabs = renderTabs();
    const { leading, buttonbar, stickyBar } = renderButtons();
    const tabStrip = renderTabBar(tabs, leading, buttonbar, stickyBar);
    const content = renderContent(tabStrip);

    const style: React.CSSProperties = {
        flexGrow: Math.max(1, tabsetNode.getWeight() * 1000),
        minWidth: tabsetNode.getMinWidth(),
        minHeight: tabsetNode.getMinHeight(),
        maxWidth: tabsetNode.getMaxWidth(),
        maxHeight: tabsetNode.getMaxHeight(),
    };

    if (tabsetNode.getModel().getMaximizedTabset(controller.getLayoutId()) !== undefined && !tabsetNode.isMaximized()) {
        style.display = "none";
    }

    // outer container for flex sizing; inner for border/padding/margin styling
    const tabset = (
        <div ref={setSelfRef} className={cn("flex basis-0 grow flex-col overflow-hidden min-h-0 min-w-0", cm(CLASSES.FLEXLAYOUT__TABSET_CONTAINER))} style={style}>
            <div
                className={cn(
                    "relative box-border flex grow flex-col overflow-hidden bg-[var(--fl-color-tabset-background)] [font-family:var(--fl-font-family)]",
                    cm(CLASSES.FLEXLAYOUT__TABSET),
                )}
                data-layout-path={path}
            >
                {content}
            </div>
        </div>
    );

    if (tabsetNode.isMaximized()) {
        if (controller.getMainElement()) {
            return createPortal(<div className="absolute inset-0 flex">{tabset}</div>, controller.getMainElement()!);
        } else {
            return tabset;
        }
    } else {
        return tabset;
    }
};

TabSet.displayName = "TabSet"; // name in react dev tools

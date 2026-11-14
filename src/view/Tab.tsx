import * as React from "react";
import { TabNode } from "../model/TabNode";
import { TabSetNode } from "../model/TabSetNode";
import { CLASSES } from "../CSSClassNames";
import { LayoutController } from "./layout/LayoutInternal";
import { BorderNode } from "../model/BorderNode";
import { Actions } from "../model/Actions";
import { domId, matchesKey, toAriaKeyShortcuts } from "./Utils";
import { TabScrollArea } from "./TabScrollArea";
import { cn } from "../lib/utils";

/** @internal */
export interface ITabProps {
    controller: LayoutController;
    tabNode: TabNode;
    selected: boolean;
}

/** @internal */
export const Tab = (props: ITabProps) => {
    const { controller, selected, tabNode } = props;
    const selfRef = React.useRef<HTMLDivElement>(null);
    const contentViewportRef = React.useRef<HTMLDivElement>(null);
    const firstSelect = React.useRef<boolean>(true);

    const onPointerDown = React.useCallback(() => {
        const parent = tabNode.getParent()!; // cannot use parentNode here since will be out of date
        if (parent instanceof TabSetNode) {
            if (!parent.isActive()) {
                controller.doAction(Actions.setActiveTabset(parent.getId(), controller.getLayoutId()));
            }
        }
    }, [tabNode, controller]);

    const parentNode = tabNode.getParent() as TabSetNode | BorderNode;
    const focusToggleKey = controller.getKeyMap().focusTabToggle;

    // the configured key (pressed anywhere within the tab content) returns focus to the tab button
    const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (matchesKey(event, focusToggleKey)) {
            const button = event.currentTarget.ownerDocument.getElementById(domId("flexlayout-tabbutton-", tabNode.getId()));
            if (button) {
                button.focus();
                event.preventDefault();
                event.stopPropagation();
            }
        }
    };

    React.useLayoutEffect(() => {
        const viewport = contentViewportRef.current!;
        const element = tabNode.getMoveableElement();
        // the element may still belong to a closed popout window's document; adopt it so its
        // subtree is laid out and observed by the live document
        const currentDocument = viewport.ownerDocument;
        const adopted = element.ownerDocument !== currentDocument;
        if (adopted) {
            currentDocument.adoptNode(element);
        }
        if (element.parentElement !== viewport) {
            viewport.appendChild(element);
        }
        if (adopted) {
            // full redraw so document-scoped observers (nested <Layout>/sublayout ResizeObservers)
            // rebind and re-measure; a light redraw would not reach component-tab content
            controller.redrawLayoutAndTabContent();
        }

        // the shadcn ScrollArea viewport is the content scroll element (the moveable element is
        // only the content wrapper inside it now)
        tabNode.setScrollElement(viewport);

        // keep scroll position
        const handleScroll = () => {
            tabNode.saveScrollPosition();
        };
        viewport.addEventListener("scroll", handleScroll);

        // listen for clicks to change active tabset
        const self = selfRef.current;
        if (self) {
            self.addEventListener("pointerdown", onPointerDown);
        }

        return () => {
            if (self) {
                self.removeEventListener("pointerdown", onPointerDown);
            }
            tabNode.saveScrollPosition();
            tabNode.setScrollElement(null);
            viewport.removeEventListener("scroll", handleScroll);

            // when the effect re-runs for an adopted node (model replaced via fromJson with a previous model)
            // the element stays in place; only on a real unmount is the element disconnected
            if (!element.isConnected) {
                if (controller.getModel().getNodeById(tabNode.getId())) {
                    // check node still in model
                    if (!tabNode.isEnableWindowReMount()) {
                        controller.getMainController()?.getMoveablesHome()?.appendChild(element); // keep element parented for open layers etc
                    }
                }
                tabNode.setVisible(false);
            }
        };
    }, [tabNode, controller, onPointerDown]);

    React.useEffect(() => {
        if (tabNode.isSelected()) {
            if (firstSelect.current) {
                tabNode.restoreScrollPosition(); // if window docked back in
                firstSelect.current = false;
            }
        }
    });

    // register with the layout's positioning pass, which owns this element's position styles,
    // visibility and the resize/visibility events (see LayoutController.positionTabPanels)
    React.useLayoutEffect(() => {
        controller.registerTabPanel(tabNode, selfRef.current);
        return () => {
            controller.registerTabPanel(tabNode, null);
        };
    }, [controller, tabNode]);

    const cm = controller.getClassName;

    let overlay = null;

    if (selected && document.hidden && tabNode.isEnablePopoutOverlay()) {
        const overlayStyle: React.CSSProperties = {};
        parentNode.getContentRect().styleWithPosition(overlayStyle);
        const overlayClassName = cn(
            "absolute z-20 bg-[rgba(0,0,0,0.2392156863)]",
            cm(CLASSES.FLEXLAYOUT__TAB_OVERLAY),
            parentNode instanceof BorderNode && parentNode.isOverlay()
                ? // must paint above the overlay border panel
                  [cm(CLASSES.FLEXLAYOUT__TAB_OVERLAY_RAISED), "z-[1001]"]
                : undefined,
        );
        overlay = <div style={overlayStyle} className={overlayClassName}></div>;
    }

    const className = cn(
        "absolute box-border overflow-hidden bg-[var(--fl-color-tab-content)] text-[var(--fl-color-text)]",
        cm(CLASSES.FLEXLAYOUT__TAB),
        parentNode instanceof BorderNode && [
            cm(CLASSES.FLEXLAYOUT__TAB_BORDER),
            cm(CLASSES.FLEXLAYOUT__TAB_BORDER_ + parentNode.getLocation().getName()),
            // the panel must paint above the main area tab panels (root level siblings at z auto)
            parentNode.isOverlay() ? [cm(CLASSES.FLEXLAYOUT__TAB_BORDER_OVERLAY), "z-[1000]"] : undefined,
        ],
        tabNode.getContentClassName(),
    );

    // Content renders into moveable element
    return (
        <>
            {overlay}

            <div
                ref={selfRef}
                id={domId("flexlayout-tab-", tabNode.getId())}
                role="tabpanel"
                aria-labelledby={domId("flexlayout-tabbutton-", tabNode.getId())}
                aria-keyshortcuts={toAriaKeyShortcuts(focusToggleKey)}
                tabIndex={-1}
                onKeyDown={focusToggleKey ? onKeyDown : undefined}
                className={className}
                data-layout-path={tabNode.getPath()}
            >
                <TabScrollArea
                    className={cn("absolute inset-0 overflow-hidden", cm(CLASSES.FLEXLAYOUT__TAB_CONTENT_SCROLL_AREA))}
                    viewportClassName={cn("overscroll-contain", cm(CLASSES.FLEXLAYOUT__TAB_CONTENT_VIEWPORT))}
                    viewportRef={contentViewportRef}
                    orientation="both"
                    showScrollbar={tabNode.isEnableScrollbars()}
                    scrollEnabled={tabNode.isEnableScrollbars()}
                    classNameMapper={cm}
                />
            </div>
        </>
    );
};

Tab.displayName = "Tab"; // name in react dev tools

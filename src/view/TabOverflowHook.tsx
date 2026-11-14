import * as React from "react";
import { TabSetNode } from "../model/TabSetNode";
import { BorderNode } from "../model/BorderNode";
import { Orientation } from "../model/Orientation";
import { LayoutController } from "./layout/LayoutInternal";
import { TabNode } from "../model/TabNode";
import { domId } from "./Utils";
import { Rect } from "../model/Rect";

/** @internal */
export const useTabOverflow = (
    controller: LayoutController,
    node: TabSetNode | BorderNode,
    orientation: Orientation,
    tabStripRef: React.RefObject<HTMLElement | null>,
    wheelRef: React.RefObject<HTMLElement | null>, // element whose wheel events scroll the tabs (needed to preventDefault, since React wheel listeners are passive)
    tabClassName: string,
    stickyButtonsRef?: React.RefObject<HTMLElement | null>,
) => {
    const [hiddenTabs, setHiddenTabs] = React.useState<number[]>([]);
    const [isShowHiddenTabs, setShowHiddenTabs] = React.useState<boolean>(false);
    const [isDockStickyButtons, setDockStickyButtons] = React.useState<boolean>(false);

    const userControlledPositionRef = React.useRef<boolean>(false);
    const updateHiddenTabsTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const hiddenTabsRef = React.useRef<number[]>([]);
    const repositioningRef = React.useRef<boolean>(false);
    const stickySizeRef = React.useRef<number>(0);

    React.useEffect(() => {
        return () => {
            if (updateHiddenTabsTimerRef.current !== undefined) {
                clearTimeout(updateHiddenTabsTimerRef.current);
            }
        };
    }, []);

    React.useLayoutEffect(() => {
        hiddenTabsRef.current = hiddenTabs;
    });

    const setScrollPosition = React.useCallback(
        (p: number) => {
            if (orientation === Orientation.HORZ) {
                tabStripRef.current!.scrollLeft = p;
            } else {
                tabStripRef.current!.scrollTop = p;
            }
        },
        [orientation, tabStripRef],
    );

    const getScrollPosition = React.useCallback(
        (elm: Element) => {
            if (orientation === Orientation.HORZ) {
                return elm.scrollLeft;
            } else {
                return elm.scrollTop;
            }
        },
        [orientation],
    );

    const getElementSize = React.useCallback(
        (elm: Element) => {
            if (orientation === Orientation.HORZ) {
                return elm.clientWidth;
            } else {
                return elm.clientHeight;
            }
        },
        [orientation],
    );

    const getScrollSize = React.useCallback(
        (elm: Element) => {
            if (orientation === Orientation.HORZ) {
                return elm.scrollWidth;
            } else {
                return elm.scrollHeight;
            }
        },
        [orientation],
    );

    const getSize = React.useCallback(
        (rect: DOMRect | Rect) => {
            if (orientation === Orientation.HORZ) {
                return rect.width;
            } else {
                return rect.height;
            }
        },
        [orientation],
    );

    const getNear = React.useCallback(
        (rect: DOMRect | Rect) => {
            if (orientation === Orientation.HORZ) {
                return rect.x;
            } else {
                return rect.y;
            }
        },
        [orientation],
    );

    const getFar = React.useCallback(
        (rect: DOMRect | Rect) => {
            if (orientation === Orientation.HORZ) {
                return rect.right;
            } else {
                return rect.bottom;
            }
        },
        [orientation],
    );

    const findHiddenTabs = React.useCallback((): number[] => {
        const hidden: number[] = [];
        if (tabStripRef.current) {
            const strip = tabStripRef.current;
            const stripRect = strip.getBoundingClientRect();
            const visibleNear = getNear(stripRect) - 1;
            const visibleFar = getFar(stripRect) + 1;

            const tabContainer = strip.firstElementChild!;

            let i = 0;
            Array.from(tabContainer.children).forEach((child) => {
                const tabRect = child.getBoundingClientRect();

                if (child.classList.contains(tabClassName)) {
                    if (getNear(tabRect) < visibleNear || getFar(tabRect) > visibleFar) {
                        hidden.push(i);
                    }
                    i++;
                }
            });
        }

        return hidden;
    }, [tabClassName, tabStripRef, getNear, getFar]);

    const updateHiddenTabs = React.useCallback(
        (isInitial = false) => {
            const newHiddenTabs = findHiddenTabs();
            const showHidden = newHiddenTabs.length > 0;

            if (showHidden !== isShowHiddenTabs) {
                setShowHiddenTabs(showHidden);
            }

            if (isInitial) {
                setHiddenTabs(newHiddenTabs);
            } else if (updateHiddenTabsTimerRef.current === undefined) {
                // throttle updates to prevent Maximum update depth exceeded error
                updateHiddenTabsTimerRef.current = setTimeout(() => {
                    const currentHiddenTabs = findHiddenTabs();
                    if (!arraysEqual(currentHiddenTabs, hiddenTabsRef.current)) {
                        setHiddenTabs(currentHiddenTabs);
                    }

                    updateHiddenTabsTimerRef.current = undefined;
                }, 100);
            }
        },
        [findHiddenTabs, isShowHiddenTabs],
    );

    const scrollIntoView = React.useCallback(() => {
        const selectedTabNode = node.getSelectedNode() as TabNode | undefined;
        if (selectedTabNode && tabStripRef.current) {
            const stripRect = controller.getBoundingClientRect(tabStripRef.current);
            // measure the button from the dom (the model tabRect is only updated in the layout central
            // measure pass, which runs after this effect)
            const buttonElement = tabStripRef.current.ownerDocument.getElementById(domId("flexlayout-tabbutton-", selectedTabNode.getId()));
            if (!buttonElement) {
                return;
            }
            const selectedRect = controller.getBoundingClientRect(buttonElement);

            let shift = getNear(stripRect) - getNear(selectedRect);
            if (shift > 0 || getSize(selectedRect) > getSize(stripRect)) {
                setScrollPosition(getScrollPosition(tabStripRef.current) - shift);
                repositioningRef.current = true; // prevent onScroll setting userControlledPosition
            } else {
                shift = getFar(selectedRect) - getFar(stripRect);
                if (shift > 0) {
                    setScrollPosition(getScrollPosition(tabStripRef.current) + shift);
                    repositioningRef.current = true;
                }
            }
        }
    }, [node, controller, tabStripRef, getNear, getFar, getSize, getScrollPosition, setScrollPosition]);

    const checkForOverflow = React.useCallback(() => {
        if (tabStripRef.current) {
            const strip = tabStripRef.current;
            // sum the strip's children: the tab container plus the sticky buttons bar (which
            // renders as a sibling of the tablist element, not inside it)
            let contentSize = 0;
            for (const child of Array.from(strip.children)) {
                contentSize += getElementSize(child);
            }

            // measure sticky buttons width/height to provide hysteresis equal to its size;
            // when docked the sticky bar is not in the strip, so use the cached size
            if (stickyButtonsRef?.current) {
                const measured = getElementSize(stickyButtonsRef.current);
                if (measured > 0) {
                    stickySizeRef.current = measured;
                }
            }
            const stickySize = stickySizeRef.current;
            const offset = isDockStickyButtons ? stickySize : 0; // must be sticky size to prevent oscillation (see #517)
            const dock = contentSize + offset > getElementSize(tabStripRef.current);
            if (dock !== isDockStickyButtons) {
                setDockStickyButtons(dock);
            }
        }
    }, [tabStripRef, stickyButtonsRef, isDockStickyButtons, getElementSize]);

    const onScroll = React.useCallback(() => {
        if (!repositioningRef.current) {
            userControlledPositionRef.current = true;
        }
        repositioningRef.current = false;
        updateHiddenTabs();
    }, [updateHiddenTabs]);

    const onMouseWheel = React.useCallback(
        (event: React.WheelEvent<HTMLElement>) => {
            if (!tabStripRef.current) return;
            if (node.getChildren().length === 0) return;

            const absX = Math.abs(event.deltaX);
            const absY = Math.abs(event.deltaY);
            if (absX === 0 && absY === 0) return;

            // For horizontal strips trackpad deltaX is the natural axis, but a mouse wheel
            // only provides deltaY. Picking the dominant axis avoids the "jerky" horizontal
            // trackpad scroll where a tiny diagonal deltaY (~0.2px) was used instead of the
            // intended deltaX (~10px).
            let delta: number;
            if (orientation === Orientation.HORZ) {
                delta = absX > absY ? event.deltaX : event.deltaY;
            } else {
                delta = absY > absX ? event.deltaY : event.deltaX;
            }

            if (event.deltaMode === 1) {
                // DOM_DELTA_LINE 0x01 — delta values are specified in lines
                delta *= 40;
            }

            const maxScroll = getScrollSize(tabStripRef.current) - getElementSize(tabStripRef.current);
            if (maxScroll <= 0) return;

            const currentPos = getScrollPosition(tabStripRef.current);
            const newPos = currentPos + delta;
            const p = Math.max(0, Math.min(maxScroll, newPos));
            setScrollPosition(p);
            event.stopPropagation();
        },
        [node, tabStripRef, orientation, getScrollPosition, getScrollSize, getElementSize, setScrollPosition],
    );

    const onWheel = React.useCallback(
        (event: Event) => {
            const strip = tabStripRef.current;
            if (!strip) return;
            const maxScroll = getScrollSize(strip) - getElementSize(strip);
            if (maxScroll <= 0) return;
            event.preventDefault();
        },
        [tabStripRef, getScrollSize, getElementSize],
    );

    const nodeId = node.getId();
    const selectedNode = node.getSelectedNode();

    // reset scroll on model change
    React.useLayoutEffect(() => {
        if (tabStripRef.current) {
            setScrollPosition(0);
        }
    }, [nodeId, tabStripRef, setScrollPosition]);

    // if the selected node changes then unset usercontrolled (so the selected tab will be kept in view)
    React.useLayoutEffect(() => {
        userControlledPositionRef.current = false;
    }, [selectedNode]);

    React.useLayoutEffect(() => {
        checkForOverflow(); // if tabs + sticky buttons length > scroll area => move sticky buttons to right buttons

        if (userControlledPositionRef.current === false) {
            scrollIntoView();
        }

        // Initial calculation to prevent flash
        // eslint-disable-next-line react-hooks/set-state-in-effect
        updateHiddenTabs(true);

        const id = requestAnimationFrame(() => {
            updateHiddenTabs();
        });
        return () => cancelAnimationFrame(id);
    }, [checkForOverflow, scrollIntoView, updateHiddenTabs, orientation, selectedNode]);

    // strip geometry changes no longer cause a react render (they are applied imperatively by the
    // layout), so watch the strip element itself for size changes and its children for add/remove
    React.useLayoutEffect(() => {
        const strip = tabStripRef.current;
        if (!strip) {
            return;
        }
        const win = strip.ownerDocument.defaultView!;
        const resizeObserver = new win.ResizeObserver(() => {
            checkForOverflow();
            // only snap the selected tab back into view on a genuine geometry change; if the
            // resize is a consequence of the user's own scroll (the overflow/sticky buttons
            // toggling change the strip width), respect the scroll position they chose.
            // a splitter drag is always a genuine geometry change: keep the selected tab in view
            // even when the user had previously scrolled away (see isSplitterDragging)
            const splitterDragging = controller.isSplitterDragging();
            if (!userControlledPositionRef.current || splitterDragging) {
                if (splitterDragging) {
                    userControlledPositionRef.current = false;
                }
                scrollIntoView();
            }
            updateHiddenTabs();
        });
        resizeObserver.observe(strip);

        // watch the tab container for child list changes (e.g. group expand/collapse
        // adds or removes tab buttons and markers from the DOM)
        const tabContainer = strip.firstElementChild;
        const mutationObserver = new win.MutationObserver(() => {
            updateHiddenTabs();
        });
        if (tabContainer) {
            mutationObserver.observe(tabContainer, { childList: true, subtree: true });
        }

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
        };
    }, [checkForOverflow, scrollIntoView, updateHiddenTabs, tabStripRef, controller]);

    // observe sticky buttons size changes (e.g. dynamic content or wide custom buttons >10px, see #517)
    React.useLayoutEffect(() => {
        const sticky = stickyButtonsRef?.current;
        if (!sticky) {
            return;
        }
        const win = sticky.ownerDocument.defaultView!;
        const observer = new win.ResizeObserver(() => {
            checkForOverflow();
        });
        observer.observe(sticky);
        return () => observer.disconnect();
    }, [checkForOverflow, stickyButtonsRef, isDockStickyButtons]);

    // no deps: the strip element can change between renders (e.g. tab wrap toggled)
    React.useEffect(() => {
        if (node instanceof TabSetNode && node.isEnableTabWrap()) {
            return; // wrapping tab strips show all tabs, wheel should scroll the page as normal
        }
        const strip = wheelRef.current;
        strip?.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            strip?.removeEventListener("wheel", onWheel);
        };
    });

    return { userControlledPositionRef, onScroll, hiddenTabs, onMouseWheel, isDockStickyButtons, isShowHiddenTabs };
};

function arraysEqual(arr1: number[], arr2: number[]) {
    return arr1.length === arr2.length && arr1.every((val, index) => val === arr2[index]);
}

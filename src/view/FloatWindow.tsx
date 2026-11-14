import * as React from "react";
import { CLASSES } from "../CSSClassNames";
import { LayoutController } from "./layout/LayoutInternal";
import { ModelLayout } from "../model/ModelLayout";
import { Rect } from "../model/Rect";
import { startDrag, getPageMetrics } from "./Utils";
import { Actions } from "../model/Actions";
import { I18nLabel } from "./I18nLabel";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { LayoutTooltip } from "./LayoutTooltip";
import { ResizeDirection, ResizeHandles } from "./ResizeHandles";

/** @internal */
export interface IFloatWindowProps {
    controller: LayoutController;
    layout: ModelLayout;
    zIndex: number;
    onCloseLayout: (layout: ModelLayout) => void;
}

const MIN_WIDTH = 150;
const MIN_HEIGHT = 25;

/** @internal */
export const FloatWindow = (props: React.PropsWithChildren<IFloatWindowProps>) => {
    const { controller, layout, children } = props;
    const [rect, setRect] = React.useState<Rect>(layout.getRect());
    const latestRect = React.useRef<Rect>(Rect.empty());
    const cm = controller.getClassName;
    const selfRef = React.useRef<HTMLDivElement>(null);
    const headerRef = React.useRef<HTMLDivElement>(null);
    const moveToFrontRef = React.useRef<boolean>(false);
    const raiseTimerRef = React.useRef<number | undefined>(undefined);

    React.useEffect(() => {
        latestRect.current = rect;
    }, [rect]);

    React.useEffect(() => {
        const id = requestAnimationFrame(() => {
            setRect(layout.getRect());
        });
        return () => cancelAnimationFrame(id);
    }, [layout]);

    const clampToDoc = React.useCallback(
        (rect: Rect) => {
            const win = controller.getCurrentWindow() ?? window;
            const layoutRect = Rect.fromDomRect(controller.getRootDiv()!.getBoundingClientRect());
            let boundaryRect: Rect;
            if (controller.getProps().constrainFloatPanels) {
                boundaryRect = new Rect(0, 0, layoutRect.width, layoutRect.height);
            } else {
                const page = getPageMetrics(win);
                const width = Math.max(page.fullWidth, win.innerWidth);
                const height = Math.max(page.fullHeight, win.innerHeight);
                boundaryRect = new Rect(-layoutRect.x, -layoutRect.y, width, height);
            }

            const clamped = rect.clone();
            clamped.clamp(boundaryRect);
            return clamped;
        },
        [controller],
    );

    const onTouchStart = React.useCallback((event: TouchEvent) => {
        event.preventDefault();
        event.stopImmediatePropagation();
    }, []);

    // touch down on the header or a resize handle must not start a page scroll
    React.useEffect(() => {
        const root = selfRef.current;
        if (!root) {
            return;
        }
        const elements = [headerRef.current, ...Array.from(root.querySelectorAll<HTMLElement>("[data-resize-handle]"))].filter(
            (el): el is HTMLElement => el !== null,
        );
        elements.forEach((el) => el.addEventListener("touchstart", onTouchStart, { passive: false }));
        return () => {
            elements.forEach((el) => el.removeEventListener("touchstart", onTouchStart));
        };
    }, [onTouchStart]);

    const initializedRef = React.useRef(false);

    React.useLayoutEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            const clamped = clampToDoc(rect);
            if (!clamped.equals(rect)) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setRect(clamped);
                layout.setRect(clamped);
            }
        }
    }, [clampToDoc, rect, layout]);

    React.useEffect(() => {
        const onPointerDown = () => {
            const layouts = [...controller.getModel().getLayouts()];
            const frontLayout = layouts[layouts.length - 1][1];
            if (layout !== frontLayout) {
                moveToFrontRef.current = true;
            }
        };
        const win = controller.getCurrentWindow() ?? window;
        const onPointerUp = () => {
            if (moveToFrontRef.current) {
                raiseTimerRef.current = win.setTimeout(() => {
                    raiseTimerRef.current = undefined;
                    controller.moveWindowToFront(layout.getLayoutId());
                }, 10);
                moveToFrontRef.current = false;
            }
        };
        const current = selfRef.current;
        if (current) {
            current.addEventListener("pointerdown", onPointerDown, { capture: true });
            current.addEventListener("pointerup", onPointerUp);
        }
        return () => {
            if (current) {
                current.removeEventListener("pointerdown", onPointerDown, { capture: true });
                current.removeEventListener("pointerup", onPointerUp);
            }
            // cancel a pending front-raise so it can't dispatch after unmount
            if (raiseTimerRef.current !== undefined) {
                win.clearTimeout(raiseTimerRef.current);
                raiseTimerRef.current = undefined;
            }
        };
    }, [controller, layout]);

    const onPointerDownHeader = (e: React.PointerEvent<HTMLElement>) => {
        e.stopPropagation();
        const offset = { x: e.clientX - rect.x, y: e.clientY - rect.y };
        controller.showOverlayOnAllWindows(true);

        startDrag(
            controller.getCurrentDocument() ?? document,
            e,
            (x, y) => {
                if (moveToFrontRef.current) {
                    controller.moveWindowToFront(layout.getLayoutId());
                    moveToFrontRef.current = false;
                }
                const newRect = new Rect(x - offset.x, y - offset.y, rect.width, rect.height);
                const clamped = clampToDoc(newRect);
                setRect(clamped);
                controller.doAction(Actions.moveFloat(layout.getLayoutId(), clamped).setAdjusting(true));
            },

            () => {
                controller.doAction(Actions.moveFloat(layout.getLayoutId(), latestRect.current).setAdjusting(false));
                controller.redrawLayout();
                controller.showOverlayOnAllWindows(false);
            },
            () => {
                controller.doAction(Actions.moveFloat(layout.getLayoutId(), latestRect.current).setAdjusting(false));
                controller.redrawLayout();
                controller.showOverlayOnAllWindows(false);
            },
        );
    };

    const icons = controller.getIcons();
    const dockTitle = controller.i18nName(I18nLabel.Dock_Float_To_Layout);
    const popoutFloatTitle = controller.i18nName(I18nLabel.Popout_Float_To_Window);

    // a panel can only pop out when every tab in it can live in a separate window
    const canPopout = controller.isSupportsPopout() && layout.getRootRow()?.isAllowedInWindow() === true;

    // the checkerboard handle docks the whole floating layout into the main layout
    const onDragStartDock = (event: React.DragEvent<HTMLElement>) => {
        event.stopPropagation();
        if (layout.getRootRow()?.getChildren().length) {
            controller.getDragDropManager().startDockLayoutDrag(event.nativeEvent, layout, selfRef.current ?? undefined);
        } else {
            event.preventDefault();
        }
    };

    const onDragEndDock = (_event: React.DragEvent<HTMLElement>) => {
        controller.getDragDropManager().onDragEnded();
    };

    const onDockHandlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
        // prevent the header's pointer move-drag from starting
        event.stopPropagation();
    };

    const onPopoutFloatClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        // the float's rect is relative to the main layout root; convert it to screen coords
        const screenRect = controller.getScreenRect(layout.getRect());
        controller.doAction(Actions.popoutFloat(layout.getLayoutId(), screenRect.toJson()));
    };

    const onPointerDownResize = (e: React.PointerEvent<HTMLElement>, direction: ResizeDirection) => {
        const startRect = rect;
        const startPos = { x: e.clientX, y: e.clientY };
        controller.showOverlayOnAllWindows(true);

        startDrag(
            controller.getCurrentDocument() ?? document,
            e,
            (x, y) => {
                const dx = x - startPos.x;
                const dy = y - startPos.y;
                let newX = startRect.x;
                let newY = startRect.y;
                let newW = startRect.width;
                let newH = startRect.height;

                if (direction.includes("n")) {
                    newY += dy;
                    newH -= dy;
                }
                if (direction.includes("s")) {
                    newH += dy;
                }
                if (direction.includes("w")) {
                    newX += dx;
                    newW -= dx;
                }
                if (direction.includes("e")) {
                    newW += dx;
                }

                const newRect = new Rect(newX, newY, Math.max(MIN_WIDTH, newW), Math.max(MIN_HEIGHT, newH));
                const clamped = clampToDoc(newRect);
                setRect(clamped);
                controller.doAction(Actions.moveFloat(layout.getLayoutId(), clamped).setAdjusting(true));
            },

            () => {
                controller.doAction(Actions.moveFloat(layout.getLayoutId(), latestRect.current).setAdjusting(false));
                controller.redrawLayout();
                controller.showOverlayOnAllWindows(false);
            },
            () => {
                controller.doAction(Actions.moveFloat(layout.getLayoutId(), latestRect.current).setAdjusting(false));
                controller.redrawLayout();
                controller.showOverlayOnAllWindows(false);
            },
        );
        e.stopPropagation();
    };

    const content = (
        <Card
            ref={selfRef}
            className={cn(
                "absolute z-[2000] box-border flex flex-col gap-0 overflow-hidden py-0 shadow-lg",
                cm(CLASSES.FLEXLAYOUT__FLOAT_WINDOW),
            )}
            style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
            }}
        >
            <CardHeader
                ref={headerRef}
                className={cn(
                    "flex min-h-[15px] cursor-move items-center gap-0 select-none border-b border-[color:var(--fl-color-tabset-divider-line)] bg-[var(--fl-color-float-window-header-background)] px-[5px] py-[5px] [font-family:var(--fl-font-family)] [font-size:0.8em]",
                    cm(CLASSES.FLEXLAYOUT__FLOAT_WINDOW_HEADER),
                )}
                onPointerDown={onPointerDownHeader}
            >
                <LayoutTooltip label={dockTitle}>
                    <div
                        data-layout-path="/floatwindow/drag-handle"
                        className={cn(
                            "flex cursor-grab items-center px-1 opacity-70 hover:opacity-100 active:cursor-grabbing",
                            cm(CLASSES.FLEXLAYOUT__FLOAT_WINDOW_DRAG_HANDLE),
                        )}
                        draggable={true}
                        aria-label={dockTitle}
                        onDragStart={onDragStartDock}
                        onDragEnd={onDragEndDock}
                        onPointerDown={onDockHandlePointerDown}
                    >
                        {icons.dragToDock}
                    </div>
                </LayoutTooltip>
                <div className="flex min-w-0 grow items-center justify-center overflow-hidden">
                    {layout.getName() !== undefined ? (
                        <CardTitle
                            data-layout-path="/floatwindow/title"
                            className={cn(
                                "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-normal leading-normal",
                                cm(CLASSES.FLEXLAYOUT__FLOAT_WINDOW_HEADER_TITLE),
                            )}
                            title={layout.getName()}
                        >
                            {layout.getName()}
                        </CardTitle>
                    ) : (
                        <div className="flex h-2 w-[50px] flex-col justify-around opacity-50">
                            <div className="h-0.5 rounded-[1px] bg-gray-500"></div>
                        </div>
                    )}
                </div>
                {canPopout && (
                    <LayoutTooltip label={popoutFloatTitle}>
                        <Button
                            type="button"
                            data-layout-path="/floatwindow/button/popout"
                            variant="ghost"
                            size="icon-xs"
                            className={cn("size-5 opacity-70 hover:opacity-100", cm(CLASSES.FLEXLAYOUT__FLOAT_WINDOW_BUTTON))}
                            aria-label={popoutFloatTitle}
                            onClick={onPopoutFloatClick}
                            onPointerDown={onDockHandlePointerDown}
                        >
                            {icons.popoutFloatWindow}
                        </Button>
                    </LayoutTooltip>
                )}
            </CardHeader>
            <CardContent
                className={cn(
                    "relative m-[5px] flex min-h-0 min-w-0 grow flex-col overflow-auto px-0",
                    cm(CLASSES.FLEXLAYOUT__FLOAT_WINDOW_CONTENT),
                )}
            >
                {children}
            </CardContent>
            <ResizeHandles onResizePointerDown={onPointerDownResize} />
        </Card>
    );

    // const portal = createPortal(content, document.documentElement, layout.getLayoutId());
    // return portal;

    return content;
};

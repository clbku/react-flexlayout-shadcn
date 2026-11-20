import * as React from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { TabNode } from "../model/TabNode";
import { TabGroupNode } from "../model/TabGroupNode";
import { CLASSES } from "../CSSClassNames";
import { I18nLabel } from "./I18nLabel";
import { LayoutController } from "./layout/LayoutInternal";
import { TabButtonStamp } from "./TabButtonStamp";
import { TabSetNode } from "../model/TabSetNode";
import { BorderNode } from "../model/BorderNode";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "../components/ui/context-menu";
import { cn } from "../lib/utils";

// shared by the default and custom (overflow) items; the custom body is the Radix item itself
const POPUP_ITEM_CLASSES =
    "relative flex cursor-pointer items-center gap-2 overflow-hidden whitespace-nowrap rounded-[2px] px-[0.5em] py-[2px] text-[length:var(--fl-font-size)] select-none hover:bg-[var(--fl-color-6)] focus:bg-[var(--fl-color-6)] focus:text-[var(--fl-color-popup-unselected)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--fl-color-focus)] data-[disabled]:pointer-events-none data-[disabled]:cursor-default data-[disabled]:opacity-40";

const POPUP_CONTENT_CLASSES =
    "z-[3000] flex max-h-[50%] min-w-[100px] flex-col overflow-hidden rounded-[var(--radius-md,6px)] border-[color:var(--fl-color-popup-border)] bg-[var(--fl-color-popup-unselected-background)] p-[2px] text-[var(--fl-color-popup-unselected)] shadow-[inset_0_0_5px_rgba(0,0,0,0.15),0_8px_24px_rgb(0_0_0/0.12)] [font-family:var(--fl-font-family)] [font-size:var(--fl-font-size)] [font-weight:var(--fl-font-weight)]";

const POPUP_DIVIDER_CLASSES = "mx-[2px] my-1 h-px bg-[var(--fl-color-popup-border)]";

// the DropdownMenu and ContextMenu items expose the same subset of props, so one entry renderer
// serves both menu flavours
type PopupItemComponent = React.ComponentType<{
    className?: string;
    disabled?: boolean;
    asChild?: boolean;
    onSelect?: (event: Event) => void;
    children?: React.ReactNode;
}>;

type PopupSeparatorComponent = React.ComponentType<{ className?: string }>;

/**
 * A single entry in a {@link PopupMenu}. Provide `label` (with optional `icon`) for the common
 * case, or `content` for a fully custom item body (overrides `label`/`icon`).
 * @category Components
 * @group Popup Menu
 */
export interface IPopupMenuItem {
    /** entry discriminant; defaults to a selectable item */
    type?: "item";
    /** stable unique key for this item */
    key: string;
    /** text shown for the item when `content` is not given */
    label?: string;
    /** optional leading icon, shown before the label */
    icon?: React.ReactNode;
    /** custom item body; when present it overrides `label` and `icon` */
    content?: React.ReactNode;
    /** when true the item cannot be selected */
    disabled?: boolean;
    /** called when this item is selected instead of the menu-level onSelect */
    onSelect?: (item: IPopupMenuItem) => void;
}

/**
 * A non-selectable divider (horizontal rule) between menu items.
 * @category Components
 * @group Popup Menu
 */
export interface IPopupMenuDivider {
    /** entry discriminant */
    type: "divider";
    /** stable unique key for this divider */
    key: string;
}

/**
 * An entry in a {@link PopupMenu}: a selectable {@link IPopupMenuItem} or an
 * {@link IPopupMenuDivider}.
 * @category Components
 * @group Popup Menu
 */
export type PopupMenuEntry = IPopupMenuItem | IPopupMenuDivider;

/**
 * Helpers passed to a custom {@link IPopupMenuProps.renderItem} so it can drive the menu's
 * canonical selection/close behaviour (focus return, onSelect, onClose).
 * @category Components
 * @group Popup Menu
 */
export interface IPopupMenuItemApi {
    /** select this item (fires onSelect then closes the menu) */
    select: () => void;
    /** close the menu without selecting */
    close: () => void;
}

/**
 * Props for the reusable {@link PopupMenu} control and the {@link showPopupMenu} helper. The
 * control has no dependency on the layout model - it can be used as a standalone menu/context menu.
 * @category Components
 * @group Popup Menu
 */
export interface IPopupMenuProps {
    /** where to position the menu: a screen point (e.g. a right-click location), a DOMRect, or an
     *  element to anchor to. An element is measured when the menu opens. */
    anchor: { x: number; y: number } | DOMRect | HTMLElement;
    /** the menu entries (selectable items and/or dividers) */
    items: PopupMenuEntry[];
    /** called with the chosen item when one is selected */
    onSelect?: (item: IPopupMenuItem) => void;
    /** called when the menu closes (selection, Escape/Tab, outside click, or programmatic hide) */
    onClose: () => void;
    /** element the menu is positioned within and portalled into; defaults to the anchor's document body.
     *  Should be a positioned element (e.g. the FlexLayout root) for precise placement. For context menus
     * on nodes (tab, tabset...) use node.getLayoutRef()! */
    container?: HTMLElement;
    /** maps default class names to custom ones (e.g. for css modules); defaults to identity */
    classNameMapper?: (defaultClassName: string) => string;
    /** custom renderer for an item; must render an element with role="menuitem" and tabIndex=-1 */
    renderItem?: (item: IPopupMenuItem, index: number, api: IPopupMenuItemApi) => React.ReactNode;
    /** element to return focus to when the menu closes; defaults to the anchor when it is an element */
    returnFocusTo?: HTMLElement;
    /** accessible label for the menu */
    title?: string;
    /** extra classes for the menu surface, merged over the defaults */
    contentClassName?: string;
}

/** @internal duck-type an element (cross-window/popout elements are not `instanceof` this realm's HTMLElement) */
function isElementAnchor(anchor: { x: number; y: number } | DOMRect | HTMLElement): anchor is HTMLElement {
    return typeof (anchor as HTMLElement).getBoundingClientRect === "function";
}

/** @internal a plain pointer position (e.g. a right click) rather than an element or rect */
function isPointAnchor(anchor: { x: number; y: number } | DOMRect | HTMLElement): anchor is { x: number; y: number } {
    return !isElementAnchor(anchor) && !("right" in anchor && "bottom" in anchor);
}

/** @internal */
function resolveContainer(props: IPopupMenuProps): HTMLElement {
    if (props.container) {
        return props.container;
    }
    if (isElementAnchor(props.anchor)) {
        return props.anchor.ownerDocument.body;
    }
    return document.body;
}

/** @internal resolve an anchor to a DOMRect. Element anchors are measured here; callers that need
 *  the measurement to happen at a specific time (e.g. synchronously when a menu opens, before a
 *  re-render can detach the element) should pass a pre-measured DOMRect instead of the element. */
function anchorToRect(anchor: { x: number; y: number } | DOMRect | HTMLElement): DOMRect {
    if (isElementAnchor(anchor)) {
        return anchor.getBoundingClientRect();
    }
    if ("right" in anchor && "bottom" in anchor) {
        // DOMRect-like
        return anchor as DOMRect;
    }
    const point = anchor as { x: number; y: number };
    return new DOMRect(point.x, point.y, 0, 0);
}

/**
 * A reusable, accessible popup menu built on the shadcn menu primitives (Radix): a pointer anchor
 * (e.g. a right click) opens a ContextMenu at that point, while an element/DOMRect anchor opens a
 * DropdownMenu towards the centre of the container. It handles keyboard navigation (arrows,
 * Home/End, type-ahead, Enter/Space, Escape/Tab), focus management and outside-click dismissal, and
 * portals itself into `container` (default: the document body).
 *
 * For fire-on-event usage (e.g. a right-click context menu) see {@link showPopupMenu}, which
 * mounts this component imperatively and returns a hide handle.
 * @category Components
 * @group Popup Menu
 */
export const PopupMenu = (props: IPopupMenuProps) => {
    const { anchor, items, onSelect, onClose, renderItem, title } = props;
    const cm = props.classNameMapper ?? ((c: string) => c);
    const container = resolveContainer(props);
    const anchorRect = anchorToRect(anchor);
    const containerRect = container.getBoundingClientRect();
    const isContextMenu = isPointAnchor(anchor);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const settledRef = React.useRef(false);
    const [contextOpen, setContextOpen] = React.useState(false);

    // every close path (selection, Escape/Tab, outside press) funnels through here exactly once
    const close = React.useCallback(() => {
        if (settledRef.current) {
            return;
        }
        settledRef.current = true;
        onClose();
    }, [onClose]);

    const select = React.useCallback(
        (item: IPopupMenuItem) => {
            if (item.disabled || settledRef.current) {
                return;
            }
            settledRef.current = true;
            (item.onSelect ?? onSelect)?.(item);
            onClose();
        },
        [onSelect, onClose],
    );

    const returnFocusTo = props.returnFocusTo ?? (isElementAnchor(anchor) ? anchor : undefined);

    // Radix would focus the content root; focus the first item instead, unless a control inside the
    // menu auto-focused itself (such as an inline rename input)
    const onMenuAutoFocus = React.useCallback(
        (event: Event) => {
            event.preventDefault();
            const content = contentRef.current;
            const active = container.ownerDocument.activeElement;
            if (!content || (active && active !== content && content.contains(active))) {
                return; // keep the auto-focused control
            }
            const first = content.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])');
            (first ?? content).focus({ preventScroll: true });
        },
        [container],
    );

    // return focus to the trigger on unmount
    React.useEffect(() => {
        return () => {
            returnFocusTo?.focus?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Radix opens a ContextMenu from its trigger's contextmenu event: replay the original right
    // click at the anchor point before paint, so the first visible frame is already positioned
    React.useLayoutEffect(() => {
        const trigger = triggerRef.current;
        const view = trigger?.ownerDocument.defaultView;
        if (trigger && view) {
            trigger.dispatchEvent(
                new view.MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    button: 2,
                    clientX: anchorRect.left,
                    clientY: anchorRect.top,
                }),
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const itemApi = (item: IPopupMenuItem): IPopupMenuItemApi => ({
        select: () => select(item),
        close,
    });

    const renderEntries = (Item: PopupItemComponent, Separator: PopupSeparatorComponent) => {
        const itemClassName = (item: IPopupMenuItem) =>
            cn(POPUP_ITEM_CLASSES, cm(CLASSES.FLEXLAYOUT__POPUP_MENU_ITEM), item.disabled && cm(CLASSES.FLEXLAYOUT__POPUP_MENU_ITEM__DISABLED));

        const defaultItem = (item: IPopupMenuItem) => (
            <Item
                key={item.key}
                className={itemClassName(item)}
                disabled={item.disabled}
                onSelect={(event: Event) => {
                    event.preventDefault(); // the menu closes through select()/onClose
                    select(item);
                }}
            >
                {item.content ?? (
                    <>
                        {item.icon}
                        {item.label}
                    </>
                )}
            </Item>
        );

        const customItem = (item: IPopupMenuItem, index: number) => {
            const rendered = renderItem!(item, index, itemApi(item));
            if (rendered === null || rendered === undefined || rendered === false) {
                return defaultItem(item);
            }
            return (
                <Item
                    key={item.key}
                    asChild
                    disabled={item.disabled}
                    className={cn(itemClassName(item), React.isValidElement<{ className?: string }>(rendered) ? rendered.props.className : undefined)}
                    onSelect={(event: Event) => {
                        event.preventDefault();
                        select(item);
                    }}
                >
                    {rendered}
                </Item>
            );
        };

        return items.map((entry, i) =>
            entry.type === "divider" ? (
                <Separator key={entry.key} className={cn(POPUP_DIVIDER_CLASSES, cm(CLASSES.FLEXLAYOUT__POPUP_MENU_DIVIDER))} />
            ) : renderItem ? (
                customItem(entry, i)
            ) : (
                defaultItem(entry)
            ),
        );
    };

    const triggerStyle: React.CSSProperties = {
        position: "absolute",
        left: anchorRect.left - containerRect.left,
        top: anchorRect.top - containerRect.top,
        width: anchorRect.width,
        height: anchorRect.height,
        visibility: "hidden",
        pointerEvents: "none",
    };

    const contentClassName = cn(POPUP_CONTENT_CLASSES, props.contentClassName, cm(CLASSES.FLEXLAYOUT__POPUP_MENU_CONTAINER), cm(CLASSES.FLEXLAYOUT__POPUP_MENU));

    const contentBehaviour = {
        onOpenAutoFocus: onMenuAutoFocus,
        onCloseAutoFocus: (event: Event) => {
            event.preventDefault(); // skip Radix's focus return to the invisible trigger
            returnFocusTo?.focus?.();
        },
        onKeyDown: (event: React.KeyboardEvent) => {
            // Tab dismisses the menu (and returns focus) like Escape
            if (event.key === "Tab") {
                event.preventDefault();
                close();
            }
        },
        onPointerDownOutside: () => close(),
    };

    if (isContextMenu) {
        return createPortal(
            <ContextMenu
                open={contextOpen}
                onOpenChange={(open) => (open ? setContextOpen(true) : close())}
                modal={false}
            >
                {/* invisible trigger at the click point; the replayed contextmenu event opens the
                    menu there and Radix flips it to stay inside the viewport */}
                <ContextMenuTrigger asChild>
                    <div ref={triggerRef} aria-hidden="true" style={triggerStyle} />
                </ContextMenuTrigger>
                <ContextMenuContent
                    ref={contentRef}
                    container={container}
                    aria-label={title}
                    className={contentClassName}
                    {...contentBehaviour}
                    data-layout-path="/popup-menu"
                >
                    {renderEntries(ContextMenuItem as unknown as PopupItemComponent, ContextMenuSeparator as unknown as PopupSeparatorComponent)}
                </ContextMenuContent>
            </ContextMenu>,
            container,
        );
    }

    // element/rect anchors (e.g. the overflow button) open towards the centre of the container
    const inLeftHalf = (anchorRect.left + anchorRect.right) / 2 < containerRect.left + containerRect.width / 2;
    const inTopHalf = (anchorRect.top + anchorRect.bottom) / 2 < containerRect.top + containerRect.height / 2;

    return createPortal(
        <DropdownMenu open onOpenChange={(open) => !open && close()} modal={false}>
            <DropdownMenuTrigger asChild>
                <div aria-hidden="true" style={triggerStyle} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                ref={contentRef}
                container={container}
                side={inTopHalf ? "bottom" : "top"}
                align={inLeftHalf ? "start" : "end"}
                sideOffset={0}
                alignOffset={0}
                aria-label={title}
                className={contentClassName}
                {...contentBehaviour}
                data-layout-path="/popup-menu"
            >
                {renderEntries(DropdownMenuItem as unknown as PopupItemComponent, DropdownMenuSeparator as unknown as PopupSeparatorComponent)}
            </DropdownMenuContent>
        </DropdownMenu>,
        container,
    );
};

/**
 * Imperatively show a {@link PopupMenu} (e.g. from a context-menu / right-click handler). Mounts
 * the menu in its own React root and returns an idempotent hide handle; the menu also closes on
 * selection, Escape/Tab and outside click.
 * @category Components
 * @group Popup Menu
 */
export function showPopupMenu(props: IPopupMenuProps): () => void {
    const container = resolveContainer(props);
    // Snapshot anchor now — element may detach before menu shows
    const anchor = isElementAnchor(props.anchor) ? props.anchor.getBoundingClientRect() : props.anchor;
    const host = container.ownerDocument.createElement("div");
    container.appendChild(host);
    const root = createRoot(host);

    let hidden = false;
    const hide = () => {
        if (hidden) {
            return; // reachable from select / escape / tab / outside click / caller
        }
        hidden = true;
        // Radix can dismiss from inside a DOM event dispatched during the layout's commit (focus
        // and pointer dismissal); unmounting this separate root there would race that render
        queueMicrotask(() => {
            root.unmount();
            host.remove();
        });
        props.onClose();
    };

    root.render(<PopupMenu {...props} anchor={anchor} container={container} onClose={hide} />);
    return hide;
}

/**
 * The internal tab-overflow menu, built on the generic {@link PopupMenu}. Renders each hidden tab
 * as a {@link TabButtonStamp}, supports dragging a tab out of the menu, highlights the selected
 * tab, and shows the drag overlay while open (so drag-out works over iframes). It mounts inside the
 * layout's own React tree, so tab content from onRenderTab keeps the application's context.
 * @internal
 */
export function showOverflowMenu(
    triggerElement: HTMLElement,
    parentNode: TabSetNode | BorderNode,
    items: { index: number; node: TabNode }[],
    onSelect: (item: { index: number; node: TabNode }) => void,
    controller: LayoutController,
    onHidden?: () => void,
): () => void {
    const cm = controller.getClassName;
    const menuItems: IPopupMenuItem[] = items.map((it) => ({ key: it.node.getId() }));

    controller.showOverlayOnAllWindows(true);

    const renderItem = (item: IPopupMenuItem, i: number, api: IPopupMenuItemApi) => {
        const it = items[i];
        const group = it.node.getParent() instanceof TabGroupNode ? (it.node.getParent() as TabGroupNode) : undefined;
        const isGrouped = group !== undefined;
        let classes = cn(POPUP_ITEM_CLASSES, "shrink-0 rounded-[4px] px-2 py-1.5", cm(CLASSES.FLEXLAYOUT__POPUP_MENU_ITEM));
        if (isGrouped) {
            classes = cn(
                classes,
                "rounded-none border-l-[5px] border-l-[color:var(--flexlayout-group-color)] pl-[3px]",
                cm(CLASSES.FLEXLAYOUT__POPUP_MENU_ITEM_GROUPED),
            );
        }
        if (parentNode.getSelected() === it.index) {
            classes = cn(
                classes,
                "bg-[var(--fl-color-tab-selected-background)] font-medium text-[var(--fl-color-tab-selected)] focus:text-[var(--fl-color-tab-selected)]",
                cm(CLASSES.FLEXLAYOUT__POPUP_MENU_ITEM__SELECTED),
            );
        }
        const style: React.CSSProperties = {};
        if (isGrouped) {
            (style as Record<string, string>)["--flexlayout-group-color"] = group!.getColor();
        }
        return (
            <div
                key={item.key}
                className={classes}
                role="menuitem"
                aria-label={it.node.getNameForOverflowMenu()}
                tabIndex={-1}
                data-layout-path={"/popup-menu/tb" + i}
                style={style}
                onClick={(event) => {
                    api.select();
                    event.stopPropagation();
                }}
                draggable={true}
                onDragStart={(event) => {
                    event.stopPropagation();
                    controller.getDragDropManager().setDragNode(event.nativeEvent, it.node);
                }}
                onDragEnd={() => {
                    controller.getDragDropManager().onDragEnded();
                    api.close();
                }}
                title={it.node.getHelpText()}
            >
                <TabButtonStamp tabNode={it.node} controller={controller} className="gap-2" />
            </div>
        );
    };

    let hidden = false;
    const hide = () => {
        if (hidden) {
            return;
        }
        hidden = true;
        controller.setState({ popupMenu: undefined });
        controller.showOverlayOnAllWindows(false);
        onHidden?.();
    };

    controller.setState({
        popupMenu: (
            <PopupMenu
                key={"overflow-" + parentNode.getId()}
                anchor={triggerElement.getBoundingClientRect()}
                container={controller.getRootDiv() ?? undefined}
                classNameMapper={cm}
                contentClassName="gap-0.5 overflow-y-auto p-1"
                returnFocusTo={triggerElement}
                title={controller.i18nName(I18nLabel.Overflow_Menu_Tooltip)}
                items={menuItems}
                onSelect={(item) => {
                    const idx = menuItems.indexOf(item);
                    if (idx >= 0) {
                        onSelect(items[idx]);
                    }
                }}
                renderItem={renderItem}
                onClose={hide}
            />
        ),
    });
    return hide;
}

PopupMenu.displayName = "PopupMenu"; // name in react dev tools

import type { ICloseType } from "./ICloseType";

export type IBorderLocation = "top" | "bottom" | "left" | "right";
export type ITabLocation = "top" | "bottom";
export type IBorderTabDirection = "up" | "down";
export type ITabGroupType = "splitpill" | "underline";
export type ILayoutType = "window" | "float" | "tab";

export interface IJsonModel {
    global?: IGlobalAttributes;
    borders?: IJsonBorderNode[];
    layout: IJsonRowNode;
    subLayouts?: Record<string, IJsonSubLayout>;
    /** @deprecated Use `subLayouts` instead. */
    popouts?: Record<string, IJsonPopout>;
}

export interface IJsonRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IJsonSubLayout extends ISubLayoutAttributes {
    layout: IJsonRowNode;
    rect?: IJsonRect;
    type?: ILayoutType;
}

/** @deprecated Use `IJsonSubLayout` instead. */
export type IJsonPopout = IJsonSubLayout;

export interface IJsonBorderNode extends IBorderAttributes {
    location: IBorderLocation;
    children?: (IJsonTabNode | IJsonTabGroupNode)[];
}

export interface IJsonRowNode extends IRowAttributes {
    children?: (IJsonRowNode | IJsonTabSetNode)[];
}

export interface IJsonTabSetNode extends ITabSetAttributes {
    /** Marks this as the active tab set, read from initial json but
     * must subsequently be set on the model (only one tab set can be active) */
    active?: boolean;
    /** Marks this tab set as being maximized, read from initial json but
     * must subsequently be set on the model (only one tab set can be maximized) */
    maximized?: boolean;
    children?: (IJsonTabNode | IJsonTabGroupNode)[];
}

export interface IJsonTabGroupNode extends ITabGroupAttributes {
    children?: IJsonTabNode[];
}

export type IJsonTabNode = ITabAttributes;

export interface IGlobalAttributes {
    borderAutoSelectTabWhenClosed?: boolean;
    borderAutoSelectTabWhenOpen?: boolean;
    borderClassName?: string;
    borderEnableAutoHide?: boolean;
    borderEnableDrop?: boolean;
    borderEnableTabScrollbar?: boolean;
    borderLeftTabDirection?: IBorderTabDirection;
    borderMaxSize?: number;
    borderMinSize?: number;
    borderSize?: number;
    enableEdgeDock?: boolean;
    enableEdgeDockIndicators?: boolean;
    enableRotateBorderIcons?: boolean;
    rootOrientationVertical?: boolean;
    tabBorderHeight?: number;
    tabBorderWidth?: number;
    tabClassName?: string;
    tabCloseType?: ICloseType;
    tabContentClassName?: string;
    tabEnableClose?: boolean;
    tabEnableDrag?: boolean;
    tabEnableFloat?: boolean;
    tabEnableFloatIcon?: boolean;
    tabEnablePin?: boolean;
    tabEnablePopout?: boolean;
    tabEnablePopoutIcon?: boolean;
    tabEnablePopoutOverlay?: boolean;
    tabEnableRename?: boolean;
    tabEnableRenderOnDemand?: boolean;
    tabEnableScrollbars?: boolean;
    tabGroupType?: ITabGroupType;
    tabIcon?: string;
    tabMaxHeight?: number;
    tabMaxWidth?: number;
    tabMinHeight?: number;
    tabMinWidth?: number;
    tabSetAutoSelectTab?: boolean;
    tabSetClassNameTabStrip?: string;
    tabSetEnableActiveIcon?: boolean;
    tabSetEnableClose?: boolean;
    tabSetEnableCloseButton?: boolean;
    tabSetEnableDeleteWhenEmpty?: boolean;
    tabSetEnableDivide?: boolean;
    tabSetEnableDrag?: boolean;
    tabSetEnableDrop?: boolean;
    tabSetEnableMaximize?: boolean;
    tabSetEnableSingleTabStretch?: boolean;
    tabSetEnableTabGroups?: boolean;
    tabSetEnableTabScrollbar?: boolean;
    tabSetEnableTabStrip?: boolean;
    tabSetEnableTabWrap?: boolean;
    tabSetMaxHeight?: number;
    tabSetMaxWidth?: number;
    tabSetMinHeight?: number;
    tabSetMinWidth?: number;
    tabSetTabLocation?: ITabLocation;
}

export interface IRowAttributes {
    id?: string;
    type?: string;
    weight?: number;
}

export interface ITabSetAttributes {
    autoSelectTab?: boolean;
    classNameTabStrip?: string;
    config?: any;
    enableActiveIcon?: boolean;
    enableClose?: boolean;
    enableCloseButton?: boolean;
    enableDeleteWhenEmpty?: boolean;
    enableDivide?: boolean;
    enableDrag?: boolean;
    enableDrop?: boolean;
    enableMaximize?: boolean;
    enableSingleTabStretch?: boolean;
    enableTabGroups?: boolean;
    enableTabScrollbar?: boolean;
    enableTabStrip?: boolean;
    enableTabWrap?: boolean;
    id?: string;
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;
    name?: string;
    selected?: number;
    tabLocation?: ITabLocation;
    type?: string;
    weight?: number;
}

export interface ITabAttributes {
    altName?: string;
    borderHeight?: number;
    borderWidth?: number;
    className?: string;
    closeType?: ICloseType;
    component?: string;
    config?: any;
    contentClassName?: string;
    enableClose?: boolean;
    enableDrag?: boolean;
    enableFloat?: boolean;
    enableFloatIcon?: boolean;
    enablePin?: boolean;
    enablePopout?: boolean;
    enablePopoutIcon?: boolean;
    enablePopoutOverlay?: boolean;
    enableRename?: boolean;
    enableRenderOnDemand?: boolean;
    enableScrollbars?: boolean;
    enableWindowReMount?: boolean;
    helpText?: string;
    icon?: string;
    id?: string;
    maxHeight?: number;
    maxWidth?: number;
    minHeight?: number;
    minWidth?: number;
    name?: string;
    pinned?: boolean;
    subLayoutId?: string;
    tabsetClassName?: string;
    type?: string;
}

export interface IBorderAttributes {
    autoSelectTabWhenClosed?: boolean;
    autoSelectTabWhenOpen?: boolean;
    borderType?: string;
    className?: string;
    config?: any;
    enableAutoHide?: boolean;
    enableDrop?: boolean;
    enableTabScrollbar?: boolean;
    maxSize?: number;
    minSize?: number;
    selected?: number;
    show?: boolean;
    size?: number;
    type?: string;
}

export interface ITabGroupAttributes {
    color?: string;
    config?: any;
    enableDrag?: boolean;
    id?: string;
    name?: string;
    opened?: boolean;
    type?: string;
}

export interface ISubLayoutAttributes {
    name?: string;
}

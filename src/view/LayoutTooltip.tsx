import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

const TooltipContainerContext = React.createContext<HTMLElement | null>(null);

/** @internal */
export interface ILayoutTooltipProviderProps {
    /** portal target for tooltip content; popout windows must render into their own document */
    container?: HTMLElement | null;
    children: React.ReactNode;
}

/** @internal */
export const LayoutTooltipProvider = ({ container, children }: ILayoutTooltipProviderProps) => (
    <TooltipProvider>
        <TooltipContainerContext.Provider value={container ?? null}>{children}</TooltipContainerContext.Provider>
    </TooltipProvider>
);

/** @internal */
export interface ILayoutTooltipProps {
    /** tooltip text; when undefined the child is rendered without a tooltip */
    label?: string;
    children: React.ReactNode;
}

/** @internal */
export const LayoutTooltip = ({ label, children }: ILayoutTooltipProps) => {
    const container = React.useContext(TooltipContainerContext);

    if (label === undefined) {
        return <>{children}</>;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent container={container}>{label}</TooltipContent>
        </Tooltip>
    );
};

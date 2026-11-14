import * as React from "react";
import {
    Asterisk,
    ChevronDown,
    ExternalLink,
    Grip,
    Maximize2,
    Menu,
    Minimize2,
    PictureInPicture2,
    Pin,
    Plus,
    Settings,
    Triangle,
    X,
} from "lucide-react";

import { cn } from "../lib/utils";

// size-[1em] keeps the icon tied to the surrounding font size and opts out of the Button
// variants' `[&_svg:not([class*='size-'])]` fallback, which would force 1rem
const iconClassName = "size-[1em] shrink-0 text-[var(--fl-color-icon)]";

export const CloseIcon = () => <X aria-hidden="true" focusable="false" className={iconClassName} />;
CloseIcon.displayName = "CloseIcon"; // name in react dev tools

export const PinIcon = () => <Pin aria-hidden="true" focusable="false" className={iconClassName} />;
PinIcon.displayName = "PinIcon"; // name in react dev tools

export const MaximizeIcon = () => <Maximize2 aria-hidden="true" focusable="false" className={iconClassName} />;
MaximizeIcon.displayName = "MaximizeIcon"; // name in react dev tools

export const OverflowIcon = () => <ChevronDown aria-hidden="true" focusable="false" className={iconClassName} />;
OverflowIcon.displayName = "OverflowIcon"; // name in react dev tools

export const EdgeIcon = () => (
    // the edge rects are 10px wide, so this one is a fixed 10px rather than 1em
    <Triangle
        aria-hidden="true"
        focusable="false"
        className="size-2.5 shrink-0 rotate-180 fill-[var(--fl-color-edge-icon)] text-[var(--fl-color-edge-icon)]"
    />
);
EdgeIcon.displayName = "EdgeIcon"; // name in react dev tools

export const PopoutIcon = () => <ExternalLink aria-hidden="true" focusable="false" className={iconClassName} />;
PopoutIcon.displayName = "PopoutIcon"; // name in react dev tools

export const PopoutFloatIcon = () => <PictureInPicture2 aria-hidden="true" focusable="false" className={iconClassName} />;
PopoutFloatIcon.displayName = "PopoutFloatIcon"; // name in react dev tools

export const GripIcon = () => <Grip aria-hidden="true" focusable="false" className={iconClassName} />;
GripIcon.displayName = "GripIcon"; // name in react dev tools

export const RestoreIcon = () => <Minimize2 aria-hidden="true" focusable="false" className={iconClassName} />;
RestoreIcon.displayName = "RestoreIcon"; // name in react dev tools

export const AsterickIcon = () => <Asterisk aria-hidden="true" focusable="false" className={iconClassName} />;
AsterickIcon.displayName = "AsterickIcon"; // name in react dev tools

export const AddIcon = () => <Plus aria-hidden="true" focusable="false" className={iconClassName} />;
AddIcon.displayName = "AddIcon"; // name in react dev tools

export const MenuIcon = () => <Menu aria-hidden="true" focusable="false" className={iconClassName} />;
MenuIcon.displayName = "MenuIcon"; // name in react dev tools

export const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => {
    const { className, ...rest } = props;
    return <Settings aria-hidden="true" focusable="false" className={cn(iconClassName, className)} {...rest} />;
};
SettingsIcon.displayName = "SettingsIcon"; // name in react dev tools

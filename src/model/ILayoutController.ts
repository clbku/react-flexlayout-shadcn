import type { Model } from "./Model";
import type { Rect } from "./Rect";

/** The minimal controller surface the model needs from a mounted layout view. */
export interface ILayoutController {
    getModel(): Model;
    getLayoutRef(): HTMLElement | null;
    getCurrentWindow(): Window | undefined;
    getWindowId(): string | undefined;
    getDomRect(): Rect;
}

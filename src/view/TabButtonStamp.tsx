import { TabNode } from "../model/TabNode";
import { LayoutController } from "./layout/LayoutInternal";
import { CLASSES } from "../CSSClassNames";
import { getRenderStateEx } from "./Utils";
import { cn } from "../lib/utils";

/** @internal */
export interface ITabButtonStampProps {
    tabNode: TabNode;
    controller: LayoutController;
}

/** @internal */
export const TabButtonStamp = (props: ITabButtonStampProps) => {
    const { controller, tabNode } = props;

    const cm = controller.getClassName;

    const classNames = cn("inline-flex box-border items-center gap-[0.3em] whitespace-nowrap", cm(CLASSES.FLEXLAYOUT__TAB_BUTTON_STAMP));

    const renderState = getRenderStateEx(controller, tabNode);

    const content = renderState.content ? <div className={cn("flex whitespace-nowrap", cm(CLASSES.FLEXLAYOUT__TAB_BUTTON_CONTENT))}>{renderState.content}</div> : tabNode.getNameForOverflowMenu();

    const leading = renderState.leading ? <div className={cn("flex", cm(CLASSES.FLEXLAYOUT__TAB_BUTTON_LEADING))}>{renderState.leading}</div> : null;

    return (
        <div className={classNames} title={tabNode.getHelpText()}>
            {leading}
            {content}
        </div>
    );
};

TabButtonStamp.displayName = "TabButtonStamp"; // name in react dev tools

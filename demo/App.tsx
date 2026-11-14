import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Braces,
  Check,
  Copy,
  FileJson,
  Group,
  Languages,
  Maximize2,
  Moon,
  MoreHorizontal,
  PanelRight,
  Pin,
  PinOff,
  Plus,
  Redo2,
  RotateCcw,
  Sparkles,
  Sun,
  Undo2,
  Ungroup,
  X,
} from "lucide-react";

import {
  Actions,
  DockLocation,
  I18nLabelDefaults,
  Layout,
  Model,
  TabGroupNode,
  getNodeContextMenuItems,
  showPopupMenu,
  useUndo,
  type BorderNode,
  type ILayoutApi,
  type IJsonTabNode,
  type ITabRenderValues,
  type ITabSetRenderValues,
  type NodeMouseEvent,
  type TabNode,
  type TabSetNode,
} from "@/index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

import { initialLayout } from "./layout";
import { DemoTab, tabIcon } from "./panels";

const GROUP_COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

const VI_LABELS: Record<string, string> = {
  "flexlayout.ui.close.tab": "Đóng tab",
  "flexlayout.ui.pinned.tab": "Đã ghim",
  "flexlayout.ui.rename.tab": "Đổi tên tab",
  "flexlayout.ui.close.tabset": "Đóng nhóm tab",
  "flexlayout.ui.active.tabset": "Nhóm tab đang hoạt động",
  "flexlayout.ui.maximize.tabset": "Phóng to",
  "flexlayout.ui.restore.tabset": "Khôi phục",
  "flexlayout.ui.popout.tab": "Mở tab ra cửa sổ",
  "flexlayout.ui.popout.tab.float": "Thả tab thành cửa sổ nổi",
  "flexlayout.ui.popout.float.to.window": "Mở cửa sổ nổi ra cửa sổ trình duyệt",
  "flexlayout.ui.dock.float.to.layout": "Kéo vào bố cục",
  "flexlayout.ui.overflow.menu.tooltip": "Các tab bị ẩn",
  "flexlayout.ui.splitter": "Đổi kích thước",
  "flexlayout.ui.popout.window.name": "Cửa sổ tách",
  "flexlayout.ui.menu.rename": "Đổi tên",
  "flexlayout.ui.menu.pin": "Ghim",
  "flexlayout.ui.menu.unpin": "Bỏ ghim",
  "flexlayout.ui.menu.popout": "Mở cửa sổ",
  "flexlayout.ui.menu.float": "Cửa sổ nổi",
  "flexlayout.ui.menu.popout.tabset": "Mở nhóm tab ra cửa sổ",
  "flexlayout.ui.menu.float.tabset": "Thả nhóm tab thành cửa sổ nổi",
  "flexlayout.ui.menu.maximize": "Phóng to",
  "flexlayout.ui.menu.restore": "Khôi phục",
  "flexlayout.ui.menu.overlay": "Lớp phủ",
  "flexlayout.ui.menu.split": "Chia tách",
  "flexlayout.ui.menu.close.all": "Đóng tất cả",
  "flexlayout.ui.menu.close.right": "Đóng các tab bên phải",
  "flexlayout.ui.menu.close.others": "Đóng các tab khác",
  "flexlayout.ui.menu.add.to.new.group": "Thêm vào nhóm mới",
  "flexlayout.ui.menu.add.to.group": "Thêm vào nhóm",
  "flexlayout.ui.menu.remove.from.group": "Bỏ khỏi nhóm",
  "flexlayout.ui.menu.ungroup": "Bỏ nhóm",
  "flexlayout.ui.menu.expand": "Mở rộng",
  "flexlayout.ui.menu.collapse": "Thu gọn",
  "flexlayout.ui.group.pill.tooltip": "Nhóm tab, bấm để mở rộng/thu gọn",
  "flexlayout.ui.group.default.name": "Nhóm",
  "flexlayout.ui.error.rendering.component": "Lỗi khi hiển thị thành phần",
  "flexlayout.ui.error.rendering.component.retry": "Thử lại",
};

export default function App() {
  const history = useUndo(() => Model.fromJson(initialLayout));
  const model = history.model!;
  const layoutRef = useRef<ILayoutApi>(null);
  const counter = useRef(1);
  const groupCounter = useRef(1);

  const [dark, setDark] = useState(false);
  const [locale, setLocale] = useState<"en" | "vi">("en");
  const [lastAction, setLastAction] = useState("Model.fromJson");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [json, setJson] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const i18nTranslator = useMemo(() => {
    if (locale === "en") {
      return undefined;
    }
    return (key: string) => VI_LABELS[key] ?? I18nLabelDefaults[key] ?? key;
  }, [locale]);

  const factory = useCallback((node: TabNode) => <DemoTab node={node} model={model} />, [model]);

  const renderTab = useCallback((node: TabNode, values: ITabRenderValues) => {
    values.leading = tabIcon(node);
  }, []);

  const activeTab = model.getActiveTabset()?.getSelectedNode();

  const newTab = (): IJsonTabNode => ({
    type: "tab",
    name: `Untitled ${counter.current++}`,
    component: "counter",
  });

  const addTab = () => {
    const tab = newTab();
    if (layoutRef.current?.addTabToActiveTabSet(tab)) {
      return;
    }
    let firstTabset: TabSetNode | undefined;
    model.visitNodes((node) => {
      if (!firstTabset && node.getType() === "tabset") {
        firstTabset = node as TabSetNode;
      }
    });
    if (firstTabset) {
      model.doAction(Actions.addTab(tab, firstTabset.getId(), DockLocation.CENTER, -1, true));
    }
  };

  const addTabToTabSet = (tabset: TabSetNode | BorderNode) => {
    model.doAction(Actions.addTab(newTab(), tabset.getId(), DockLocation.CENTER, -1, true));
  };

  const renderTabSet = useCallback(
    (node: TabSetNode | BorderNode, values: ITabSetRenderValues) => {
      values.buttons.push(
        <Button
          key="__demo_add_tab__"
          type="button"
          size="icon-xs"
          variant="ghost"
          className="size-5"
          title="Add tab"
          aria-label="Add tab"
          onClick={() => addTabToTabSet(node)}
        >
          <Plus className="size-3.5" />
        </Button>,
      );
    },
    [model],
  );

  const handleContextMenu = useCallback<NodeMouseEvent>((node, event) => {
    // the event bubbles from tab to tabset: let the innermost node claim it
    if (event.defaultPrevented) {
      return;
    }
    event.preventDefault();
    let hide = () => {};
    const items = getNodeContextMenuItems(node, { closeMenu: () => hide() });
    if (items.length === 0) {
      return;
    }
    hide = showPopupMenu({
      anchor: { x: event.clientX, y: event.clientY },
      container: node.getLayoutRef() ?? undefined,
      title: "getName" in node ? node.getName() : undefined,
      items,
      onClose: () => {},
    });
  }, []);

  const togglePin = () => {
    if (activeTab) {
      model.doAction(Actions.setTabPinned(activeTab.getId(), !activeTab.isPinned()));
    }
  };

  const toggleGroup = () => {
    if (!activeTab) {
      return;
    }
    const parent = activeTab.getParent();
    if (parent instanceof TabGroupNode) {
      model.doAction(Actions.ungroup(parent.getId()));
    } else {
      const index = groupCounter.current++;
      model.doAction(
        Actions.addTabToNewGroup(
          activeTab.getId(),
          `Group ${index}`,
          GROUP_COLORS[index % GROUP_COLORS.length],
        ),
      );
    }
  };

  const floatTab = () => {
    if (activeTab) {
      model.doAction(Actions.popoutTab(activeTab.getId(), "float"));
    }
  };

  const popoutTab = () => {
    if (activeTab) {
      model.doAction(Actions.popoutTab(activeTab.getId(), "window"));
    }
  };

  const newFloatPanel = () => {
    model.doAction(
      Actions.createSubLayout(
        {
          type: "row",
          children: [
            {
              type: "tabset",
              weight: 100,
              selected: 0,
              children: [{ type: "tab", name: "Scratch pad", component: "notes" }],
            },
          ],
        },
        { x: 160, y: 140, width: 420, height: 280 },
        "float",
      ),
    );
  };

  const rightBorder = () =>
    model.getBorderSet().getBorders().find((border) => border.getLocation() === DockLocation.RIGHT);

  const addBorderTab = () => {
    const border = rightBorder();
    if (border) {
      model.doAction(
        Actions.addTab(
          { type: "tab", name: `Panel ${counter.current++}`, component: "outline" },
          border.getId(),
          DockLocation.CENTER,
          -1,
          true,
        ),
      );
    }
  };

  const toggleBorderType = () => {
    const border = rightBorder();
    if (border) {
      model.doAction(
        Actions.setBorderType(border.getId(), border.getBorderType() === "overlay" ? "split" : "overlay"),
      );
    }
  };

  const showJson = () => {
    setJson(JSON.stringify(model.toJson(), null, 2));
    setJsonOpen(true);
    setCopied(false);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard can be blocked by the browser
    }
  };

  const reset = () => {
    history.setModel(Model.fromJson(initialLayout));
    counter.current = 1;
    groupCounter.current = 1;
    setLastAction("Model.fromJson");
    setJsonOpen(false);
  };

  let tabCount = 0;
  model.visitNodes((node) => {
    if (node.getType() === "tab") {
      tabCount += 1;
    }
  });

  const inGroup = activeTab?.getParent() instanceof TabGroupNode;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:gap-3 sm:px-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Braces className="size-4" />
        </div>
        <div className="hidden min-w-0 sm:block">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold">react-flexlayout-shadcn</h1>
            <Badge variant="secondary" className="h-5 text-[10px]">
              shadcn/ui
            </Badge>
            <Badge variant="outline" className="hidden h-5 text-[10px] lg:inline-flex">
              0.11.1 parity
            </Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            Docking · borders · groups · floats · popouts · undo
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={history.undo}
            disabled={!history.canUndo}
            aria-label="Undo"
            title={`Undo (${history.undoCount})`}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={history.redo}
            disabled={!history.canRedo}
            aria-label="Redo"
            title={`Redo (${history.redoCount})`}
          >
            <Redo2 className="size-4" />
          </Button>
          <Separator orientation="vertical" className="mx-0.5 h-6" />
          <Button size="sm" variant="outline" onClick={addTab}>
            <Plus className="size-3.5" />
            <span className="hidden md:inline">Add tab</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label="Layout actions">
                <MoreHorizontal className="size-3.5" />
                <span className="hidden md:inline">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Selected tab</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!activeTab}
                onSelect={() => activeTab && layoutRef.current?.editTabName(activeTab.getId())}
              >
                <Sparkles className="size-4" />
                Rename
                <DropdownMenuShortcut>F2</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!activeTab} onSelect={togglePin}>
                {activeTab?.isPinned() ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                {activeTab?.isPinned() ? "Unpin tab" : "Pin tab"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!activeTab} onSelect={toggleGroup}>
                {inGroup ? <Ungroup className="size-4" /> : <Group className="size-4" />}
                {inGroup ? "Ungroup tab" : "Group tab"}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!activeTab} onSelect={floatTab}>
                <PanelRight className="size-4" />
                Float tab
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!activeTab} onSelect={popoutTab}>
                <Maximize2 className="size-4" />
                Popout tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Panels</DropdownMenuLabel>
              <DropdownMenuItem onSelect={newFloatPanel}>
                <PanelRight className="size-4" />
                New floating panel
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={addBorderTab}>
                <PanelRight className="size-4" />
                Add border tab
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleBorderType}>
                <PanelRight className="size-4" />
                Toggle right border overlay
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={showJson}>
            <FileJson className="size-3.5" />
            <span className="hidden lg:inline">JSON</span>
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            <RotateCcw className="size-3.5" />
            <span className="hidden lg:inline">Reset</span>
          </Button>
          <Separator orientation="vertical" className="mx-0.5 h-6" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocale((value) => (value === "en" ? "vi" : "en"))}
            title="Toggle i18n translator"
          >
            <Languages className="size-3.5" />
            {locale === "en" ? "EN" : "VI"}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setDark((value) => !value)}
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 p-2">
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-border/70">
          <Layout
            ref={layoutRef}
            model={model}
            factory={factory}
            i18nTranslator={i18nTranslator}
            onRenderTab={renderTab}
            onRenderTabSet={renderTabSet}
            onContextMenu={handleContextMenu}
            onModelChange={(_model, action) => setLastAction(action.type)}
            onTabSetPlaceHolder={() => (
              <div className="flex h-full items-center justify-center p-6 text-xs text-muted-foreground">
                Drop tabs here
              </div>
            )}
          />
        </div>

        {jsonOpen ? (
          <div className="absolute inset-x-3 bottom-3 z-40 flex h-[55%] flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
            <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
              <FileJson className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium">Layout JSON</span>
              <span className="text-[11px] text-muted-foreground">model.toJson()</span>
              <div className="ml-auto flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copyJson}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Close JSON"
                  onClick={() => setJsonOpen(false)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <pre className="p-4 font-mono text-[11px] leading-relaxed">
                {json}
              </pre>
            </ScrollArea>
          </div>
        ) : null}
      </main>

      <footer className="flex h-8 shrink-0 items-center gap-3 border-t bg-background px-3 text-[11px] text-muted-foreground sm:px-4">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {lastAction}
        </span>
        <span className="hidden sm:inline">
          F2 rename · Ctrl+Delete close · drag to dock/split · right-click for the context menu
        </span>
        <span className="ml-auto hidden md:inline">
          {tabCount} tabs · undo {history.undoCount}
        </span>
      </footer>
    </div>
  );
}

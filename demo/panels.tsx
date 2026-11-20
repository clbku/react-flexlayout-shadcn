import { useState } from "react";
import {
  Check,
  ChevronRight,
  CircleCheck,
  Code2,
  Copy,
  FileCode2,
  FileText,
  Folder,
  Hash,
  History,
  Info,
  Keyboard,
  Layers,
  ListTree,
  Palette,
  Search,
  StickyNote,
  Terminal,
  TriangleAlert,
} from "lucide-react";

import { Model, type TabGroupNode, type TabNode } from "@/index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const APP_CODE = `import { useMemo, useRef } from "react";
import {
  Actions,
  Layout,
  Model,
  useUndo,
  type IJsonModel,
  type ILayoutApi,
  type TabNode,
} from "react-flexlayout-shadcn";

import { initialLayout } from "./layout";

export default function App() {
  // undo/redo snapshots are captured before every action
  const history = useUndo(() => Model.fromJson(initialLayout));
  const model = history.model!;
  const layout = useRef<ILayoutApi>(null);

  const factory = useMemo(
    () => (node: TabNode) => <Panel node={node} />,
    [],
  );

  const addTab = () => {
    layout.current?.addTabToActiveTabSet({
      type: "tab",
      name: "Untitled",
      component: "counter",
    });
  };

  return (
    <>
      <Toolbar onAdd={addTab} onUndo={history.undo} onRedo={history.redo} />
      <Layout ref={layout} model={model} factory={factory} />
    </>
  );
}`;

const LAYOUT_CODE = `import { Actions, DockLocation, Model, type IJsonModel } from "react-flexlayout-shadcn";

const layout: IJsonModel = {
  global: {
    enableEdgeDock: true,
    tabEnableFloat: true,
    tabEnablePopout: true,
    tabSetEnableTabGroups: true,
  },
  borders: [
    {
      location: "right",
      size: 240,
      children: [{ type: "tab", name: "Outline", component: "outline" }],
    },
  ],
  layout: {
    type: "row",
    weight: 100,
    children: [
      { type: "tabset", weight: 30, children: [{ type: "tab", name: "Explorer" }] },
      {
        type: "tabset",
        weight: 70,
        active: true,
        children: [
          { type: "tab", name: "Editor", component: "code" },
          {
            type: "tabgroup",
            name: "Docs",
            color: "#0ea5e9",
            children: [{ type: "tab", name: "README.md", component: "readme" }],
          },
        ],
      },
    ],
  },
};

const model = Model.fromJson(layout);

// Every change goes through an action:
model.doAction(Actions.selectTab(tabId));
model.doAction(Actions.moveNode(tabId, tabsetId, DockLocation.RIGHT, -1, true));
model.doAction(Actions.addTabToNewGroup(tabId, "Docs", "#0ea5e9"));
model.doAction(Actions.ungroup(groupId));
model.doAction(Actions.popoutTab(tabId, "float"));   // floating panel
model.doAction(Actions.popoutTab(tabId, "window"));  // native popout window
model.doAction(Actions.createSubLayout(floatRow, rect, "float"));
model.doAction(Actions.maximizeToggle(tabsetId));
model.doAction(Actions.deleteTab(tabId));`;

export function DemoTab({ node, model }: { node: TabNode; model: Model }) {
  switch (node.getComponent()) {
    case "files":
      return <FilesPanel />;
    case "search":
      return <SearchPanel />;
    case "code":
      return <CodePanel file={((node.getConfig() as { file?: string } | undefined)?.file) ?? node.getName()} />;
    case "readme":
      return <ReadmePanel />;
    case "counter":
      return <CounterPanel />;
    case "inspector":
      return <InspectorPanel node={node} model={model} />;
    case "styles":
      return <StylesPanel />;
    case "terminal":
      return <TerminalPanel />;
    case "problems":
      return <ProblemsPanel />;
    case "output":
      return <OutputPanel />;
    case "outline":
      return <OutlinePanel />;
    case "timeline":
      return <TimelinePanel />;
    case "notes":
      return <NotesPanel />;
    case "features":
      return <FeaturesPanel />;
    case "changelog":
      return <ChangelogPanel />;
    default:
      return <PlaceholderPanel node={node} />;
  }
}

const FILES = [
  { name: "src", kind: "folder", depth: 0 },
  { name: "components", kind: "folder", depth: 1 },
  { name: "layout", kind: "folder", depth: 2 },
  { name: "Layout.tsx", kind: "code", depth: 3, selected: true },
  { name: "TabSetView.tsx", kind: "code", depth: 3 },
  { name: "Splitter.tsx", kind: "code", depth: 3 },
  { name: "model", kind: "folder", depth: 2 },
  { name: "Model.ts", kind: "code", depth: 3 },
  { name: "Actions.ts", kind: "code", depth: 3 },
  { name: "ui", kind: "folder", depth: 1 },
  { name: "button.tsx", kind: "code", depth: 2 },
  { name: "context-menu.tsx", kind: "code", depth: 2 },
  { name: "README.md", kind: "text", depth: 0 },
  { name: "package.json", kind: "text", depth: 0 },
] as const;

function FilesPanel() {
  return (
    <div className="min-h-full p-2">
      <div className="mb-2 flex items-center justify-between px-2 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <Badge variant="secondary" className="text-[10px]">
          demo
        </Badge>
      </div>
      <div className="space-y-px">
        {FILES.map((file) => (
          <div
            key={`${file.depth}-${file.name}`}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs",
              "selected" in file && file.selected
                ? "bg-secondary font-medium text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            style={{ paddingLeft: 8 + file.depth * 12 }}
          >
            {file.kind === "folder" ? (
              <Folder className="size-3.5 shrink-0 text-amber-500" />
            ) : file.kind === "code" ? (
              <FileCode2 className="size-3.5 shrink-0 text-sky-500" />
            ) : (
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{file.name}</span>
            {file.kind === "folder" ? (
              <ChevronRight className="ml-auto size-3 text-muted-foreground/60" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchPanel() {
  const [query, setQuery] = useState("");
  const results = [
    { file: "Layout.tsx", matches: 8 },
    { file: "TabSetView.tsx", matches: 5 },
    { file: "Model.ts", matches: 3 },
    { file: "README.md", matches: 2 },
  ].filter((result) => result.file.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the layout…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 p-2">
        <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {results.length} results
        </p>
        <div className="space-y-1">
          {results.map((result) => (
            <div
              key={result.file}
              className="flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs hover:border-border hover:bg-muted/40"
            >
              <FileCode2 className="size-3.5 text-sky-500" />
              <span className="truncate">{result.file}</span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                {result.matches}
              </Badge>
            </div>
          ))}
          {results.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No matches.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CodePanel({ file }: { file: string }) {
  const [copied, setCopied] = useState(false);
  const code = file === "Layout.tsx" ? LAYOUT_CODE : APP_CODE;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable in some browsers
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileCode2 className="size-3.5 text-sky-500" />
          <span>{file}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={copy}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <pre className="p-4 font-mono text-[12px] leading-relaxed">
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

function ReadmePanel() {
  return (
    <div className="mx-auto min-h-full max-w-2xl p-6">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">react-flexlayout-shadcn</Badge>
        <Badge variant="outline">v0.1.0</Badge>
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Dockable layouts, built from shadcn/ui
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        A feature-complete port of the flexlayout-react model and interactions, rendered with the
        shadcn/ui component set and Tailwind CSS. It supports docking, edge splits, borders, tab
        groups, pinned tabs, native popouts, floating panels, sub-layouts and undo/redo.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          "Row / tabset / tab model",
          "Border bars with overlay mode",
          "Tab groups with colored pills",
          "Pinned tabs and inline rename",
          "Popouts, floats and TabLayout",
          "Drag, split and edge docking",
          "Keyboard map and i18n labels",
          "Undo/redo and JSON import",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <CircleCheck className="size-4 text-emerald-500" />
            {feature}
          </div>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Try it</CardTitle>
          <CardDescription className="text-xs">
            Drag a tab onto another tab set to dock it. Drop near an edge to split. Right-click for
            the context menu, press F2 to rename, Ctrl+Delete to close, and double-click a tab strip
            to maximize. Use the Actions menu for groups, floats, popouts and border overlays.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed text-muted-foreground">
          The toolbar demonstrates the imperative API with a real undo stack, a JSON dump, a reset,
          an EN/VI translator, and the light/dark shadcn theme.
        </CardContent>
      </Card>
    </div>
  );
}

function CounterPanel() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <Badge variant="secondary">Stateful tab</Badge>
      <div className="text-6xl font-semibold tabular-nums tracking-tight">{count}</div>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        Inactive tabs stay mounted, so switching tabs keeps this counter alive. Drag the tab
        within its tab set to reorder it.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setCount((value) => value + 1)}>
          Increment
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCount(0)}>
          Reset
        </Button>
      </div>
    </div>
  );
}

function InspectorPanel({ node, model }: { node: TabNode; model: Model }) {
  let tabs = 0;
  let tabsets = 0;
  let rows = 0;
  let groups = 0;
  model.visitNodes((current) => {
    if (current.getType() === "tab") tabs += 1;
    else if (current.getType() === "tabset") tabsets += 1;
    else if (current.getType() === "tabgroup") groups += 1;
    else rows += 1;
  });

  let floats = 0;
  for (const [id, layout] of model.getLayouts()) {
    if (id !== Model.MAIN_LAYOUT_ID && layout.getType() === "float") floats += 1;
  }

  const activeTabset = model.getActiveTabset();
  const selectedTab = activeTabset?.getSelectedNode();
  const parent = node.getParent();
  const rightBorder = model
    .getBorderSet()
    .getBorders()
    .find((border) => border.getLocation().getName() === "right");
  const entries = [
    ["This tab", node.getName()],
    ["Pinned", node.isPinned() ? "yes" : "no"],
    ["In group", parent?.getType() === "tabgroup" ? (parent as TabGroupNode).getName() : "—"],
    ["Selected tab", selectedTab?.getName() ?? "—"],
    ["Active tab set", activeTabset?.getId() ?? "—"],
    ["Tabs", String(tabs)],
    ["Tab sets", String(tabsets)],
    ["Rows", String(rows)],
    ["Tab groups", String(groups)],
    ["Borders", String(model.getBorderSet().getBorders().length)],
    ["Right border", rightBorder ? rightBorder.getBorderType() : "—"],
    ["Floating panels", String(floats)],
    ["Root orientation", model.getRootRow()?.getOrientation().getName() ?? "—"],
    ["Splitter size", `${model.getSplitterSize()}px`],
    ["Maximized", model.getMaximizedTabset()?.getId() ?? "none"],
  ];

  return (
    <div className="min-h-full p-4">
      <div className="mb-3 flex items-center gap-2">
        <Info className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Layout inspector</h2>
      </div>
      <Card>
        <CardContent className="divide-y p-0 text-xs">
          {entries.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2">
              <span className="text-muted-foreground">{label}</span>
              <span className="truncate font-mono text-[11px]">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StylesPanel() {
  const tokens = [
    { name: "background", className: "bg-background text-foreground" },
    { name: "card", className: "bg-card text-card-foreground" },
    { name: "muted", className: "bg-muted text-muted-foreground" },
    { name: "secondary", className: "bg-secondary text-secondary-foreground" },
    { name: "accent", className: "bg-accent text-accent-foreground" },
    { name: "primary", className: "bg-primary text-primary-foreground" },
    { name: "destructive", className: "bg-destructive text-destructive-foreground" },
  ];

  return (
    <div className="min-h-full p-4">
      <div className="mb-3 flex items-center gap-2">
        <Palette className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">shadcn theme tokens</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {tokens.map((token) => (
          <div
            key={token.name}
            className={cn("rounded-lg border p-3 text-xs shadow-xs", token.className)}
          >
            <p className="font-medium">{token.name}</p>
            <p className="mt-1 opacity-70">Themed by CSS variables</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TerminalPanel() {
  return (
    <div className="min-h-full bg-zinc-950 p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
      <p>
        <span className="text-emerald-400">➜</span> <span className="text-sky-400">~/layout</span>{" "}
        npm run build
      </p>
      <p className="text-zinc-500">CLI tsup v9.0.0</p>
      <p>ESM dist/index.js 410.00 KB</p>
      <p>DTS dist/index.d.ts 112.00 KB</p>
      <p className="text-emerald-400">Build success in 112ms</p>
      <p className="mt-3">
        <span className="text-emerald-400">➜</span>{" "}
        <span className="text-sky-400">~/layout</span> npm run dev
      </p>
      <p className="text-zinc-500">VITE v8.3.8 ready in 210 ms</p>
      <p>
        <span className="text-emerald-400">➜</span> Local:{" "}
        <span className="underline decoration-zinc-600">http://localhost:5173/</span>
      </p>
      <p className="mt-3 flex items-center gap-1 text-zinc-500">
        <span className="inline-block h-3 w-1.5 animate-pulse bg-zinc-400" />
      </p>
    </div>
  );
}

const PROBLEMS = [
  {
    severity: "warning",
    file: "demo/layout.ts",
    line: 22,
    message: "'tabEnablePopoutIcon' is disabled to keep the tab strip compact.",
  },
  {
    severity: "warning",
    file: "demo/App.tsx",
    line: 1,
    message: "This demo uses the full public API surface of the library.",
  },
  {
    severity: "info",
    file: "README.md",
    line: 1,
    message: "Borders, tab groups, popouts and floating panels are supported.",
  },
] as const;

function ProblemsPanel() {
  return (
    <div className="min-h-full p-2">
      <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
        <TriangleAlert className="size-3.5 text-amber-500" />
        2 warnings, 1 info
      </div>
      <div className="mt-1 space-y-1">
        {PROBLEMS.map((problem) => (
          <div
            key={`${problem.file}-${problem.line}`}
            className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
          >
            {problem.severity === "warning" ? (
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            ) : (
              <Info className="mt-0.5 size-3.5 shrink-0 text-sky-500" />
            )}
            <div className="min-w-0">
              <p className="truncate">{problem.message}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {problem.file}:{problem.line}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputPanel() {
  const lines = [
    "[info] Model.fromJson() → borders, tab group, pinned tab",
    "[info] Layout mounted with useUndo() history",
    "[action] FlexLayout_SetActiveTabset",
    "[action] FlexLayout_SelectTab",
    "[action] FlexLayout_AddTabToNewGroup",
    "[action] FlexLayout_PopoutTab",
    "[action] FlexLayout_AdjustWeights",
    "[ready] F2 rename · Ctrl+Delete close · right-click for menus",
  ];

  return (
    <div className="min-h-full p-3 font-mono text-[11px] leading-relaxed">
      {lines.map((line, index) => (
        <p key={line} className={cn(index === lines.length - 1 && "text-muted-foreground")}>
          <span className="mr-2 text-muted-foreground/60">
            {String(index + 1).padStart(2, "0")}
          </span>
          {line}
        </p>
      ))}
    </div>
  );
}

function FeaturesPanel() {
  const groups = [
    {
      title: "Docking",
      icon: <Layers className="size-3.5 text-sky-500" />,
      items: ["Drag tabs and tabsets", "Drop on edges to split", "Border bars + overlay", "Floating panels"],
    },
    {
      title: "Tabs",
      icon: <StickyNote className="size-3.5 text-amber-500" />,
      items: ["Pinned tabs", "Tab groups (splitpill)", "Inline rename", "Overflow menu"],
    },
    {
      title: "Keyboard",
      icon: <Keyboard className="size-3.5 text-emerald-500" />,
      items: ["F2 — rename", "Ctrl+Delete — close", "Escape — close overlay", "Arrow keys — move focus"],
    },
    {
      title: "Model",
      icon: <Code2 className="size-3.5 text-violet-500" />,
      items: ["27 action types", "JSON round-trip", "Undo/redo history", "i18n translator"],
    },
  ];

  return (
    <div className="min-h-full p-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Feature coverage</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs">
                {group.icon}
                {group.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              {group.items.map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CircleCheck className="size-3.5 text-emerald-500" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const OUTLINE = [
  { name: "<App>", depth: 0, kind: "component" },
  { name: "useUndo(initialLayout)", depth: 1, kind: "hook" },
  { name: "<header>", depth: 1, kind: "element" },
  { name: "<Layout>", depth: 1, kind: "element" },
  { name: "factory", depth: 2, kind: "prop" },
  { name: "onRenderTabSet", depth: 2, kind: "prop" },
  { name: "i18nTranslator", depth: 2, kind: "prop" },
  { name: "<footer>", depth: 1, kind: "element" },
] as const;

function OutlinePanel() {
  return (
    <div className="h-full min-h-full p-2">
      <div className="mb-2 flex items-center gap-2 px-2 py-1">
        <ListTree className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Outline
        </span>
      </div>
      <div className="space-y-px">
        {OUTLINE.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            style={{ paddingLeft: 8 + entry.depth * 12 }}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                entry.kind === "component"
                  ? "bg-sky-500"
                  : entry.kind === "hook"
                    ? "bg-violet-500"
                    : entry.kind === "prop"
                      ? "bg-amber-500"
                      : "bg-muted-foreground/40",
              )}
            />
            <span className="truncate">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TIMELINE = [
  { time: "09:12", label: "Model.fromJson", detail: "layout, borders and sub-layouts restored" },
  { time: "09:13", label: "SelectTab", detail: "active tab set tracked by the model" },
  { time: "09:15", label: "AddTabToNewGroup", detail: "Docs group created with a color pill" },
  { time: "09:18", label: "AdjustWeights", detail: "splitter drag collapsed into one undo step" },
  { time: "09:21", label: "PopoutTab", detail: "tab moved into a floating panel" },
] as const;

function TimelinePanel() {
  return (
    <div className="min-h-full p-3">
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
        <History className="size-3.5" />
        Session timeline
      </div>
      <div className="space-y-3">
        {TIMELINE.map((entry) => (
          <div key={entry.time} className="flex gap-2">
            <span className="w-9 shrink-0 pt-0.5 text-right font-mono text-[10px] text-muted-foreground">
              {entry.time}
            </span>
            <div className="relative flex-1 border-l border-border pb-1 pl-3">
              <span className="absolute -left-1 top-1 size-2 rounded-full bg-primary" />
              <p className="font-mono text-[11px]">{entry.label}</p>
              <p className="text-[11px] text-muted-foreground">{entry.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotesPanel() {
  const [note, setNote] = useState(
    "Pinned tabs stay at the start of their tab strip.\n\nThe right border can switch between split and overlay modes from the Actions menu.\n\nFloating panels can be docked back by dragging their header.",
  );

  return (
    <div className="flex min-h-full flex-col p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <StickyNote className="size-3.5" />
        Scratch notes
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="min-h-40 w-full flex-1 resize-none rounded-md border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

const CHANGELOG = [
  {
    version: "0.1.0",
    entries: [
      "Full flexlayout-react 0.11.1 model and view engine",
      "shadcn/ui theme tokens and chrome styling",
      "Borders, tab groups, pinning and inline rename",
      "Popouts, floats, sub-layouts and TabLayout",
    ],
  },
  {
    version: "0.0.1",
    entries: ["Initial row / tabset / tab layout", "Drag, split, maximize and JSON round-trip"],
  },
] as const;

function ChangelogPanel() {
  return (
    <div className="mx-auto min-h-full max-w-2xl p-6">
      <h1 className="text-lg font-semibold tracking-tight">Changelog</h1>
      <p className="mt-1 text-xs text-muted-foreground">Recent changes in the demo library.</p>
      <div className="mt-5 space-y-5">
        {CHANGELOG.map((release) => (
          <div key={release.version}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                v{release.version}
              </Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {release.entries.map((entry) => (
                <li key={entry} className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPanel({ node }: { node: TabNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Code2 className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium">{node.getName()}</p>
      <p className="text-xs text-muted-foreground">
        Unknown component: {node.getComponent() ?? "none"}
      </p>
    </div>
  );
}

export function tabIcon(node: TabNode, className: string) {
  switch (node.getComponent()) {
    case "files":
      return <Folder className={cn(className, "text-amber-500")} />;
    case "search":
      return <Search className={className} />;
    case "code":
      return <FileCode2 className={cn(className, "text-sky-500")} />;
    case "readme":
      return <FileText className={className} />;
    case "counter":
      return <Hash className={className} />;
    case "terminal":
      return <Terminal className={cn(className, "text-emerald-500")} />;
    case "problems":
      return <TriangleAlert className={cn(className, "text-amber-500")} />;
    case "styles":
      return <Palette className={className} />;
    case "inspector":
      return <Info className={className} />;
    case "features":
      return <Layers className={className} />;
    case "outline":
      return <ListTree className={className} />;
    case "timeline":
      return <History className={className} />;
    case "notes":
      return <StickyNote className={cn(className, "text-amber-500")} />;
    case "changelog":
      return <FileText className={className} />;
    default:
      return null;
  }
}

# react-flexlayout-shadcn

A drop-in React port of [flexlayout-react](https://github.com/caplin/FlexLayout) 0.11.1 — the multi-tab docking layout manager — restyled for [shadcn/ui](https://ui.shadcn.com) themes and Tailwind CSS v4.

The engine, view layer, JSON format, `Actions` API, drag-and-drop behaviour, keyboard map and popout/float semantics are ported from upstream flexlayout-react 0.11.1, so existing layout JSON and action-driven code port over unchanged. The chrome (tab strips, borders, menus, splitters, floating windows) keeps upstream's DOM structure and class names but is built from shadcn/ui components and Tailwind utilities, styled through the shadcn design tokens for light and dark themes.

```tsx
const model = Model.fromJson(json);
model.doAction(Actions.selectTab(tabId));
```

## Features

**Layout model**

- Row / tab set / tab / tab group tree with full JSON round-tripping (`Model.fromJson`, `model.toJson()`)
- Borders on all four edges with tab strips, split or overlay mode, drag-to-size and auto-hide
- Tab groups (`splitpill` and `underline`) with colour, collapse/expand, rename and drag between groups
- Pinned tabs, per-tab close types, per-node enable flags, attribute inheritance from `global`
- Sub-layouts rendered inside a tab (`TabLayout`), floating panels and native popout windows
- Weight-based splitter resize with live model updates and optional realtime re-layout

**Interaction**

- HTML5 drag-and-drop: reorder, move between tab sets, edge dock to split, drop into borders, external drag-in
- Edge dock indicators, drag rectangles, drag images and drop placeholders
- Tab overflow handling with a "hidden tabs" menu when a tab strip is too narrow
- Inline tab rename (double-click, `F2`, or the imperative `editTabName`), group rename
- Keyboard map (`Ctrl+Delete` close, `F2` rename, `Escape` close overlay border) with configurable bindings
- Full context menu (pin, float, popout, rename, maximize, close all/right/others, groups, border type, expand/collapse)
- `onAction` interception, `onModelChange`, render hooks, custom icons, `classNameMapper`, i18n translator
- Error boundary around tab content with retry

**Helpers**

- `useUndo` hook: snapshot-based undo/redo that preserves mounted tab content, collapsing drag gestures into one step
- `PopupMenu` and `ContextMenuBuilder` for building custom menus with the same look
- Exported `CLASSES` constants for every CSS class, `I18nLabel` / `I18nLabelDefaults`, `defaultKeyMap`

## Requirements

- React 18 or 19 (`react`, `react-dom` are peer dependencies)
- A Tailwind CSS v4 app configured with the standard shadcn/ui CSS variables — the chrome is styled with Tailwind utility classes, so Tailwind must scan the library build (see below)

## Install

```bash
npm install react-flexlayout-shadcn
```

## Tailwind / shadcn setup

The components use shadcn tokens (`background`, `foreground`, `primary`, `muted`, `border`, `ring`, …), so the host app must provide a shadcn theme. `npx shadcn@latest init` produces the needed variables.

Tailwind does not scan `node_modules` by default, so add the library build to the source scan in your CSS entry point. This also generates the utilities used by popup menus, floating windows and drag previews, which render through portals and imperative DOM outside your own JSX:

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));
@source "../node_modules/react-flexlayout-shadcn/dist";
```

Then import the library stylesheet once in your app entry, next to the shadcn theme:

```ts
import "react-flexlayout-shadcn/style.css";
```

It contains only the shadcn token mapping (`flexlayout-theme.css`, which maps the `--fl-*` variables used by the Tailwind utilities) and supports light/dark via the `.dark` class. Import it before your own overrides so the variables can be restyled. All geometry and chrome come from the generated Tailwind utilities.

If you do not use shadcn already, [`src/styles/theme.css`](src/styles/theme.css) is a complete reference: it maps the shadcn variables with `@theme inline`, defines `:root` / `.dark` values, and applies the base `border-border` / `bg-background` styles.

## Quick start

```tsx
import "react-flexlayout-shadcn/style.css";

import { useCallback, useRef } from "react";
import {
  Layout,
  Model,
  useUndo,
  type IJsonModel,
  type ILayoutApi,
  type TabNode,
} from "react-flexlayout-shadcn";

const initialLayout: IJsonModel = {
  global: { enableEdgeDock: true },
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 30,
        children: [{ type: "tab", name: "Files", component: "files" }],
      },
      {
        type: "tabset",
        weight: 70,
        active: true,
        children: [{ type: "tab", name: "Editor", component: "editor" }],
      },
    ],
  },
};

export default function App() {
  const history = useUndo(() => Model.fromJson(initialLayout));
  const model = history.model!;
  const layout = useRef<ILayoutApi>(null);

  const factory = useCallback((node: TabNode) => {
    switch (node.getComponent()) {
      case "files":
        return <FileTree />;
      case "editor":
        return <Editor />;
      default:
        return null;
    }
  }, []);

  return (
    <>
      <Toolbar onUndo={history.undo} onRedo={history.redo} />
      <Layout ref={layout} model={model} factory={factory} />
    </>
  );
}
```

`active: true` marks which tab set receives focus initially (it seeds `model.getActiveTabset()`, which the imperative `addTabToActiveTabSet` API and the toolbar actions use).

## Layout JSON

Rows and tab sets use weights to divide space along their parent row's axis. Root rows lay out horizontally; nested rows alternate orientation by depth (`rootOrientationVertical` flips the root).

```json
{
  "global": {
    "enableEdgeDock": true,
    "tabEnableFloat": true,
    "tabEnablePopout": true,
    "tabSetEnableTabGroups": true,
    "borderSize": 230
  },
  "borders": [
    {
      "location": "right",
      "size": 240,
      "selected": 0,
      "children": [{ "type": "tab", "name": "Outline", "component": "outline", "enableClose": false }]
    }
  ],
  "layout": {
    "type": "row",
    "weight": 100,
    "children": [
      {
        "type": "tabset",
        "weight": 30,
        "selected": 0,
        "children": [{ "type": "tab", "name": "Explorer", "component": "files" }]
      },
      {
        "type": "tabset",
        "weight": 70,
        "active": true,
        "children": [
          { "type": "tab", "name": "App.tsx", "component": "code", "config": { "file": "App.tsx" } },
          {
            "type": "tabgroup",
            "name": "Docs",
            "color": "#0ea5e9",
            "opened": true,
            "children": [{ "type": "tab", "name": "README.md", "component": "readme" }]
          }
        ]
      }
    ]
  }
}
```

- `borders` accept `top` / `bottom` / `left` / `right` with `size`, `minSize`, `maxSize`, `borderType` (`split` / `overlay`), `enableAutoHide` and `children` (tabs or tab groups).
- A tab can render a nested layout with `"subLayout"` JSON plus a `component` that renders `<TabLayout tabNode={node} />`.
- `global` supports the upstream attribute set: `tabEnableClose`, `tabEnableDrag`, `tabEnableRename`, `tabEnablePin`, `tabEnableFloat`, `tabEnablePopout`, `tabSetEnableMaximize`, `tabSetEnableClose`, `tabSetEnableTabGroups`, `tabSetEnableTabStrip`, `tabGroupType`, `borderEnableAutoHide`, `rootOrientationVertical`, `splitterSize`, etc.

## Actions

Every change goes through `model.doAction(...)`:

`addTab` / `addNode`, `moveNode`, `deleteTab`, `deleteTabset`, `renameTab`, `setTabPinned`, `setBorderType`, `selectTab`, `setActiveTabset`, `adjustWeights`, `adjustBorderSplit`, `maximizeToggle`, `updateModelAttributes`, `updateNodeAttributes`, `updateSubLayoutAttributes`, `popoutTab`, `popoutTabset`, `closePopout`, `movePopoutToFront`, `moveFloat`, `popoutFloat`, `dockFloatToLayout`, `createPopout`, `createSubLayout`, `addTabToNewGroup`, `ungroup`, `removeTabFromGroup`, and `group([...actions])` to apply several actions as one model pass (one undo step).

```ts
model.doAction(Actions.popoutTab(tabId, "float"));   // floating panel
model.doAction(Actions.popoutTab(tabId, "window"));  // native popout window
model.doAction(Actions.addTabToNewGroup(tabId, "Docs", "#0ea5e9"));
model.doAction(Actions.setBorderType(borderId, "overlay"));
```

Drag resizes dispatch their actions with `setAdjusting(true)` and finish with `setAdjusting(false)`, so undo history and `onModelChange` see a single gesture.

## `<Layout />` props

| Prop | Description |
| --- | --- |
| `model` | The `Model` to render |
| `factory` | `(node: TabNode) => ReactNode` — tab content |
| `keyMap` | Command shortcuts merged over `defaultKeyMap`; `undefined` disables a binding |
| `icons` | Custom icons for close, pin, maximize, restore, overflow, popout, float |
| `onAction` | Intercept actions; return `undefined` to cancel |
| `onModelChange` | Called after every applied action |
| `onRenderTab` / `onRenderTabSet` | Customize tab / tab set leading content and buttons |
| `onExternalDrag` | Accept drags from outside the layout |
| `onContextMenu` / `onAuxMouseClick` | Custom context menu / aux-click behaviour |
| `onShowOverflowMenu` | Custom hidden-tabs menu |
| `onTabSetPlaceHolder` | Render a placeholder for empty tab sets |
| `onRenderDragRect` | Custom drag rectangle content |
| `classNameMapper` | Map every built-in class name (CSS modules support) |
| `i18nTranslator` | Translate model strings and built-in UI labels |
| `supportsPopout` / `popoutURL` / `popoutWindowName` | Native popout support and window naming |
| `popoutClassName` | Class for the popout window root |
| `renderPopoutContent` / `onPopoutOpen` / `onPopoutClose` | css-in-js/emotion integration for popout documents |
| `realtimeResize` | Resize tab content while dragging splitters |
| `tabDragSpeed` | Drag rectangle transition duration (default 0.3s) |
| `constrainFloatPanels` | Keep floating panels inside the layout bounds |
| `invalidateTabContentOnParentRender` | Set `false` to stop re-invoking the factory on unrelated host renders |

## Ref API (`ILayoutApi`)

`redraw()`, `getRootDiv()`, `addTabToTabSet(tabsetId, json)`, `addTabToActiveTabSet(json)`, `addTabWithDragAndDrop(event, json, onDrop?)`, `moveTabWithDragAndDrop(event, node)`, `setDragComponent(event, component, x, y)`, `editTabName(tabId)`.

## Undo / redo

```tsx
const { model, setModel, undo, redo, canUndo, canRedo, undoCount, redoCount, reset } =
  useUndo(initialModel /* or () => Model.fromJson(json) */, {
    maxBufferSize: 100,
    ignoreActionTypes: [Actions.SET_ACTIVE_TABSET],
  });

<Layout model={model!} factory={factory} />;
```

Snapshots are taken before each action; adjusting gestures collapse into one step. Undo/redo restores via `Model.fromJson(json, currentModel)`, so tab content stays mounted instead of remounting.

## Floating panels, popouts and sub-layouts

- `popoutTab(id, "float")` moves a tab into a floating panel inside the layout. The float header has a dock handle (drag back into the layout) and a popout-to-window button; the tab's own close button closes it.
- `popoutTab(id, "window")` moves the tab into a native popout window. The window loads `popoutURL` (default `popout.html`), and the layout is portaled into that document with styles copied automatically.
- `createSubLayout(rowJson, rect, "float" | "window")` creates a whole new sub-layout.
- To render a tab-defined nested layout, use the exported `TabLayout` component inside the factory:

```tsx
import { TabLayout } from "react-flexlayout-shadcn";

const factory = (node: TabNode) =>
  node.getSubLayoutId() ? <TabLayout tabNode={node} /> : <Panel node={node} />;
```

### `popout.html`

Native popouts need a small shell page served at the `popoutURL` path (default `/popout.html`). This repo ships [`popout.html`](popout.html) at the project root; copy it into your app's public directory (or root, for Vite). It only needs an empty `<body>` — the layout content and styles are injected into it.

Cross-document styling: regular `<style>`/`<link>` tags are copied and kept in sync. For css-in-js libraries that insert rules through the CSSOM (e.g. emotion in production "speedy" mode), use `onPopoutOpen` / `renderPopoutContent` to target the popout document directly.

## Keyboard and accessibility

- Tabs are `role="tab"` in a `role="tablist"`, with `aria-selected`, `aria-controls`, `aria-keyshortcuts`; hidden tab panels stay mounted with `aria-hidden`.
- Arrow keys move focus within a tab strip, `Enter` / `Space` activates, and the tab itself is the tab stop.
- Configurable command shortcuts (defaults): `Ctrl+Delete` close tab, `F2` rename tab, `Escape` close overlay border. `focusTabToggle`, `focusNextTabset` and `focusPreviousTabset` are available but off by default.
- Splitters are focusable separators with arrow-key resizing.
- Pinned tabs announce "(Pinned)" in their accessible name.

## i18n

Pass `i18nTranslator` to translate both model-provided strings (tab names, group names) and built-in UI labels (tooltips, context menu items, overflow menu):

```tsx
<Layout i18nTranslator={(key) => translations[key] ?? I18nLabelDefaults[key] ?? key} ... />
```

Built-in keys are listed in `I18nLabel` (e.g. `flexlayout.ui.close.tab`, `flexlayout.ui.menu.pin`, `flexlayout.ui.group.default.name`). Changing the translator re-renders mounted views, so a language switch applies immediately.

## Theming

The chrome is composed from shadcn/ui components (`Tabs`-style triggers, `DropdownMenu`, `ScrollArea`, `Separator`, `Card`, `Badge`, `Button`, `Alert`, …) and Tailwind utilities, with colours and sizes read from CSS variables exposed by `flexlayout-theme.css` (`--fl-*`). Override those variables in your theme to restyle without touching the components; use `classNameMapper` when you need to map class names for CSS modules. `CLASSES` still exports every built-in class name for targeted CSS (and for overflow/drag measurement, which relies on the `flexlayout__*` DOM contract).

## Menus

`PopupMenu` renders the same menu used internally (keyboard navigation, type-ahead, dividers, custom item content), and `ContextMenuBuilder` builds the standard node menu from `NODE_CONTEXT_ACTIONS` so you can reorder, filter or extend entries.

Right-click menus are opt-in through the `onContextMenu` prop. `getNodeContextMenuItems(node)` returns the standard entries for tabs, tabsets, borders and tab groups, and `showPopupMenu` positions them against the layout root:

```tsx
<Layout
  onContextMenu={(node, event) => {
    // the event bubbles from a tab to its tabset: let the innermost node claim it
    if (event.defaultPrevented) return;
    event.preventDefault();
    showPopupMenu({
      anchor: { x: event.clientX, y: event.clientY },
      container: node.getLayoutRef() ?? undefined,
      title: "getName" in node ? node.getName() : undefined,
      items: getNodeContextMenuItems(node),
      onClose: () => {},
    });
  }}
  ...
/>
```

Pass `closeMenu` to `getNodeContextMenuItems` when the menu contains controls that commit mid-menu (the group rename and colour controls use it to dismiss the menu).

## Differences from flexlayout-react

- Styling: upstream ships hand-written CSS and nine standalone themes (`alpha_light`, `dark`, `gray`, `rounded`, …). This package renders the chrome with shadcn/ui components and Tailwind utilities, and ships one stylesheet that maps the same `--fl-*` variables onto shadcn tokens, so it follows the host app's light/dark palette instead of a fixed theme. The host app's Tailwind build must scan the library `dist` output (see [Tailwind / shadcn setup](#tailwind--shadcn-setup)) so those utilities are generated; import `react-flexlayout-shadcn/style.css` for the token mapping.
- Scrolling uses the shadcn/Radix `ScrollArea` (bundled, so there is still no runtime dependency) everywhere the user scrolls: tab strips, tab content (tabsets, borders, groups, floats and popouts) and popup menus. Wheel scrolling, hidden-tab tracking and scroll-selected-tab-into-view behave as upstream; thumbs appear on hover when `tabSetEnableTabScrollbar` / `borderEnableTabScrollbar` is enabled, while the strip stays scrollable either way. Tab content scrolls through the viewport when `enableScrollbars` is true (the default) and is clipped when it is false. The classes `flexlayout__scroll_area_scrollbar`, `flexlayout__scroll_area_thumb` and `flexlayout__scroll_area_corner` are exported in `CLASSES`, along with `flexlayout__tab_content_scroll_area`, `flexlayout__tab_content_viewport` and `flexlayout__popup_menu_viewport`.
- `i18nTranslator` changes redraw mounted views, so switching languages applies immediately without reloading the layout.
- `FlexLayoutVersion` is the exported string `"0.11.1"`.
- `Node.isEnableDrop()` has a base implementation returning `true` (upstream only defines it on the drop-capable node types).
- Everything else — model classes, `Actions`, node attributes, JSON schema, `Layout` props, `ILayoutApi`, keyboard map, menus, drag/drop, floats, popouts and sub-layouts — matches flexlayout-react 0.11.1.

The demo covers borders, tab groups, pins, inline rename, floats, native popouts, sub-layouts, i18n, keyboard actions and undo/redo.

## Development

```bash
npm run dev        # Vite demo at http://localhost:5173
npm run build      # Bundle the library with tsup (ESM + d.ts)
npm run typecheck  # tsc --noEmit
npm run build:demo # Type-check and build the demo
```

The demo in [`demo/`](demo) wires the library into a VS Code-like layout and exercises the full feature set. The engine is a port of flexlayout-react 0.11.1 by [Caplin Systems](https://github.com/caplin/FlexLayout); the model/data structures retain their original design.

## License

MIT. Portions of the model and API surface are derived from flexlayout-react, © Caplin Systems, MIT licensed.

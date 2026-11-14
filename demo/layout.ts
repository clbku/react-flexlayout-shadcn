import type { IJsonModel } from "@/index";

export const initialLayout: IJsonModel = {
  global: {
    rootOrientationVertical: false,
    enableEdgeDock: true,
    enableEdgeDockIndicators: true,
    tabEnableClose: true,
    tabEnableDrag: true,
    tabEnableRename: true,
    tabEnablePin: true,
    tabEnableFloat: true,
    tabEnableFloatIcon: false,
    tabEnablePopout: true,
    tabEnablePopoutIcon: false,
    tabEnableScrollbars: true,
    tabSetEnableTabScrollbar: true,
    borderEnableTabScrollbar: true,
    tabGroupType: "splitpill",
    tabSetEnableMaximize: true,
    tabSetEnableClose: true,
    tabSetEnableTabGroups: true,
    borderEnableAutoHide: false,
    borderSize: 230,
    borderMinSize: 120,
    borderMaxSize: 420,
  },
  borders: [
    {
      location: "right",
      size: 240,
      selected: 0,
      children: [
        { type: "tab", name: "Outline", component: "outline", enableClose: false },
        { type: "tab", name: "Timeline", component: "timeline", enableClose: false },
      ],
    },
  ],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 20,
        selected: 0,
        children: [
          { type: "tab", name: "Explorer", component: "files" },
          { type: "tab", name: "Search", component: "search" },
        ],
      },
      {
        type: "row",
        weight: 80,
        children: [
          {
            type: "row",
            weight: 72,
            children: [
              {
                type: "tabset",
                weight: 66,
                selected: 0,
                active: true,
                children: [
                  {
                    type: "tab",
                    name: "App.tsx",
                    component: "code",
                    config: { file: "App.tsx" },
                  },
                  {
                    type: "tab",
                    name: "Layout.tsx",
                    component: "code",
                    config: { file: "Layout.tsx" },
                  },
                  {
                    type: "tabgroup",
                    name: "Docs",
                    color: "#0ea5e9",
                    opened: true,
                    children: [
                      { type: "tab", name: "README.md", component: "readme" },
                      { type: "tab", name: "CHANGELOG.md", component: "changelog" },
                    ],
                  },
                  { type: "tab", name: "Counter", component: "counter" },
                ],
              },
              {
                type: "tabset",
                weight: 34,
                selected: 0,
                children: [
                  { type: "tab", name: "Inspector", component: "inspector" },
                  { type: "tab", name: "Features", component: "features" },
                  { type: "tab", name: "Styles", component: "styles" },
                ],
              },
            ],
          },
          {
            type: "tabset",
            weight: 28,
            selected: 1,
            children: [
              { type: "tab", name: "Notes", component: "notes", pinned: true },
              { type: "tab", name: "Terminal", component: "terminal" },
              { type: "tab", name: "Problems", component: "problems" },
              { type: "tab", name: "Output", component: "output" },
            ],
          },
        ],
      },
    ],
  },
};

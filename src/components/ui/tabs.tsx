import { cva } from "class-variance-authority";

/*
 * Styling primitives for the docking tabs. The layout owns selection, roving tabindex,
 * drag-and-drop and imperative panel positioning, so these are Tailwind variants only —
 * wrapping Radix Tabs would fight the layout engine.
 */
const tabsListVariants = cva("flex items-center", {
  variants: {
    orientation: {
      horizontal: "flex-row whitespace-nowrap",
      vertical: "flex-col",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const tabsTriggerVariants = cva(
  "group relative box-border flex items-center gap-[0.3em] font-normal outline-none select-none rounded-sm transition-colors duration-[120ms] whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--fl-color-focus)]",
  {
    variants: {
      variant: {
        default: "cursor-pointer px-[0.5em] py-[3px]",
        stretch: "w-full cursor-pointer px-0 py-[3px]",
        border: "my-[2px] cursor-pointer px-[0.5em] py-[3px]",
      },
      state: {
        active: "text-[var(--fl-color-tab-selected)]",
        inactive: "text-[var(--fl-color-tab-unselected)] hover:text-[var(--fl-color-tab-selected)]",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        state: "active",
        class: "bg-[var(--fl-color-tab-selected-background)] shadow-[inset_0_-1px_0_var(--border)]",
      },
      {
        variant: "default",
        state: "inactive",
        class: "bg-[var(--fl-color-tab-unselected-background)]",
      },
      {
        variant: "stretch",
        state: ["active", "inactive"],
        class: "bg-transparent text-[var(--fl-color-tab-selected)] hover:text-[var(--fl-color-tab-selected)]",
      },
      {
        variant: "border",
        state: "active",
        class: "bg-[var(--fl-color-border-tab-selected-background)] text-[var(--fl-color-border-tab-selected)]",
      },
      {
        variant: "border",
        state: "inactive",
        class:
          "bg-[var(--fl-color-border-tab-unselected-background)] text-[var(--fl-color-border-tab-unselected)] hover:text-[var(--fl-color-border-tab-selected)]",
      },
    ],
    defaultVariants: {
      variant: "default",
      state: "inactive",
    },
  },
);

// underline bar drawn under tabs that belong to an "underline" style group
const groupedTabUnderlineClassName =
  "after:pointer-events-none after:absolute after:inset-x-[10px] after:bottom-0 after:h-[var(--fl-underline_height,2px)] after:rounded-full after:bg-[color:var(--flexlayout-group-color)] after:content-['']";

export { groupedTabUnderlineClassName, tabsListVariants, tabsTriggerVariants };

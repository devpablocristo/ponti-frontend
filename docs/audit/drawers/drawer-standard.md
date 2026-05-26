# Drawer Standard

## Structural Contract

- Every lateral panel uses `DrawerShell`.
- Pages do not import or render raw `<Drawer>`.
- `EntityFormDrawer` and `ArchivedDrawer` are thin wrappers over `DrawerShell`.
- `DrawerLayout` is legacy-only and must not be used by pages.

## Visual Contract

- Panel width: `100vw` mobile, `70vw` desktop.
- Overlay: one global dark overlay, above filters and page chrome.
- Header: 24px padding, 20px title, 700 weight, slate text, optional subtitle below.
- Close: one `DrawerCloseButton`, top-right, same hit area everywhere.
- Body: own scroll area, 24px padding, consistent section gap.
- Footer: sticky bottom, 16px/24px padding, top border, actions right-aligned.
- Footer order: secondary action first, primary action last.
- Sections: use `DrawerSection` for titled or bordered blocks.

## Button Contract

- `AppButton`: base button.
- `ToolbarActionButton`: toolbar and filter bar actions.
- `DrawerButton`: drawer footer/body actions.
- `IconActionButton`: icon-only actions such as close, edit, remove.
- No local Tailwind class should recreate an equivalent action style.

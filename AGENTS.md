# Agent notes

## ui-sdk

Before using ui-sdk (`@ui-sdk/react`, `@ui-sdk/core`), follow the `ui-sdk` skill if it's installed, and read `node_modules/@ui-sdk/react/docs/llms.txt`.

To build a new component, also search `node_modules/@ui-sdk/react/docs/core.md` by heading, and read `rendering.md` next to it.

`@ui-sdk/core/web.css` is not used: its link and control styles fight the site's own dark Tailwind theme. The wrappers in `components/ui/` style ui-sdk parts with Tailwind instead, and `@layer ui-sdk;` sits at the top of `app/globals.css` so site styles win. Server pages can render these wrappers, but a wrapper that takes `asChild` must be a client module (`"use client"`) or the production prerender fails.

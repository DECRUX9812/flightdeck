import { defineConfig } from "@textjs/app";

export default defineConfig({
  title: "Flightdeck — mission control for production",
  devIndicators: false,
  viewport: { width: 120, height: 36, theme: "geistDark" },
  hints: [
    { keys: "1-4", label: "pages" },
    { keys: "⌘K", label: "commands" },
    { keys: "?", label: "keys" },
  ],
  action: "press 1-4 to move around, ⌘K for commands",
});

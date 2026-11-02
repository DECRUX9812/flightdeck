"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Box,
  CommandPalette,
  KeyHelp,
  KeyHints,
  StatusBar,
  Text,
  Toaster,
  useAppTheme,
  useClipboard,
  useConsoleStats,
  useKeymap,
  useTheme,
  useToast,
  type Command,
  type Metadata,
} from "@textjs/app";
import Link from "@textjs/app/link";
import { usePathname, useRouter } from "@textjs/app/navigation";
import { LiveProvider, useTick } from "../lib/live";

export const metadata: Metadata = {
  title: { default: "Flightdeck", template: "%s · Flightdeck" },
  description: "Mission control for production, rendered inside console.log.",
};

function useClock(): string {
  const tick = useTick();
  const [origin] = useState(() => Date.now());
  const now = new Date(origin + tick * 1000);
  return [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
}

const NAV = [
  { href: "/", label: "overview", shortcut: "1" },
  { href: "/fleet", label: "fleet", shortcut: "2" },
  { href: "/incidents", label: "incidents", shortcut: "3" },
  { href: "/pricing", label: "pricing", shortcut: "4" },
] as const;

function Header(): ReactNode {
  const theme = useTheme();
  const clock = useClock();
  return (
    <Box className="flex-row h-1 px-2 gap-2 shrink-0 items-center">
      <Text bold color={theme.accent} wrap="nowrap">
        ▼
      </Text>
      <Text bold color={theme.fg} wrap="nowrap">
        FLIGHTDECK
      </Text>
      <Text color={theme.border} wrap="nowrap">
        │
      </Text>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          shortcut={item.shortcut}
          className="text-muted no-underline"
          activeClassName="text-fg bold"
        >
          {item.label}
        </Link>
      ))}
      <Box className="grow" />
      <Text color={theme.success} wrap="nowrap">
        ●
      </Text>
      <Text color={theme.muted} wrap="nowrap">
        prod · iad1
      </Text>
      <Text color={theme.border} wrap="nowrap">
        │
      </Text>
      <Text color={theme.subtle} wrap="nowrap">
        {clock}
      </Text>
    </Box>
  );
}

function Footer(): ReactNode {
  const theme = useTheme();
  const stats = useConsoleStats();
  return (
    <StatusBar className="h-1 px-2 mt-1 shrink-0" backgroundColor={theme.surface}>
      <KeyHints items={[{ keys: "1-4", label: "pages" }, { keys: "⌘K", label: "commands" }, { keys: "?", label: "keys" }]} />
      <Text color={theme.subtle} wrap="nowrap">
        {`${stats.cols}×${stats.rows} · ${stats.totalMs.toFixed(2)}ms · frame ${stats.frameCount}`}
      </Text>
    </StatusBar>
  );
}

/** Everything that needs the router: header chrome, palette, global keys, toasts. */
function Chrome({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const shell = useAppTheme();
  const { copy } = useClipboard();
  const toast = useToast();

  const commands: Command[] = [
    ...NAV.map((item) => ({
      id: `nav:${item.href}`,
      label: `Go to ${item.label}`,
      group: "Navigate",
      keys: item.shortcut,
      run: () => router.push(item.href),
    })),
    {
      id: "theme",
      label: "Cycle theme",
      group: "Appearance",
      keywords: ["dark", "light", "amber", "tokyo"],
      run: () => shell?.cycleTheme(),
    },
    {
      id: "copy",
      label: "Copy link to this view",
      group: "Share",
      keywords: ["url", "clipboard"],
      run: () => {
        void copy(`https://flightdeck.console${pathname}`).then((ok) => {
          if (ok) toast.success("Copied", { description: pathname });
          else toast.error("Clipboard unavailable");
        });
      },
    },
    {
      id: "rollback",
      label: "Declare incident",
      group: "Actions",
      keywords: ["page", "sev"],
      run: () => toast.warning("INC-2414 opened", { description: "SEV-2 · @you is incident commander" }),
    },
  ];

  useKeymap(
    {
      "shift+t": {
        label: "Cycle theme",
        run: () => shell?.cycleTheme(),
      },
    },
    { group: "Appearance" },
  );

  return (
    <Box className="flex-col w-full h-full" backgroundColor={theme.bg}>
      <Box className="pt-1 shrink-0">
        <Header />
      </Box>
      <Box className="grow flex-col px-2 pt-1 min-h-0">{children}</Box>
      <Footer />
      <CommandPalette commands={commands} />
      <KeyHelp title="Keyboard" />
      <Toaster position="bottom-right" width={40} />
    </Box>
  );
}

export default function RootLayout({ children }: { children?: ReactNode }): ReactNode {
  return (
    <LiveProvider>
      <Chrome>{children}</Chrome>
    </LiveProvider>
  );
}

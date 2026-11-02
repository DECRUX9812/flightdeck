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
import { LiveProvider, useLive } from "../lib/useLive";

export const metadata: Metadata = {
  title: { default: "Flightdeck", template: "%s · Flightdeck" },
  description: "Live telemetry for this machine, rendered inside console.log.",
};

const NAV = [
  { href: "/", label: "overview", shortcut: "1" },
  { href: "/fleet", label: "fleet", shortcut: "2" },
  { href: "/problems", label: "problems", shortcut: "3" },
  { href: "/snapshot", label: "snapshot", shortcut: "4" },
] as const;

function Header(): ReactNode {
  const theme = useTheme();
  const { snapshot } = useLive();
  const clock = new Date().toLocaleTimeString([], { hour12: false });
  const failed = snapshot?.counts.failed ?? 0;

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
      <Text color={failed > 0 ? theme.danger : theme.success} wrap="nowrap">
        ●
      </Text>
      <Text color={theme.muted} wrap="nowrap">
        {snapshot ? `${snapshot.host.hostname} · ${snapshot.counts.running}/${snapshot.counts.total} up` : "connecting"}
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
  const { snapshot } = useLive();
  return (
    <StatusBar className="h-1 px-2 mt-1 shrink-0" backgroundColor={theme.surface}>
      <KeyHints
        items={[
          { keys: "1-4", label: "pages" },
          { keys: "⌘K", label: "commands" },
          { keys: "?", label: "keys" },
        ]}
      />
      <Text color={theme.subtle} wrap="nowrap">
        {`${snapshot ? new Date(snapshot.generatedAt).toLocaleTimeString() : "—"} · ${stats.cols}×${stats.rows} · ${stats.totalMs.toFixed(1)}ms · frame ${stats.frameCount}`}
      </Text>
    </StatusBar>
  );
}

function Chrome({ children }: { children?: ReactNode }): ReactNode {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const shell = useAppTheme();
  const { copy } = useClipboard();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  void copied;

  const commands: Command[] = [
    ...NAV.map((item) => ({
      id: `nav:${item.href}`,
      label: `Go to ${item.label}`,
      group: "Navigate",
      keys: item.shortcut,
      run: () => router.push(item.href),
    })),
    {
      id: "snapshot",
      label: "Copy the CI snapshot command",
      group: "Share",
      keywords: ["curl", "ci", "slack", "text"],
      run: () => {
        void copy('curl -fsS "$APP/api/live?format=text"').then((ok) => {
          if (ok) toast.success("Copied", { description: "curl /api/live?format=text" });
          else toast.error("Clipboard unavailable");
        });
      },
    },
    {
      id: "theme",
      label: "Cycle theme",
      group: "Appearance",
      keywords: ["dark", "light", "amber", "tokyo"],
      run: () => shell?.cycleTheme(),
    },
  ];

  useKeymap({ "shift+t": { label: "Cycle theme", run: () => shell?.cycleTheme() } }, { group: "Appearance" });

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

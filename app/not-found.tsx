"use client";

import type { ReactNode } from "react";
import { AsciiFont, Box, Text, useTheme } from "@textjs/app";
import Link from "@textjs/app/link";

export default function NotFound(): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <AsciiFont text="404" font="block" color={theme.danger} />
      <Text color={theme.muted}>This route is not in the console.</Text>
      <Text color={theme.subtle}>The incident, however, is still happening.</Text>
      <Box className="h-1" />
      <Link href="/" autoFocus>
        ← back to overview
      </Link>
    </Box>
  );
}

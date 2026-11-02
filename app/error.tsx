"use client";

import type { ReactNode } from "react";
import { Box, Text, useInput, useTheme, type ErrorComponentProps } from "@textjs/app";

export default function AppError({ error, reset }: ErrorComponentProps): ReactNode {
  const theme = useTheme();
  useInput((event) => {
    if (event.key === "r") reset();
  });
  return (
    <Box className="flex-col grow items-center justify-center gap-1">
      <Text bold color={theme.danger}>
        ✕ The console crashed.
      </Text>
      <Text color={theme.muted} wrap="truncate-end">
        {error.message}
      </Text>
      <Text color={theme.subtle}>Incident command has been notified. Probably.</Text>
      <Box className="h-1" />
      <Text color={theme.accent}>press r to retry this route</Text>
    </Box>
  );
}

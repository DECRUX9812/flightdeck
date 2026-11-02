"use client";

import type { ReactNode } from "react";
import { Badge, BarChart, Box, Divider, Text, useTheme, type Metadata } from "@textjs/app";
import { Panel } from "../../components/ui";

export const metadata: Metadata = { title: "Pricing" };

interface Plan {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: readonly string[];
  cta: string;
  featured?: boolean;
}

const PLANS: readonly Plan[] = [
  {
    name: "Hobby",
    price: "$0",
    cadence: "forever",
    blurb: "One developer, one haunted side project.",
    features: ["1 service", "7-day retention", "Community support", "Renders in console.log"],
    cta: "Start free",
  },
  {
    name: "Team",
    price: "$29",
    cadence: "per dev / month",
    blurb: "For teams who ship on Fridays anyway.",
    features: ["Unlimited services", "90-day retention", "SSO + audit log", "Deploy from the console", "⌘K everywhere"],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Call us",
    cadence: "annual",
    blurb: "For when the console is the product.",
    features: ["Air-gapped DevTools", "Custom font fallback", "24/7 incident bridge", "A human who answers"],
    cta: "Talk to sales",
  },
];

function PlanCard({ plan }: { plan: Plan }): ReactNode {
  const theme = useTheme();
  return (
    <Box
      className="flex-col grow basis-0 border rounded px-2 py-1 min-w-0"
      borderColor={plan.featured ? theme.accent : theme.border}
      title={plan.featured ? " Most popular " : undefined}
      titleColor={theme.accent}
    >
      <Box className="flex-row h-1">
        <Text bold color={theme.fg} wrap="nowrap">
          {plan.name}
        </Text>
        <Box className="grow" />
        {plan.featured ? <Badge variant="accent">beta</Badge> : null}
      </Box>
      <Box className="flex-row h-1 gap-1">
        <Text bold color={plan.featured ? theme.accent : theme.fg} wrap="nowrap">
          {plan.price}
        </Text>
        <Text color={theme.subtle} wrap="nowrap">
          {plan.cadence}
        </Text>
      </Box>
      <Text color={theme.muted} wrap="truncate-end">
        {plan.blurb}
      </Text>
      {plan.features.map((feature) => (
        <Box key={feature} className="flex-row h-1 gap-1">
          <Text color={plan.featured ? theme.accent : theme.success} wrap="nowrap">
            ✓
          </Text>
          <Text color={theme.muted} wrap="truncate-end">
            {feature}
          </Text>
        </Box>
      ))}
      <Box className="grow" />
      <Text bold color={plan.featured ? theme.accent : theme.fg} wrap="nowrap">
        {`${plan.cta} →`}
      </Text>
    </Box>
  );
}

export default function PricingPage(): ReactNode {
  const theme = useTheme();
  return (
    <Box className="flex-col gap-1 grow min-h-0">
      <Box className="flex-row gap-2 shrink-0 items-baseline">
        <Text bold color={theme.fg} wrap="nowrap">
          Pricing
        </Text>
        <Text color={theme.muted} wrap="nowrap">
          Priced per engineer, because that is who is already in the console.
        </Text>
        <Box className="grow" />
        <Text color={theme.subtle} wrap="nowrap">
          USD · agents are free
        </Text>
      </Box>

      <Box className="flex-row gap-1 shrink-0" height={14}>
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </Box>

      <Box className="flex-row gap-1 grow min-h-0">
        <Panel title=" The path to $1B ARR " grow>
          <Text color={theme.muted} wrap="nowrap">
            28.7M developers · $29/mo seat · no new behavior required.
          </Text>
          <Box className="h-1" />
          <Box className="flex-row h-1">
            <Text color={theme.subtle} width={20} wrap="nowrap">
              100% of market
            </Text>
            <Text color={theme.fg} wrap="nowrap">
              28.7M × $348/yr = $9.99B
            </Text>
          </Box>
          <Box className="flex-row h-1">
            <Text color={theme.subtle} width={20} wrap="nowrap">
              10% of market
            </Text>
            <Text bold color={theme.accent} wrap="nowrap">
              2.87M × $348/yr = $1.00B
            </Text>
          </Box>
          <Box className="flex-row h-1">
            <Text color={theme.subtle} width={20} wrap="nowrap">
              CAC
            </Text>
            <Text color={theme.success} wrap="nowrap">
              $0 — a keyboard shortcut
            </Text>
          </Box>
          <Box className="py-1">
            <Divider title=" ARR trajectory ($M) " color={theme.border} titleColor={theme.subtle} />
          </Box>
          <BarChart
            data={[
              { label: "2026", value: 2, color: theme.subtle },
              { label: "2027", value: 24, color: theme.info },
              { label: "2028", value: 180, color: theme.accent },
              { label: "2029", value: 1002, color: theme.success },
            ]}
            formatValue={(value) => (value >= 1000 ? `$${(value / 1000).toFixed(1)}B` : `$${value}M`)}
            color={theme.accent}
          />
          <Box className="grow" />
          <Divider color={theme.border} />
          <Text color={theme.subtle} wrap="nowrap">
            Not modeled: churn, the CFO, or the vibes.
          </Text>
        </Panel>

        <Box className="flex-col shrink-0" width={40}>
          <Panel title=" Why now " grow>
            <Text color={theme.fg} wrap="nowrap">
              Every dev has a console open.
            </Text>
            <Text color={theme.muted} wrap="nowrap">
              No tool renders there.
            </Text>
            <Box className="h-1" />
            <Text color={theme.subtle} wrap="nowrap">
              The dashboard is a tab
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              you forgot. The console
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              is a reflex.
            </Text>
            <Box className="h-1" />
            <Text color={theme.muted} wrap="nowrap">
              One keystroke from the
            </Text>
            <Text color={theme.muted} wrap="nowrap">
              thing already on fire.
            </Text>
            <Box className="grow" />
            <Divider color={theme.border} />
            <Text color={theme.subtle} wrap="nowrap">
              Plaid for consoles.
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              Stripe for terminals.
            </Text>
            <Text color={theme.subtle} wrap="nowrap">
              Pick your analogy.
            </Text>
          </Panel>
        </Box>
      </Box>
    </Box>
  );
}

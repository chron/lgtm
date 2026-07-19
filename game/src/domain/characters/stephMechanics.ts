interface AutomationMeters {
  script: number;
  guard: number;
}

export function pavedRoadFocus(before: AutomationMeters, after: AutomationMeters): number {
  return Number(after.script > before.script) + Number(after.guard > before.guard);
}

export function doubleAutomationMeters(meters: AutomationMeters): AutomationMeters {
  return { script: meters.script * 2, guard: meters.guard * 2 };
}

export function automationTriggerPackets(
  meters: AutomationMeters,
  times: number,
): readonly AutomationMeters[] {
  return Array.from({ length: Math.max(0, times) }, () => ({
    script: meters.script,
    guard: meters.guard,
  }));
}

export function canRefactorAutomation(meters: AutomationMeters): boolean {
  return meters.script > 0 || meters.guard > 0;
}

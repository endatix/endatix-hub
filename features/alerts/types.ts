type DismissedAlerts = Record<string, Date>;

const DismissedAlerts = {
  empty(): DismissedAlerts {
    return {};
  },
} as const;

enum AlertBehavior {
  ALWAYS_SHOW,
  REMEMBER_DISMISS,
}

export { AlertBehavior, DismissedAlerts };

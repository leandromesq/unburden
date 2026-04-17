type ScheduledCalculationMode = "idle" | "timeout";

interface OmniScheduler {
  bumpVersion(): number;
  getVersion(): number;
  schedulePreview(
    version: number,
    callback: () => void,
    debounceMs?: number,
  ): void;
  scheduleCalculation(version: number, callback: () => void): void;
  cancelPreview(): void;
  cancelCalculation(): void;
  cancelAll(): void;
  reset(): void;
}

type SchedulerWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getSchedulerWindow(): SchedulerWindow | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window as SchedulerWindow;
}

function createOmniScheduler(): OmniScheduler {
  let scheduledComputeFrame: number | null = null;
  let scheduledComputeVersion = 0;
  let scheduledCalculationHandle: number | null = null;
  let scheduledCalculationMode: ScheduledCalculationMode | null = null;
  let scheduledPreviewTimeout: number | null = null;

  const cancelPreview = () => {
    const schedulerWindow = getSchedulerWindow();

    if (
      scheduledComputeFrame !== null &&
      schedulerWindow &&
      typeof schedulerWindow.cancelAnimationFrame === "function"
    ) {
      schedulerWindow.cancelAnimationFrame(scheduledComputeFrame);
    }

    scheduledComputeFrame = null;

    if (scheduledPreviewTimeout !== null && schedulerWindow) {
      schedulerWindow.clearTimeout(scheduledPreviewTimeout);
    }

    scheduledPreviewTimeout = null;
  };

  const cancelCalculation = () => {
    const schedulerWindow = getSchedulerWindow();

    if (scheduledCalculationHandle === null || !schedulerWindow) {
      scheduledCalculationHandle = null;
      scheduledCalculationMode = null;
      return;
    }

    if (
      scheduledCalculationMode === "idle" &&
      typeof schedulerWindow.cancelIdleCallback === "function"
    ) {
      schedulerWindow.cancelIdleCallback(scheduledCalculationHandle);
    } else {
      schedulerWindow.clearTimeout(scheduledCalculationHandle);
    }

    scheduledCalculationHandle = null;
    scheduledCalculationMode = null;
  };

  const cancelAll = () => {
    cancelPreview();
    cancelCalculation();
  };

  return {
    bumpVersion() {
      scheduledComputeVersion += 1;
      return scheduledComputeVersion;
    },

    getVersion() {
      return scheduledComputeVersion;
    },

    schedulePreview(version, callback, debounceMs = 0) {
      const schedulerWindow = getSchedulerWindow();

      if (!schedulerWindow) {
        callback();
        return;
      }

      const runPreview = () => {
        scheduledPreviewTimeout = null;
        scheduledComputeFrame = schedulerWindow.requestAnimationFrame(() => {
          scheduledComputeFrame = null;

          if (version !== scheduledComputeVersion) {
            return;
          }

          callback();
        });
      };

      cancelPreview();

      if (debounceMs > 0) {
        scheduledPreviewTimeout = schedulerWindow.setTimeout(
          runPreview,
          debounceMs,
        );
        return;
      }

      runPreview();
    },

    scheduleCalculation(version, callback) {
      const schedulerWindow = getSchedulerWindow();

      if (!schedulerWindow) {
        callback();
        return;
      }

      cancelCalculation();

      const runCalculation = () => {
        scheduledCalculationHandle = null;
        scheduledCalculationMode = null;

        if (version !== scheduledComputeVersion) {
          return;
        }

        callback();
      };

      if (typeof schedulerWindow.requestIdleCallback === "function") {
        scheduledCalculationMode = "idle";
        scheduledCalculationHandle = schedulerWindow.requestIdleCallback(
          runCalculation,
          { timeout: 120 },
        );
        return;
      }

      scheduledCalculationMode = "timeout";
      scheduledCalculationHandle = schedulerWindow.setTimeout(
        runCalculation,
        16,
      );
    },

    cancelPreview,
    cancelCalculation,
    cancelAll,

    reset() {
      cancelAll();
      scheduledComputeVersion = 0;
    },
  };
}

export const omniScheduler = createOmniScheduler();

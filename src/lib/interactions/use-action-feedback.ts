import { useCallback, useEffect, useRef, useState } from "react";

export type ActionState = "idle" | "loading" | "success" | "error";

/** Spoken/visible copy for each non-idle state. */
export type ActionMessages = {
  loading: string;
  success: string;
  error: string;
};

export type ActionFeedback = {
  state: ActionState;
  /** Text for the polite live region; empty while idle. */
  message: string;
  /** Runs a task while the button reports loading → success/error. */
  run: (task: () => Promise<boolean> | boolean, messages: ActionMessages) => Promise<boolean>;
  reset: () => void;
};

/**
 * Small state machine for an action that must show progress, avoid duplicate
 * submissions, and confirm success or report failure without relying on colour.
 */
export function useActionFeedback(
  options: { successMs?: number; errorMs?: number } = {},
): ActionFeedback {
  const successMs = options.successMs ?? 1800;
  const errorMs = options.errorMs ?? 3200;
  const [state, setState] = useState<ActionState>("idle");
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef(0);
  const busyRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    tokenRef.current += 1;
    busyRef.current = false;
    clearTimer();
    setState("idle");
    setMessage("");
  }, [clearTimer]);

  useEffect(
    () => () => {
      tokenRef.current += 1;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const run = useCallback(
    async (task: () => Promise<boolean> | boolean, messages: ActionMessages) => {
      if (busyRef.current) return false;
      busyRef.current = true;
      const token = tokenRef.current + 1;
      tokenRef.current = token;
      clearTimer();
      setState("loading");
      setMessage(messages.loading);

      let ok = false;
      try {
        ok = await task();
      } catch {
        ok = false;
      }
      if (token !== tokenRef.current) return ok;

      busyRef.current = false;
      setState(ok ? "success" : "error");
      setMessage(ok ? messages.success : messages.error);
      timerRef.current = setTimeout(
        () => {
          if (token !== tokenRef.current) return;
          timerRef.current = null;
          setState("idle");
          setMessage("");
        },
        ok ? successMs : errorMs,
      );
      return ok;
    },
    [clearTimer, errorMs, successMs],
  );

  return { state, message, run, reset };
}

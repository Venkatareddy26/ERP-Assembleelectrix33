/** Cancels older loads and ignores responses even when transport abort is delayed. */
export function createLatestRequest() {
  let controller: AbortController | undefined;
  let generation = 0;
  const cancel = () => { generation += 1; controller?.abort(); };
  return {
    cancel,
    start() {
      cancel();
      controller = new AbortController();
      const active = generation;
      const signal = controller.signal;
      return { signal, isCurrent: () => active === generation && !signal.aborted };
    },
  };
}

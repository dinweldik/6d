export function isInteractiveTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        "a",
        "button",
        "input",
        "label",
        "select",
        "summary",
        "textarea",
        "[contenteditable='true']",
        "[data-touch-swipe-ignore='true']",
        "[role='button']",
        "[role='textbox']",
      ].join(","),
    ),
  );
}

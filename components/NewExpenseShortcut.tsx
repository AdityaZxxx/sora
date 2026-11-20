"use client";

import { useEffect } from "react";

export default function NewExpenseShortcut() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("new") !== "expense") return;

    let elapsed = 0;
    const interval = window.setInterval(() => {
      elapsed += 100;

      // A click before hydration has no handler, so wait for React's marker.
      const trigger = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button"),
      ).find(
        (button) =>
          button.textContent?.trim() === "New expense" &&
          Object.keys(button).some((key) => key.startsWith("__reactProps")),
      );

      if (!trigger && elapsed < 10_000) return;

      window.clearInterval(interval);
      trigger?.click();
      url.searchParams.delete("new");
      window.history.replaceState(null, "", url);
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}

"use client";
import { useSyncExternalStore } from "react";

const mediaQueryLists = new Map<string, MediaQueryList>();

function getMediaQueryList(query: string) {
  const cached = mediaQueryLists.get(query);
  if (cached) return cached;

  const mediaQueryList = matchMedia(query);
  mediaQueryLists.set(query, mediaQueryList);
  return mediaQueryList;
}

const getServerSnapshot = () => false;

export function useMediaQuery(query: string) {
  const subscribe = (onStoreChange: () => void) => {
    const mediaQueryList = getMediaQueryList(query);
    mediaQueryList.addEventListener("change", onStoreChange);
    return () => mediaQueryList.removeEventListener("change", onStoreChange);
  };

  const getSnapshot = () => getMediaQueryList(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

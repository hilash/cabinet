"use client";

import { useEffect, useState } from "react";
import {
  NavigationProvider,
  type NavigationAdapter,
} from "@multica/views/navigation";

type MulticaNavigationProviderProps = {
  children: React.ReactNode;
};

function getPathname() {
  if (typeof window === "undefined") {
    return "/";
  }

  const hash = window.location.hash.slice(1);
  const [pathname = "/"] = (hash || "/").split("?");
  return pathname || "/";
}

function getSearchParams() {
  const [, query = ""] = window.location.hash.slice(1).split("?");
  return new URLSearchParams(query);
}

function setHash(path: string, replace = false) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${window.location.pathname}${window.location.search}#${normalizedPath}`;

  if (replace) {
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }

  window.location.hash = normalizedPath;
}

export function MulticaNavigationProvider({
  children,
}: MulticaNavigationProviderProps) {
  const [pathname, setPathname] = useState(getPathname);

  useEffect(() => {
    const syncPathname = () => {
      setPathname(getPathname());
    };

    syncPathname();
    window.addEventListener("hashchange", syncPathname);

    return () => {
      window.removeEventListener("hashchange", syncPathname);
    };
  }, []);

  const adapter: NavigationAdapter = {
    push(path) {
      setHash(path);
    },
    replace(path) {
      setHash(path, true);
    },
    back() {
      window.history.back();
    },
    pathname,
    searchParams: getSearchParams(),
  };

  return <NavigationProvider value={adapter}>{children}</NavigationProvider>;
}

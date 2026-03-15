import { useMobileViewport } from "../mobileViewport";

export type ProjectToolsSurfaceMode = "mobile" | "sidepanel";

export function useProjectToolsSurfaceMode(): ProjectToolsSurfaceMode {
  const mobileViewport = useMobileViewport();

  if (mobileViewport.isMobile) {
    return "mobile";
  }

  return "sidepanel";
}

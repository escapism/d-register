import { useGtm } from "@gtm-support/vue-gtm";
import type { RouteLocationNormalized } from 'vue-router'


export function gtmTrackEvent(event: string): void {
  const gtm = useGtm();
  if (gtm && navigator.onLine) {
    gtm.trackEvent({ event: "custom_event", event_name: `dr_${event}` });
  }
}

export function gtmTrackError(event: string): void {
  const gtm = useGtm();
  if (gtm && navigator.onLine) {
    gtm.trackEvent({ event: "custom_event", event_name: `dr_error_${event}` });
  }
}

export function getPageLocation(route : RouteLocationNormalized) {
  return location.origin + location.pathname.replace(/\/$/, "") + route.fullPath
}
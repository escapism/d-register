import { useGtm } from "@gtm-support/vue-gtm";

export function gtmTrackEvent(event: string): void {
  const gtm = useGtm();
  if (gtm) {
    gtm.trackEvent({ event: "custom_event", event_name: `dr_${event}` });
  }
}

export function gtmTrackError(event: string): void {
  const gtm = useGtm();
  if (gtm) {
    gtm.trackEvent({ event: "custom_event", event_name: `dr_error_${event}` });
  }
}

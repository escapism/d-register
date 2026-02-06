import { useGtm } from '@gtm-support/vue-gtm';

export function gtmTrackEvent(event : string): void {
  const gtm = useGtm();
  if (gtm) gtm.trackEvent({ event });
}

export function gtmTrackError(event : string): void {
  const gtm = useGtm();
  if (gtm) gtm.trackEvent({ event, category: "error" });
}
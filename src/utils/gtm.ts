import { useGtm } from '@gtm-support/vue-gtm';
const gtm = useGtm();

export function gtmTrackEvent(event : string): void {
  console.log(gtm, { event })
  if (gtm) gtm.trackEvent({ event });
}

export function gtmTrackError(event : string): void {
  if (gtm) gtm.trackEvent({ event, category: "error" });
}
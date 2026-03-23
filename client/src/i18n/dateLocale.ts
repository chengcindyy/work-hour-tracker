import type { Locale } from "date-fns";
import { enUS, zhTW } from "date-fns/locale";

export function dateFnsLocaleForLng(lng: string): Locale {
  if (lng === "en" || lng.startsWith("en-")) {
    return enUS;
  }
  return zhTW;
}

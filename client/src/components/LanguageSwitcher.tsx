import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import i18n, { type AppLocale, SUPPORTED_LOCALES } from "@/i18n/config";
import { useTranslation } from "react-i18next";

type Props = {
  /** compact = icon-free select for tight rows */
  className?: string;
  id?: string;
};

export function LanguageSwitcher({ className, id }: Props) {
  const { t } = useTranslation();

  return (
    <Select
      value={i18n.language === "en" ? "en" : "zh-TW"}
      onValueChange={(v) => {
        void i18n.changeLanguage(v as AppLocale);
      }}
    >
      <SelectTrigger id={id} className={className ?? "w-full sm:w-[200px]"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((code) => (
          <SelectItem key={code} value={code}>
            {code === "zh-TW" ? t("language.zhTW") : t("language.en")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

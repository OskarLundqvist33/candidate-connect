import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { lang, setLang } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      onClick={() => setLang(lang === "en" ? "sv" : "en")}
    >
      <Globe className="h-4 w-4 mr-2" />
      {!collapsed && (lang === "en" ? "Svenska" : "English")}
    </Button>
  );
}

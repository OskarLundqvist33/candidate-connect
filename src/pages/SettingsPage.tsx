import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setCompanyName(data.company_name || "");
        setLinkedinUrl((data as any).linkedin_url || "");
      }
      setLoadingProfile(false);
    };
    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          company_name: companyName.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
        } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: t.settingsSaved });
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: t.passwordTooShort, variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t.passwordsMismatch, variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t.passwordChanged });
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.settingsTitle}</h1>
        <p className="text-muted-foreground">{t.settingsSubtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.profileInfo}</CardTitle>
          <CardDescription>{t.profileInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.nameLabel}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t.namePlaceholder} />
          </div>
          <div className="space-y-2">
            <Label>{t.emailLabel}</Label>
            <Input value={email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">{t.emailCannotChange}</p>
          </div>
          <div className="space-y-2">
            <Label>{t.companyLabel}</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t.companyPlaceholder} />
          </div>
          <div className="space-y-2">
            <Label>{t.linkedinLabel}</Label>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <Button onClick={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t.saveChanges}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>{t.changePassword}</CardTitle>
          <CardDescription>{t.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.newPassword}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>{t.confirmPassword}</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
            {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t.changePassword}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

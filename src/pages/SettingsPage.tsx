import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const { user, isJobSeeker } = useAuth();
  const { t, lang } = useLanguage();
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

  // CV state
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [analyzingCv, setAnalyzingCv] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (isJobSeeker) loadSavedCv();
  }, [user, isJobSeeker]);

  const loadSavedCv = async () => {
    if (!user) return;
    const { data } = await supabase.storage.from("cv-uploads").list(user.id + "/profile", { limit: 1, sortBy: { column: "created_at", order: "desc" } });
    if (data && data.length > 0) {
      const file = data[0];
      setCvPath(`${user.id}/profile/${file.name}`);
      setCvFileName(file.name.replace(/^\d+_/, ""));
    }
  };

  const handleCvUpload = async (file: File) => {
    if (!user) return;
    setUploadingCv(true);
    try {
      // Remove old CV if exists
      if (cvPath) {
        await supabase.storage.from("cv-uploads").remove([cvPath]);
      }
      const path = `${user.id}/profile/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("cv-uploads").upload(path, file);
      if (error) throw error;
      setCvPath(path);
      setCvFileName(file.name);
      toast({ title: t.cvUploaded });
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setUploadingCv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCv = async () => {
    if (!user || !cvPath) return;
    await supabase.storage.from("cv-uploads").remove([cvPath]);
    setCvPath(null);
    setCvFileName(null);
    toast({ title: t.cvRemoved });
  };

  const handleGetFeedback = async () => {
    if (!cvPath) return;
    setAnalyzingCv(true);
    setFeedback("");
    setShowFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke("assess-cv", {
        body: { cv_url: cvPath, language: lang },
      });
      if (error) throw error;
      setFeedback(data.feedback);
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
      setShowFeedback(false);
    } finally {
      setAnalyzingCv(false);
    }
  };

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

      {isJobSeeker && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t.myCvTitle}
              </CardTitle>
              <CardDescription>{t.myCvDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cvPath ? (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{cvFileName}</span>
                  <Button size="sm" variant="outline" onClick={handleGetFeedback} disabled={analyzingCv}>
                    {analyzingCv ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                    {t.getAiFeedback}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleRemoveCv}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t.noCvYet}</p>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCvUpload(f);
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCv}
                >
                  {uploadingCv ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {cvPath ? t.replaceCv : t.uploadNewCv}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

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

      <Dialog open={showFeedback} onOpenChange={(o) => !o && setShowFeedback(false)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.aiFeedbackTitle}
            </DialogTitle>
          </DialogHeader>
          {feedback ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {feedback}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regRole, setRegRole] = useState<"employer" | "job_seeker">("job_seeker");
  const [regLoading, setRegLoading] = useState(false);
  const { signIn } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: t.loginError, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      toast({ title: t.error, description: t.passwordTooShort, variant: "destructive" });
      return;
    }
    setRegLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: { full_name: regName, role: regRole },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;

      // Insert role for new user
      if (data.user) {
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: regRole } as any);
      }

      toast({
        title: t.accountCreated,
        description: t.registrationSuccess,
      });
      // Switch to login tab
      setRegEmail("");
      setRegPassword("");
      setRegName("");
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === "en" ? "sv" : "en")}
        >
          <Globe className="h-4 w-4 mr-2" />
          {lang === "en" ? "Svenska" : "English"}
        </Button>
      </div>
      <Card className="w-full max-w-md animate-slide-in">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-2">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">{t.loginTitle}</CardTitle>
          <CardDescription>{t.loginSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">{t.signIn}</TabsTrigger>
              <TabsTrigger value="register">{t.register}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.emailLabel}</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.passwordLabel}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t.signingIn : t.signIn}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.nameLabel}</Label>
                  <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder={t.namePlaceholder} required />
                </div>
                <div className="space-y-2">
                  <Label>{t.emailLabel}</Label>
                  <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder={t.emailPlaceholder} required />
                </div>
                <div className="space-y-2">
                  <Label>{t.passwordLabel}</Label>
                  <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder={t.passwordPlaceholder} required />
                </div>
                <div className="space-y-2">
                  <Label>{t.registerAsLabel}</Label>
                  <Select value={regRole} onValueChange={(v) => setRegRole(v as "employer" | "job_seeker")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="job_seeker">{t.roleJobSeeker}</SelectItem>
                      <SelectItem value="employer">{t.roleEmployer}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? t.creatingAccount : t.register}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "customer">("customer");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !password || !fullName) {
      toast({ title: t.fillAllFields, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user created");

      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: data.user.id, role });
      if (roleErr) throw roleErr;

      await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", data.user.id);

      toast({ title: t.accountCreated, description: t.accountCreatedDesc(fullName, role) });
      setEmail(""); setPassword(""); setFullName(""); setRole("customer");
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.adminTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.adminSubtitle}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{t.createNewAccount}</CardTitle>
          <CardDescription>{t.accountEmailConfirm}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.nameLabel}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Anna Andersson" />
          </div>
          <div className="space-y-2">
            <Label>{t.emailLabel}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} />
          </div>
          <div className="space-y-2">
            <Label>{t.passwordLabel}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div className="space-y-2">
            <Label>{t.roleLabel}</Label>
            <Select value={role} onValueChange={(v: "admin" | "customer") => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">{t.roleCustomer}</SelectItem>
                <SelectItem value="admin">{t.roleAdmin}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? t.creatingAccount : t.createAccount}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

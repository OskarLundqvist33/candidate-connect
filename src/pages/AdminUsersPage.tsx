import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "customer">("customer");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !password || !fullName) {
      toast({ title: "Fyll i alla fält", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Sign up via supabase auth (profile auto-created via trigger)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Ingen användare skapades");

      // Assign role
      const { error: roleErr } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role,
      });
      if (roleErr) throw roleErr;

      // Update profile with name
      await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", data.user.id);

      toast({ title: "Konto skapat", description: `${fullName} (${role}) har skapats` });
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("customer");
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hantera konton</h1>
        <p className="text-muted-foreground text-sm">Skapa nya admin- och kundkonton</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Skapa nytt konto
          </CardTitle>
          <CardDescription>Användaren får ett e-postmeddelande för att bekräfta kontot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Namn</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Anna Andersson" />
          </div>
          <div className="space-y-2">
            <Label>E-post</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anna@foretag.se" />
          </div>
          <div className="space-y-2">
            <Label>Lösenord</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minst 6 tecken" />
          </div>
          <div className="space-y-2">
            <Label>Roll</Label>
            <Select value={role} onValueChange={(v: "admin" | "customer") => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Kund</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={loading}>
            {loading ? "Skapar..." : "Skapa konto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

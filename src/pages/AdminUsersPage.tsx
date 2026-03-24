import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, KeyRound, Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  role: string;
  created_at: string;
}

async function callAdminUsers(action: string, params: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await supabase.functions.invoke("admin-users", {
    body: { action, ...params },
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  // Create form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "customer">("customer");
  const [loading, setLoading] = useState(false);

  // User list
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<UserInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Password dialog
  const [pwUser, setPwUser] = useState<UserInfo | null>(null);
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Role change dialog
  const [roleUser, setRoleUser] = useState<UserInfo | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "customer">("customer");
  const [changingRole, setChangingRole] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await callAdminUsers("list");
      setUsers(data.users || []);
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

      toast({ title: t.accountCreated, description: t.accountCreatedDesc(fullName, role) });
      setEmail(""); setPassword(""); setFullName(""); setRole("customer");
      fetchUsers();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await callAdminUsers("delete", { userId: deleteUser.id });
      toast({ title: t.userDeleted });
      setDeleteUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwUser || newPw.length < 6) {
      toast({ title: t.passwordTooShort, variant: "destructive" });
      return;
    }
    setChangingPw(true);
    try {
      await callAdminUsers("update_password", { userId: pwUser.id, password: newPw });
      toast({ title: t.passwordChanged });
      setPwUser(null);
      setNewPw("");
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setChangingPw(false);
    }
  };

  const handleChangeRole = async () => {
    if (!roleUser) return;
    setChangingRole(true);
    try {
      await callAdminUsers("update_role", { userId: roleUser.id, role: newRole });
      toast({ title: t.roleUpdated });
      setRoleUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t.adminTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.adminSubtitle}</p>
      </div>

      {/* Create new account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />{t.createNewAccount}</CardTitle>
          <CardDescription>{t.accountEmailConfirm}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 tecken" />
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
          </div>
          <Button onClick={handleCreate} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? t.creatingAccount : t.createAccount}
          </Button>
        </CardContent>
      </Card>

      {/* Existing users */}
      <Card>
        <CardHeader>
          <CardTitle>{t.existingUsers}</CardTitle>
          <CardDescription>{t.existingUsersDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.nameLabel}</TableHead>
                    <TableHead>{t.emailLabel}</TableHead>
                    <TableHead>{t.roleLabel}</TableHead>
                    <TableHead className="text-right">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role === "admin" ? t.roleAdmin : t.roleCustomer}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost" size="icon"
                          title={t.changeRole}
                          onClick={() => { setRoleUser(u); setNewRole(u.role as any); }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={t.resetPassword}
                          onClick={() => { setPwUser(u); setNewPw(""); }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title={t.delete}
                          disabled={u.id === currentUser?.id}
                          onClick={() => setDeleteUser(u)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        {t.noUsersFound}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmDeleteUser}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmDeleteUserDesc(deleteUser?.email || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password reset dialog */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.resetPasswordFor(pwUser?.email || "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t.newPassword}</Label>
            <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Min 6 tecken" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>{t.cancel}</Button>
            <Button onClick={handleChangePassword} disabled={changingPw || newPw.length < 6}>
              {changingPw && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.changePassword}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role change dialog */}
      <Dialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.changeRoleFor(roleUser?.email || "")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t.roleLabel}</Label>
            <Select value={newRole} onValueChange={(v: "admin" | "customer") => setNewRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">{t.roleCustomer}</SelectItem>
                <SelectItem value="admin">{t.roleAdmin}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleUser(null)}>{t.cancel}</Button>
            <Button onClick={handleChangeRole} disabled={changingRole}>
              {changingRole && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

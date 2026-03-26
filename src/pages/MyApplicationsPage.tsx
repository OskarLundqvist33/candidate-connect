import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ApplicationWithJob {
  id: string;
  status: string;
  created_at: string;
  jobs: { title: string; location: string | null } | null;
}

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, created_at, jobs(title, location)")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setApplications(data as any);
    };
    fetch();
  }, [user]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      reviewed: "bg-blue-500/10 text-blue-600",
      accepted: "bg-green-500/10 text-green-600",
      rejected: "bg-red-500/10 text-red-600",
    };
    return map[s] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t.myApplicationsTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.myApplicationsSubtitle}</p>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.jobTitle}</TableHead>
              <TableHead>{t.jobLocation}</TableHead>
              <TableHead>{t.applicationStatus}</TableHead>
              <TableHead>{t.appliedDate}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.jobs?.title || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{a.jobs?.location || "—"}</TableCell>
                <TableCell>
                  <Badge className={statusBadge(a.status)}>{t[`status_${a.status}` as keyof typeof t] as string || a.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {t.noApplicationsYet}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

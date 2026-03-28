import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApplicationWithJob {
  id: string;
  status: string;
  created_at: string;
  cv_url: string | null;
  jobs: { title: string; location: string | null } | null;
}

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [feedbackApp, setFeedbackApp] = useState<ApplicationWithJob | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("applications")
        .select("id, status, created_at, cv_url, jobs(title, location)")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setApplications(data as any);
    };
    fetch();
  }, [user]);

  const handleGetFeedback = async (app: ApplicationWithJob) => {
    if (!app.cv_url) {
      toast({ title: t.error, description: t.noCvUploaded, variant: "destructive" });
      return;
    }
    setAnalyzingId(app.id);
    setFeedbackApp(app);
    setFeedback("");
    try {
      const { data, error } = await supabase.functions.invoke("assess-cv", {
        body: { cv_url: app.cv_url, language: lang },
      });
      if (error) throw error;
      setFeedback(data.feedback);
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
      setFeedbackApp(null);
    } finally {
      setAnalyzingId(null);
    }
  };

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
              <TableHead>{t.cvFeedback}</TableHead>
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
                <TableCell>
                  {a.cv_url ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGetFeedback(a)}
                      disabled={analyzingId === a.id}
                    >
                      {analyzingId === a.id ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                      )}
                      {analyzingId === a.id ? t.analyzingCv : t.getCvFeedback}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {applications.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.noApplicationsYet}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!feedbackApp} onOpenChange={(o) => !o && setFeedbackApp(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t.cvFeedbackTitle}
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

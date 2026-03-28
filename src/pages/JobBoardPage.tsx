import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Send, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
};

export default function JobBoardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [savedCvPath, setSavedCvPath] = useState<string | null>(null);
  const [savedCvName, setSavedCvName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
    fetchMyApplications();
    loadSavedCv();
  }, [user]);

  const loadSavedCv = async () => {
    if (!user) return;
    const { data } = await supabase.storage.from("cv-uploads").list(user.id + "/profile", { limit: 1, sortBy: { column: "created_at", order: "desc" } });
    if (data && data.length > 0) {
      const file = data[0];
      setSavedCvPath(`${user.id}/profile/${file.name}`);
      setSavedCvName(file.name.replace(/^\d+_/, ""));
    }
  };

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("status", "open").order("created_at", { ascending: false });
    if (data) setJobs(data);
  };

  const fetchMyApplications = async () => {
    if (!user) return;
    const { data } = await supabase.from("applications").select("job_id").eq("applicant_id", user.id);
    if (data) setAppliedJobIds(new Set(data.map((a: any) => a.job_id)));
  };

  const handleApply = async () => {
    if (!user || !applyJob) return;
    setApplying(true);
    try {
      let cvUrl: string | null = null;
      if (cvFile) {
        const path = `${user.id}/${Date.now()}_${cvFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("cv-uploads").upload(path, cvFile);
        if (uploadErr) throw uploadErr;
        cvUrl = path;
      } else if (savedCvPath) {
        cvUrl = savedCvPath;
      }

      const { error } = await supabase.from("applications").insert({
        job_id: applyJob.id,
        applicant_id: user.id,
        cover_letter: coverLetter.trim() || null,
        cv_url: cvUrl,
      } as any);
      if (error) throw error;

      toast({ title: t.applicationSent });
      setApplyJob(null);
      setCoverLetter("");
      setCvFile(null);
      fetchMyApplications();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t.jobBoardTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.jobBoardSubtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{job.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {job.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3.5 w-3.5" />{job.location}
                </p>
              )}
              {job.description && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{job.description}</p>}
              {appliedJobIds.has(job.id) ? (
                <Badge variant="secondary">{t.alreadyApplied}</Badge>
              ) : (
                <Button size="sm" onClick={() => { setApplyJob(job); setCoverLetter(""); setCvFile(null); }}>
                  <Send className="h-3.5 w-3.5 mr-1" />{t.applyNow}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>{t.noOpenJobs}</p>
          </div>
        )}
      </div>

      <Dialog open={!!applyJob} onOpenChange={(o) => !o && setApplyJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.applyTo} {applyJob?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t.coverLetterLabel}</Label>
              <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} placeholder={t.coverLetterPlaceholder} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>{t.uploadCV}</Label>
              {savedCvPath && !cvFile && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {savedCvName} (from settings)
                </p>
              )}
              <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
            </div>
            <Button onClick={handleApply} className="w-full" disabled={applying}>
              {applying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {t.submitApplication}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

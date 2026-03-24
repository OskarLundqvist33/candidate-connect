import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ExternalLink, Trash2, Pencil, UserPlus, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Job = Database["public"]["Tables"]["jobs"]["Row"];

export default function CandidatesPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assessOpen, setAssessOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [assignCandidateId, setAssignCandidateId] = useState<string>("");
  const [assignJobId, setAssignJobId] = useState<string>("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", linkedin_url: "", notes: "" });
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<string>("");
  const [assessCandidate, setAssessCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    if (user) { fetchCandidates(); fetchJobs(); }
  }, [user]);

  const fetchCandidates = async () => {
    const { data } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
    if (data) setCandidates(data);
  };

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("status", "open").order("title");
    if (data) setJobs(data);
  };

  const handleSave = async () => {
    if (!user || !form.full_name.trim()) return;
    if (editingCandidate) {
      const { error } = await supabase.from("candidates").update(form).eq("id", editingCandidate.id);
      if (error) { toast({ title: t.error, description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("candidates").insert({ ...form, customer_id: user.id });
      if (error) { toast({ title: t.error, description: error.message, variant: "destructive" }); return; }
    }
    setForm({ full_name: "", email: "", phone: "", linkedin_url: "", notes: "" });
    setEditingCandidate(null);
    setOpen(false);
    fetchCandidates();
    toast({ title: editingCandidate ? t.candidateUpdated : t.candidateCreated });
  };

  const handleAssign = async () => {
    if (!user || !assignCandidateId || !assignJobId) return;
    const { error } = await supabase.from("job_candidates").insert({
      candidate_id: assignCandidateId, job_id: assignJobId, customer_id: user.id,
    });
    if (error) {
      toast({ title: t.error, description: error.message.includes("duplicate") ? t.alreadyAssigned : error.message, variant: "destructive" });
      return;
    }
    setAssignOpen(false);
    toast({ title: t.candidateAssigned });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("candidates").delete().eq("id", id);
    fetchCandidates();
  };

  const openEdit = (c: Candidate) => {
    setEditingCandidate(c);
    setForm({ full_name: c.full_name, email: c.email || "", phone: c.phone || "", linkedin_url: c.linkedin_url || "", notes: c.notes || "" });
    setOpen(true);
  };

  const openCreate = () => {
    setEditingCandidate(null);
    setForm({ full_name: "", email: "", phone: "", linkedin_url: "", notes: "" });
    setOpen(true);
  };

  const handleAssess = async (candidate: Candidate) => {
    setAssessingId(candidate.id);
    setAssessCandidate(candidate);
    setAssessment("");
    setAssessOpen(true);

    try {
      // Find jobs this candidate is assigned to
      const { data: jcData } = await supabase.from("job_candidates").select("job_id").eq("candidate_id", candidate.id).limit(1);
      let job: Job | null = null;
      if (jcData && jcData.length > 0) {
        const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jcData[0].job_id).single();
        job = jobData;
      }

      const { data, error } = await supabase.functions.invoke("assess-candidate", {
        body: { candidate, job, language: lang },
      });

      if (error) throw error;
      setAssessment(data.assessment || data.error || "No response");
    } catch (err: any) {
      setAssessment(err.message || "Assessment failed");
    } finally {
      setAssessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.candidatesTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.candidatesSubtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t.newCandidate}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCandidate ? t.editCandidate : t.addCandidate}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t.nameLabel}</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder={t.namePlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.emailLabel}</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t.emailPlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label>{t.phoneLabel}</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+46..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.linkedinLabel}</Label>
                <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label>{t.notesLabel}</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder={t.notesPlaceholder} />
              </div>
              <Button onClick={handleSave} className="w-full">{editingCandidate ? t.save : t.add}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.assignToJob}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={assignJobId} onValueChange={setAssignJobId}>
              <SelectTrigger><SelectValue placeholder={t.selectJob} /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} className="w-full" disabled={!assignJobId}>{t.assign}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Assessment dialog */}
      <Dialog open={assessOpen} onOpenChange={setAssessOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              {t.aiAssessment} — {assessCandidate?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {assessingId ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t.assessing}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap">
                {assessment}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.nameLabel}</TableHead>
              <TableHead>{t.emailLabel}</TableHead>
              <TableHead>{t.phoneLabel}</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead className="w-[180px]">{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{c.email || "–"}</TableCell>
                <TableCell className="text-muted-foreground">{c.phone || "–"}</TableCell>
                <TableCell>
                  {c.linkedin_url ? (
                    <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
                      {t.profile} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "–"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleAssess(c)} title={t.assessCandidate} disabled={assessingId === c.id}>
                      {assessingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setAssignCandidateId(c.id); setAssignJobId(""); setAssignOpen(true); }} title={t.assignToJob}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {candidates.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t.noCandidatesYet}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

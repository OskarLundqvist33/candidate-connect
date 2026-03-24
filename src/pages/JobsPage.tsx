import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Job = Database["public"]["Tables"]["jobs"]["Row"];

export default function JobsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState({ title: "", description: "", location: "", status: "open" });

  useEffect(() => {
    if (user) fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    if (data) setJobs(data);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    if (editingJob) {
      const { error } = await supabase.from("jobs").update({
        title: form.title, description: form.description, location: form.location, status: form.status,
      }).eq("id", editingJob.id);
      if (error) { toast({ title: t.error, description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("jobs").insert({
        title: form.title, description: form.description, location: form.location, status: form.status, customer_id: user.id,
      });
      if (error) { toast({ title: t.error, description: error.message, variant: "destructive" }); return; }
    }
    setForm({ title: "", description: "", location: "", status: "open" });
    setEditingJob(null);
    setOpen(false);
    fetchJobs();
    toast({ title: editingJob ? t.jobUpdated : t.jobCreated });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("jobs").delete().eq("id", id);
    fetchJobs();
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setForm({ title: job.title, description: job.description || "", location: job.location || "", status: job.status });
    setOpen(true);
  };

  const openCreate = () => {
    setEditingJob(null);
    setForm({ title: "", description: "", location: "", status: "open" });
    setOpen(true);
  };

  const statusColor = (s: string) => {
    if (s === "open") return "bg-stage-hired/10 text-stage-hired";
    if (s === "closed") return "bg-stage-rejected/10 text-stage-rejected";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (s: string) => {
    if (s === "open") return t.statusOpen;
    if (s === "closed") return t.statusClosed;
    return t.statusDraft;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.jobsTitle}</h1>
          <p className="text-muted-foreground text-sm">{t.jobsSubtitle}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />{t.newJob}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingJob ? t.editJob : t.createNewJob}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t.jobTitle}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t.jobTitlePlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{t.jobLocation}</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t.jobLocationPlaceholder} />
              </div>
              <div className="space-y-2">
                <Label>{t.jobDescription}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t.jobDescriptionPlaceholder} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>{t.jobStatus}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t.statusOpen}</SelectItem>
                    <SelectItem value="draft">{t.statusDraft}</SelectItem>
                    <SelectItem value="closed">{t.statusClosed}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">{editingJob ? t.saveChanges : t.createJob}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job.id} className="group">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{job.title}</CardTitle>
                <Badge className={statusColor(job.status)}>{statusLabel(job.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {job.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <MapPin className="h-3.5 w-3.5" />{job.location}
                </p>
              )}
              {job.description && <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>}
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="outline" onClick={() => openEdit(job)}><Pencil className="h-3.5 w-3.5 mr-1" />{t.edit}</Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(job.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {jobs.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>{t.noJobsYet}</p>
          </div>
        )}
      </div>
    </div>
  );
}

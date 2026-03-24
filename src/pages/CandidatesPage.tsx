import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ExternalLink, Trash2, Pencil, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type Job = Database["public"]["Tables"]["jobs"]["Row"];

export default function CandidatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [assignCandidateId, setAssignCandidateId] = useState<string>("");
  const [assignJobId, setAssignJobId] = useState<string>("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", linkedin_url: "", notes: "" });

  useEffect(() => {
    if (user) {
      fetchCandidates();
      fetchJobs();
    }
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
      if (error) { toast({ title: "Fel", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("candidates").insert({ ...form, customer_id: user.id });
      if (error) { toast({ title: "Fel", description: error.message, variant: "destructive" }); return; }
    }
    setForm({ full_name: "", email: "", phone: "", linkedin_url: "", notes: "" });
    setEditingCandidate(null);
    setOpen(false);
    fetchCandidates();
    toast({ title: editingCandidate ? "Kandidat uppdaterad" : "Kandidat skapad" });
  };

  const handleAssign = async () => {
    if (!user || !assignCandidateId || !assignJobId) return;
    const { error } = await supabase.from("job_candidates").insert({
      candidate_id: assignCandidateId,
      job_id: assignJobId,
      customer_id: user.id,
    });
    if (error) {
      toast({ title: "Fel", description: error.message.includes("duplicate") ? "Kandidaten är redan kopplad till detta jobb" : error.message, variant: "destructive" });
      return;
    }
    setAssignOpen(false);
    toast({ title: "Kandidat kopplad till jobb" });
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

  const openAssign = (candidateId: string) => {
    setAssignCandidateId(candidateId);
    setAssignJobId("");
    setAssignOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kandidater</h1>
          <p className="text-muted-foreground text-sm">Hantera din kandidatdatabas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Ny kandidat</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCandidate ? "Redigera kandidat" : "Lägg till kandidat"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Namn</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Förnamn Efternamn" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>E-post</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exempel.se" />
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+46..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>LinkedIn URL</Label>
                <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="space-y-2">
                <Label>Anteckningar</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Övrig information..." />
              </div>
              <Button onClick={handleSave} className="w-full">{editingCandidate ? "Spara" : "Lägg till"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Koppla till jobb</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={assignJobId} onValueChange={setAssignJobId}>
              <SelectTrigger><SelectValue placeholder="Välj jobb" /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} className="w-full" disabled={!assignJobId}>Koppla</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead className="w-[140px]">Åtgärder</TableHead>
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
                      Profil <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : "–"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openAssign(c.id)} title="Koppla till jobb">
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
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Inga kandidater ännu. Lägg till din första kandidat!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

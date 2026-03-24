import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, GripVertical, DatabaseIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type CandidateStage = Database["public"]["Enums"]["candidate_stage"];
type Job = Database["public"]["Tables"]["jobs"]["Row"];
type Candidate = Database["public"]["Tables"]["candidates"]["Row"];
type JobCandidate = Database["public"]["Tables"]["job_candidates"]["Row"];

export default function KanbanPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobCandidates, setJobCandidates] = useState<JobCandidate[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const STAGES: { key: CandidateStage; label: string; color: string }[] = [
    { key: "new", label: t.stageNew, color: "bg-stage-new" },
    { key: "screening", label: t.stageScreening, color: "bg-stage-screening" },
    { key: "interview", label: t.stageInterview, color: "bg-stage-interview" },
    { key: "offer", label: t.stageOffer, color: "bg-stage-offer" },
    { key: "hired", label: t.stageHired, color: "bg-stage-hired" },
    { key: "rejected", label: t.stageRejected, color: "bg-stage-rejected" },
  ];

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [jobsRes, candidatesRes, jcRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("candidates").select("*").order("full_name"),
      supabase.from("job_candidates").select("*"),
    ]);
    if (jobsRes.data) setJobs(jobsRes.data);
    if (candidatesRes.data) setCandidates(candidatesRes.data);
    if (jcRes.data) setJobCandidates(jcRes.data);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-data");
      if (error) throw error;
      toast({ title: "Demo data loaded!", description: `${data.jobs || 0} jobs and ${data.candidates || 0} candidates created.` });
      fetchData();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, jcId: string) => {
    setDraggedId(jcId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, stage: CandidateStage) => {
    e.preventDefault();
    if (!draggedId) return;
    const { error } = await supabase.from("job_candidates").update({ stage }).eq("id", draggedId);
    if (error) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
    } else {
      setJobCandidates((prev) => prev.map((jc) => (jc.id === draggedId ? { ...jc, stage } : jc)));
    }
    setDraggedId(null);
  };

  const filteredJC = jobCandidates.filter((jc) => {
    if (selectedJob !== "all" && jc.job_id !== selectedJob) return false;
    if (searchTerm) {
      const candidate = candidates.find((c) => c.id === jc.candidate_id);
      if (!candidate) return false;
      return candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const getCandidateById = (id: string) => candidates.find((c) => c.id === id);
  const getJobById = (id: string) => jobs.find((j) => j.id === id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t.kanbanTitle}</h1>
        <p className="text-muted-foreground text-sm">{t.kanbanSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.searchCandidate} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="w-56"><SelectValue placeholder={t.filterByJob} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allJobs}</SelectItem>
            {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const stageItems = filteredJC.filter((jc) => jc.stage === stage.key);
          return (
            <div key={stage.key} className="kanban-column min-w-[220px] w-[220px] flex-shrink-0"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, stage.key)}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                <span className="text-sm font-semibold">{stage.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{stageItems.length}</Badge>
              </div>
              <div className="space-y-2">
                {stageItems.map((jc) => {
                  const candidate = getCandidateById(jc.candidate_id);
                  const job = getJobById(jc.job_id);
                  if (!candidate) return null;
                  return (
                    <div key={jc.id} className="kanban-card animate-slide-in" draggable onDragStart={(e) => handleDragStart(e, jc.id)}>
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{candidate.full_name}</p>
                          {job && <p className="text-xs text-muted-foreground truncate">{job.title}</p>}
                          {candidate.linkedin_url && (
                            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                              LinkedIn <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {jobCandidates.length === 0 && jobs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">No data yet. Load demo data to see the pipeline in action.</p>
          <Button onClick={handleSeedData} disabled={seeding} variant="outline">
            {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DatabaseIcon className="h-4 w-4 mr-2" />}
            {seeding ? "Loading..." : "Load demo data"}
          </Button>
        </div>
      )}
    </div>
  );
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const customerId = user.id;

    // Check if user already has data
    const { data: existingJobs } = await supabase.from("jobs").select("id").eq("customer_id", customerId).limit(1);
    if (existingJobs && existingJobs.length > 0) {
      return new Response(JSON.stringify({ message: "Demo data already exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seed jobs
    const jobsData = [
      { title: "Frontend Developer", description: "React/TypeScript role. Build modern web apps with our design system.", location: "Stockholm", status: "open", customer_id: customerId },
      { title: "Backend Engineer", description: "Node.js/PostgreSQL. Design APIs and data pipelines.", location: "Gothenburg", status: "open", customer_id: customerId },
      { title: "UX Designer", description: "Create user flows, wireframes, and prototypes for our SaaS platform.", location: "Remote", status: "open", customer_id: customerId },
      { title: "DevOps Engineer", description: "CI/CD, Kubernetes, AWS infrastructure.", location: "Malmö", status: "draft", customer_id: customerId },
      { title: "Product Manager", description: "Drive roadmap and prioritize features for B2B product.", location: "Stockholm", status: "closed", customer_id: customerId },
    ];

    const { data: jobs, error: jobErr } = await supabase.from("jobs").insert(jobsData).select();
    if (jobErr) throw jobErr;

    // Seed candidates
    const candidatesData = [
      { full_name: "Emma Lindqvist", email: "emma.l@example.com", phone: "+46701234567", linkedin_url: "https://linkedin.com/in/emmalindqvist", notes: "5 years React experience. Previously at Klarna. Strong TypeScript skills.", customer_id: customerId },
      { full_name: "Oscar Berg", email: "oscar.b@example.com", phone: "+46709876543", linkedin_url: "https://linkedin.com/in/oscarberg", notes: "Backend specialist. Node.js, Go, PostgreSQL. Led team of 4 at Spotify.", customer_id: customerId },
      { full_name: "Sara Johansson", email: "sara.j@example.com", phone: "+46705551234", linkedin_url: "https://linkedin.com/in/sarajohansson", notes: "UX/UI designer with 7 years experience. Figma expert. Portfolio at sarajdesign.se", customer_id: customerId },
      { full_name: "Erik Nilsson", email: "erik.n@example.com", linkedin_url: "https://linkedin.com/in/eriknilsson", notes: "Junior frontend developer, 1 year experience. Eager learner. React + Vue.", customer_id: customerId },
      { full_name: "Anna Svensson", email: "anna.s@example.com", phone: "+46708887766", notes: "Full-stack developer. 3 years at consulting firm. Java/Spring + React.", customer_id: customerId },
      { full_name: "Karl Andersson", email: "karl.a@example.com", linkedin_url: "https://linkedin.com/in/karlandersson", notes: "DevOps engineer. AWS certified. Terraform, Docker, K8s.", customer_id: customerId },
      { full_name: "Lisa Pettersson", email: "lisa.p@example.com", phone: "+46706665544", notes: "Product manager with fintech background. Data-driven decision maker.", customer_id: customerId },
      { full_name: "Johan Ekström", email: "johan.e@example.com", notes: "Senior backend engineer. 10+ years. Distributed systems experience.", customer_id: customerId },
    ];

    const { data: candidates, error: candErr } = await supabase.from("candidates").insert(candidatesData).select();
    if (candErr) throw candErr;

    // Assign candidates to jobs at various stages
    const assignments = [
      { candidateIdx: 0, jobIdx: 0, stage: "interview" as const },
      { candidateIdx: 3, jobIdx: 0, stage: "screening" as const },
      { candidateIdx: 4, jobIdx: 0, stage: "new" as const },
      { candidateIdx: 1, jobIdx: 1, stage: "offer" as const },
      { candidateIdx: 7, jobIdx: 1, stage: "interview" as const },
      { candidateIdx: 2, jobIdx: 2, stage: "hired" as const },
      { candidateIdx: 5, jobIdx: 3, stage: "new" as const },
      { candidateIdx: 6, jobIdx: 4, stage: "rejected" as const },
    ];

    const jcData = assignments.map((a) => ({
      candidate_id: candidates![a.candidateIdx].id,
      job_id: jobs![a.jobIdx].id,
      stage: a.stage,
      customer_id: customerId,
    }));

    const { error: jcErr } = await supabase.from("job_candidates").insert(jcData);
    if (jcErr) throw jcErr;

    return new Response(JSON.stringify({ message: "Demo data seeded", jobs: jobs!.length, candidates: candidates!.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

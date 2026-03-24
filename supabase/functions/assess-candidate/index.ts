import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { candidate, job, language } = await req.json();

    const candidateInfo = [
      `Name: ${candidate.full_name}`,
      candidate.email ? `Email: ${candidate.email}` : null,
      candidate.phone ? `Phone: ${candidate.phone}` : null,
      candidate.linkedin_url ? `LinkedIn: ${candidate.linkedin_url}` : null,
      candidate.notes ? `Notes/CV: ${candidate.notes}` : null,
    ].filter(Boolean).join("\n");

    const jobInfo = job
      ? `Job: ${job.title}${job.location ? ` (${job.location})` : ""}${job.description ? `\nDescription: ${job.description}` : ""}`
      : "";

    const lang = language === "sv" ? "Swedish" : "English";

    const systemPrompt = `You are a recruitment assistant. Provide a brief, structured assessment of a candidate's fit for a role. Respond in ${lang}. Be concise (max 200 words). Structure your response with: 
1. Overall impression (1-2 sentences)
2. Strengths (2-3 bullet points)  
3. Potential concerns (1-2 bullet points)
4. Recommendation (1 sentence)

If limited information is available, note that and give your best assessment based on what's provided.`;

    const userPrompt = `Assess this candidate:\n\n${candidateInfo}\n\n${jobInfo}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const assessment = data.choices?.[0]?.message?.content || "No assessment generated.";

    return new Response(JSON.stringify({ assessment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assess error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

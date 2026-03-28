import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claimsData?.claims) throw new Error("Unauthorized");

    const { cv_url, language } = await req.json();
    if (!cv_url) throw new Error("cv_url is required");

    // Download the CV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cv-uploads")
      .download(cv_url);
    if (downloadError) throw downloadError;

    const isPdf = cv_url.toString().toLowerCase().endsWith(".pdf");
    const isDocx = cv_url.toString().toLowerCase().endsWith(".docx");
    const isDoc = cv_url.toString().toLowerCase().endsWith(".doc");

    const extractTextFromPdf = (bytes: Uint8Array) => {
      const raw = Array.from(bytes)
        .map((b) => String.fromCharCode(b))
        .join("");
      const matches = raw.match(/\(([^\)]+)\)/g);
      if (!matches) return "";
      return matches
        .map((m) => m.slice(1, -1))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    };

    let cvContent = "";

    if (isPdf) {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        cvContent = extractTextFromPdf(new Uint8Array(arrayBuffer));
      } catch {
        cvContent = "";
      }
    }

    if (!cvContent) {
      try {
        const text = await fileData.text();
        cvContent = text;
      } catch {
        cvContent = "";
      }
    }

    if (!cvContent || cvContent.trim().length === 0) {
      const format = isPdf ? "PDF" : isDocx ? "DOCX" : isDoc ? "DOC" : "unknown";
      cvContent = `Uploaded CV is ${format} and could not be parsed as text. Provide general feedback on this format and suggest converting to a text-based resume if needed.`;
    } else {
      cvContent = cvContent.length > 5000 ? cvContent.substring(0, 5000) : cvContent;
    }

    const lang = language === "sv" ? "Swedish" : "English";

    const systemPrompt = `You are a career coach and CV reviewer. Provide constructive, actionable feedback on the uploaded CV/resume. Respond in ${lang}. Be encouraging but honest. Structure your response:

1. **Overall Impression** (2-3 sentences)
2. **Strengths** (3-4 bullet points)
3. **Areas for Improvement** (3-4 bullet points with specific suggestions)
4. **Formatting & Presentation** (1-2 bullet points)
5. **Score** (X/10 with brief justification)

If the file content is not readable or appears to be binary, mention that and provide general CV tips instead.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please review this CV/resume:\n\n${cvContent}` },
        ],
      }),
    });

    if (!response.ok) {
      const message = response.status === 429
        ? "Rate limited, please try again later."
        : response.status === 402
        ? "Credits exhausted. Add funds in Settings."
        : `AI gateway returned ${response.status}`;
      const bodyText = await response.text();
      console.error("AI error:", response.status, bodyText);
      return new Response(JSON.stringify({ error: message, details: bodyText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content || "No feedback generated.";

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assess-cv error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

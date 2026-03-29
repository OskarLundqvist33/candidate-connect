import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function extractPdfText(fileBytes: Uint8Array): Promise<{ text: string; quality: "good" | "poor" }> {
  try {
    const data = await pdfParse(Buffer.from(fileBytes));
    const text = data.text || "";
    const letterCount = (text.match(/[a-zA-ZåäöÅÄÖ]/g) || []).length;
    const isGood = text.length > 200 && letterCount > 80;
    console.log(`pdf-parse extracted ${text.length} chars, ${letterCount} letters, quality: ${isGood ? "good" : "poor"}`);
    return { text, quality: isGood ? "good" : "poor" };
  } catch (e) {
    console.error("pdf-parse failed:", e);
    return { text: "", quality: "poor" };
  }
}

async function extractWithVision(pdfBytes: Uint8Array, apiKey: string): Promise<string> {
  const base64 = arrayBufferToBase64(pdfBytes.buffer);
  console.log("Using AI vision to extract PDF text...");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Extract all text content from this PDF document. Return only the raw extracted text, preserving structure." },
        { role: "user", content: [
          { type: "text", text: "Extract all text from this PDF:" },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${base64}` } },
        ]},
      ],
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("Vision extraction failed:", response.status, body);
    return "";
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const useAI = !!LOVABLE_API_KEY;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { cv_url, language } = await req.json();
    if (!cv_url) throw new Error("cv_url is required");

    console.log("Downloading CV from path:", cv_url);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("cv-uploads")
      .download(cv_url);
    if (downloadError) {
      console.error("Download error:", downloadError);
      throw downloadError;
    }
    console.log("File downloaded, size:", fileData.size);

    const isPdf = cv_url.toString().toLowerCase().endsWith(".pdf");
    let cvContent = "";

    if (isPdf) {
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const { text, quality } = await extractPdfText(bytes);
      
      if (quality === "good") {
        cvContent = text;
      } else if (useAI) {
        // Try vision-based extraction for scanned/image PDFs
        const visionText = await extractWithVision(bytes, LOVABLE_API_KEY!);
        cvContent = visionText || text; // fall back to whatever pdf-parse got
      } else {
        cvContent = text;
      }
    }

    // Fallback: try reading as plain text
    if (!cvContent) {
      try {
        cvContent = await fileData.text();
      } catch (_e) {
        cvContent = "";
      }
    }

    if (!cvContent || cvContent.trim().length < 20) {
      cvContent = "Unable to extract readable text from the uploaded file.";
    } else {
      cvContent = cvContent.length > 8000 ? cvContent.substring(0, 8000) : cvContent;
    }

    const lang = language === "sv" ? "Swedish" : "English";
    const systemPrompt = `You are a career coach and CV reviewer. Provide constructive, actionable feedback on the uploaded CV/resume. Respond in ${lang}. Be encouraging but honest. Structure your response:

1. **Overall Impression** (2-3 sentences)
2. **Strengths** (3-4 bullet points)
3. **Areas for Improvement** (3-4 bullet points with specific suggestions)
4. **Formatting & Presentation** (1-2 bullet points)
5. **Score** (X/10 with brief justification)

If the content seems unreadable, mention that and provide general CV tips.`;

    let feedback = "";

    if (useAI) {
      try {
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
              { role: "user", content: `Please review this CV/resume:\n\n${cvContent}` },
            ],
          }),
        });

        if (!response.ok) {
          const bodyText = await response.text();
          console.error("AI API error:", response.status, bodyText);
          feedback = `Could not generate AI feedback (${response.status}). Please try again later.`;
        } else {
          const data = await response.json();
          feedback = data.choices?.[0]?.message?.content || "No feedback generated.";
        }
      } catch (apiError) {
        console.error("AI call failed:", apiError);
        feedback = "AI feedback temporarily unavailable. Please try again later.";
      }
    } else {
      feedback = "AI feedback is not configured. Please contact an administrator.";
    }

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

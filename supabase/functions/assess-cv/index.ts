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
    const useAI = !!LOVABLE_API_KEY;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { authorization: authHeader } },
    });

    // The JWT is already verified by Supabase's RLS policies
    // The Storage will check the authorization header and apply RLS policies
    console.log("Authorization header set for authenticated request");

    const { cv_url, language } = await req.json();
    if (!cv_url) throw new Error("cv_url is required");

    // Download the CV file from storage
    const { data: fileData, error: downloadError } = await supabase.storage

      .from("cv-uploads")
      .download(cv_url);
    if (downloadError) {
      console.log("Download error:", downloadError);
      throw downloadError;
    }

    console.log("File downloaded successfully, size:", fileData.size);

    const isPdf = cv_url.toString().toLowerCase().endsWith(".pdf");
    const isDocx = cv_url.toString().toLowerCase().endsWith(".docx");
    const isDoc = cv_url.toString().toLowerCase().endsWith(".doc");

    const extractTextFromPdf = (bytes: Uint8Array) => {
      try {
        // Convert bytes to string
        const raw = Array.from(bytes)
          .map((b) => String.fromCharCode(b))
          .join("");

        // Try multiple extraction methods
        let extracted = "";

        // Method 1: Extract from content streams (BT...ET blocks)
        const btEtMatches = raw.match(/BT[\s\S]*?ET/g);
        if (btEtMatches) {
          extracted = btEtMatches
            .map(block => {
              // Extract text from Tj and TJ operators
              const tjMatches = block.match(/\(([^)]+)\)Tj/g);
              if (tjMatches) {
                return tjMatches.map(m => m.slice(1, -3)).join(" ");
              }
              return "";
            })
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        }

        // Method 2: Fallback to simple parentheses extraction
        if (!extracted) {
          const matches = raw.match(/\(([^\)]+)\)/g);
          if (matches) {
            extracted = matches
              .map((m) => m.slice(1, -1))
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        // Method 3: Look for text in object streams
        if (!extracted) {
          const objMatches = raw.match(/stream[\s\S]*?endstream/g);
          if (objMatches) {
            extracted = objMatches
              .map(stream => {
                const textMatches = stream.match(/\(([^\)]+)\)/g);
                return textMatches ? textMatches.map(m => m.slice(1, -1)).join(" ") : "";
              })
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
          }
        }

        return extracted;
      } catch (e) {
        console.log("PDF extraction error:", e);
        return "";
      }
    };

    let cvContent = "";

    if (isPdf) {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        cvContent = extractTextFromPdf(new Uint8Array(arrayBuffer));
        console.log("PDF extraction result length:", cvContent.length);
      } catch (e) {
        console.log("PDF extraction error:", e);
        cvContent = "";
      }
    }

    if (!cvContent) {
      try {
        const text = await fileData.text();
        cvContent = text;
        console.log("Text extraction result length:", cvContent.length);
      } catch (e) {
        console.log("Text extraction error:", e);
        cvContent = "";
      }
    }

    if (!cvContent || cvContent.trim().length === 0) {
      const format = isPdf ? "PDF" : isDocx ? "DOCX" : isDoc ? "DOC" : "unknown";
      cvContent = `The uploaded CV is in ${format} format. Since I cannot extract readable text from this file, here are some general tips for CV improvement:

1. **Overall Impression**: Your CV format suggests you're using a professional document format, which is good for presentation.

2. **Strengths**:
   - Professional document formatting
   - Likely contains structured information
   - Suitable for formal job applications

3. **Areas for Improvement**:
   - Consider converting to a text-based format for better AI analysis
   - Ensure all text is selectable (not just images)
   - Include clear contact information and professional summary

4. **Formatting & Presentation**:
   - Use standard fonts and clear layout
   - Keep file size reasonable for email attachments

5. **Score**: 6/10 - Good format choice, but text extraction issues prevent detailed analysis.

For personalized feedback, please upload a text-based version or provide your CV content directly.`;
    } else {
      cvContent = cvContent.length > 5000 ? cvContent.substring(0, 5000) : cvContent;
    }

    const lang = language === "sv" ? "Swedish" : "English";
    // Local heuristic-based CV analysis (no API needed)
    const generateLocalFeedback = (cvText: string, lang: string): string => {
      const text = cvText.toLowerCase();
      const wordCount = text.split(/\s+/).length;
      
      // Check for key sections
      const hasExperience = /experience|employment|work history|worked|employed/.test(text);
      const hasEducation = /education|degree|bachelor|master|university|college|diploma/.test(text);
      const hasSkills = /skills|technical|proficiencies|competencies|expertise|able to|proficient/.test(text);
      const hasProjects = /project|developed|built|created|responsible for|led|managed/.test(text);
      const hasAchievements = /award|achievement|recognition|success|improved|increased|delivered|performed/.test(text);
      
      // Check for action verbs (strong vs weak)
      const strongVerbs = /led|managed|developed|created|improved|delivered|achieved|implemented|designed|built|increased|reduced|optimized|transformed/.test(text);
      const weakVerbs = /responsible for|worked on|helped|was involved|used|did|made|helped/.test(text);
      
      // Contact info
      const hasEmail = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/.test(text);
      const hasPhone = /\b\d{1,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/.test(text);
      const hasLinkedin = /linkedin|linkedin\.com/.test(text);
      
      // Length assessment
      const lengthScore = wordCount < 150 ? 4 : wordCount > 800 ? 7 : 8;
      const sectionScore = (hasExperience ? 2 : 0) + (hasEducation ? 2 : 0) + (hasSkills ? 2 : 0) + (hasProjects ? 2 : 0) + (hasAchievements ? 2 : 0);
      const contentScore = strongVerbs ? 8 : weakVerbs ? 6 : 5;
      const contactScore = (hasEmail ? 2 : 0) + (hasPhone ? 1 : 0) + (hasLinkedin ? 1 : 0);
      const overallScore = Math.round((lengthScore + sectionScore + contentScore + contactScore) / 4);

      const strengths = [];
      const improvements = [];

      if (hasExperience) strengths.push("• Clear work experience section with professional history");
      if (hasEducation) strengths.push("• Educational background is clearly documented");
      if (hasSkills) strengths.push("• Specific skills and competencies are highlighted");
      if (hasProjects) strengths.push("• Project examples demonstrate practical application of skills");
      if (strongVerbs) strengths.push("• Uses strong action verbs that showcase impact and achievements");

      if (!hasExperience) improvements.push("✓ Add a dedicated work experience section with job titles, companies, and dates");
      if (!hasEducation) improvements.push("✓ Include your educational qualifications and relevant certifications");
      if (!hasSkills) improvements.push("✓ Create a skills section highlighting your technical and soft skills");
      if (!hasProjects) improvements.push("✓ Add specific project examples showing what you've built or achieved");
      if (wordCount < 150) improvements.push("✓ Expand your CV with more details - aim for 200-500 words");
      if (wordCount > 800) improvements.push("✓ Consider condensing your CV - keep it concise and relevant");
      if (weakVerbs) improvements.push("✓ Replace weak phrases with strong action verbs (led, created, improved, delivered)");
      if (!hasEmail) improvements.push("✓ Include your email address for easy contact");

      const langStr = lang === "sv" ? {
        impression: "**Övergripande intryck**",
        strengths: "**Styrkor**",
        improvements: "**Områden för förbättring**",
        score: "**Poäng**",
        local: "(Lokal analys - ingen AI)",
        tips: "Dina CV visar potentiell, här är specifika tips för att förbättra det:"
      } : {
        impression: "**Overall Impression**",
        strengths: "**Strengths**",
        improvements: "**Areas for Improvement**",
        score: "**Score**",
        local: "(Local analysis - no AI)",
        tips: "Your CV has potential. Here are specific tips to make it stronger:"
      };

      return `${langStr.impression}\n${langStr.tips}\n\n${langStr.strengths}\n${strengths.length > 0 ? strengths.slice(0, 4).join("\n") : "• CV structure is present"}\n\n${langStr.improvements}\n${improvements.slice(0, 5).join("\n")}\n\n${langStr.score}\n${overallScore}/10 - ${langStr.local}. Word count: ${wordCount} words.`;
    };
    const systemPrompt = `You are a career coach and CV reviewer. Provide constructive, actionable feedback on the uploaded CV/resume. Respond in ${lang}. Be encouraging but honest. Structure your response:

1. **Overall Impression** (2-3 sentences)
2. **Strengths** (3-4 bullet points)
3. **Areas for Improvement** (3-4 bullet points with specific suggestions)
4. **Formatting & Presentation** (1-2 bullet points)
5. **Score** (X/10 with brief justification)

If the file content is not readable or appears to be binary, mention that and provide general CV tips instead.`;

    let feedback = "";

    if (useAI) {
      try {
        // Use Lovable AI API if available
        console.log("Calling Lovable AI gateway...");
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
          const message = response.status === 429
            ? "Rate limited, please try again later."
            : response.status === 402
            ? "Credits exhausted. Add funds in Settings."
            : response.status === 401 || response.status === 403
            ? "API key invalid. Using local analysis instead."
            : `AI gateway returned ${response.status}`;
          
          const bodyText = await response.text();
          console.error("Lovable API error:", response.status, bodyText);
          
          // Fall back to local analysis on any API error
          console.log("Falling back to local analysis due to API error");
          feedback = generateLocalFeedback(cvContent, lang);
        } else {
          const data = await response.json();
          feedback = data.choices?.[0]?.message?.content || generateLocalFeedback(cvContent, lang);
          console.log("AI feedback generated successfully");
        }
      } catch (apiError) {
        console.error("Lovable API call failed:", apiError);
        console.log("Falling back to local analysis due to network/parse error");
        feedback = generateLocalFeedback(cvContent, lang);
      }
    } else {
      // Use local heuristic analysis as fallback
      console.log("Using local analysis (no API key configured)");
      feedback = generateLocalFeedback(cvContent, lang);
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

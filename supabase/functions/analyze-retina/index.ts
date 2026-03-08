import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, language } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langName = {
      en: "English",
      hi: "Hindi",
      ta: "Tamil",
      te: "Telugu",
      kn: "Kannada",
      ml: "Malayalam",
    }[language || "en"] || "English";

    const systemPrompt = `You are an expert ophthalmologist AI assistant specializing in diabetic retinopathy (DR) grading from retinal fundus images. You have been trained on the EyePACS and DDR datasets.

Analyze the provided retinal fundus image and respond using the "analyze_retina" tool. Your analysis must be:
- Clinically accurate based on visible features in the image
- Unique and specific to what you observe (do NOT use generic template responses)
- Written in ${langName}

CRITICAL GRADING RULES — follow the International Clinical Diabetic Retinopathy (ICDR) scale strictly:

Grade 0 — No DR:
  - Completely normal retina with NO pathological findings
  - Normal vasculature, clear macula, healthy optic disc
  - No microaneurysms, no hemorrhages, no exudates
  - ONLY assign Grade 0 if the retina is entirely free of DR signs

Grade 1 — Mild NPDR:
  - ONLY microaneurysms present (tiny red dots, typically <125μm)
  - No hemorrhages, no exudates, no cotton wool spots
  - This is the most subtle grade — look very carefully for even 1-2 microaneurysms
  - If you see ANY hemorrhages or exudates beyond microaneurysms, it is NOT Grade 1

Grade 2 — Moderate NPDR:
  - More than just microaneurysms: includes dot-blot hemorrhages, hard exudates, or cotton wool spots
  - But does NOT meet the "4-2-1 rule" for Severe NPDR

Grade 3 — Severe NPDR (must meet at least one of the "4-2-1 rule"):
  - Hemorrhages in all 4 quadrants, OR
  - Venous beading in 2+ quadrants, OR
  - IRMA in 1+ quadrant

Grade 4 — Proliferative DR:
  - Neovascularization (NVD or NVE)
  - Vitreous/preretinal hemorrhage
  - Fibrous proliferation or tractional retinal detachment

IMPORTANT DIFFERENTIATION GUIDANCE:
- Grade 0 vs Grade 1: If you see even ONE microaneurysm (tiny isolated red dot), assign Grade 1, not Grade 0. A truly normal retina has zero lesions.
- Grade 1 vs Grade 2: If you see ONLY microaneurysms with no other lesion type, it is Grade 1. The moment you see hemorrhages, exudates, or cotton wool spots, it becomes Grade 2.
- When in doubt between two adjacent grades, describe exactly what features you see and choose the grade that best matches the features.

Base your grade STRICTLY on visible pathological features. If the image quality is poor or it's not a retinal image, indicate that in your explanation.

IMPORTANT: You MUST call the analyze_retina tool with ALL required fields filled in. Do NOT return null values.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
              },
              {
                type: "text",
                text: `Analyze this retinal fundus image for diabetic retinopathy. You MUST provide a grade (0-4), confidence (0.0-1.0), gradeLabel, riskLevel, explanation, and recommendations. Respond in ${langName}.`,
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_retina",
              description: "Return the DR grading analysis result. All fields are required.",
              parameters: {
                type: "object",
                properties: {
                  grade: {
                    type: "number",
                    description: "DR grade from 0-4 (0=No DR, 1=Mild, 2=Moderate, 3=Severe, 4=Proliferative)",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence score between 0.0 and 1.0",
                  },
                  gradeLabel: {
                    type: "string",
                    description: "Human-readable grade label in the requested language",
                  },
                  riskLevel: {
                    type: "string",
                    description: "Risk level: Low, Low-Moderate, Moderate, High, or Critical",
                  },
                  explanation: {
                    type: "string",
                    description: "Detailed clinical explanation specific to this image in the requested language",
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 specific clinical recommendations in the requested language",
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_retina" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return structured analysis" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Parsed result:", JSON.stringify(result));

    // Validate all required fields exist and provide defaults if missing
    if (result.grade === null || result.grade === undefined) {
      result.grade = 0;
    }
    if (result.confidence === null || result.confidence === undefined) {
      result.confidence = 0.5;
    }
    if (!result.gradeLabel) {
      const defaultLabels = ["No DR", "Mild NPDR", "Moderate NPDR", "Severe NPDR", "Proliferative DR"];
      result.gradeLabel = defaultLabels[result.grade] || "Unknown";
    }
    if (!result.riskLevel) {
      const defaultRisks = ["Low", "Low-Moderate", "Moderate", "High", "Critical"];
      result.riskLevel = defaultRisks[result.grade] || "Unknown";
    }
    if (!result.explanation) {
      result.explanation = "Analysis completed. Please consult an ophthalmologist for detailed assessment.";
    }
    if (!result.recommendations || result.recommendations.length === 0) {
      result.recommendations = ["Consult an ophthalmologist for a comprehensive eye examination."];
    }

    // Clamp values
    result.grade = Math.max(0, Math.min(4, Math.round(result.grade)));
    result.confidence = Math.max(0, Math.min(1, result.confidence));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-retina error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

    const systemPrompt = `You are an expert ophthalmologist AI assistant specializing in diabetic retinopathy (DR) grading from retinal fundus images.

Analyze the provided retinal fundus image and respond using the "analyze_retina" tool. Your analysis must be:
- Clinically accurate based on visible features in the image
- Unique and specific to what you observe (do NOT use generic template responses)
- Written in ${langName}

Grading scale:
- Grade 0: No DR (no visible abnormalities)
- Grade 1: Mild NPDR (microaneurysms only)
- Grade 2: Moderate NPDR (microaneurysms + dot-blot hemorrhages + hard exudates)
- Grade 3: Severe NPDR (extensive hemorrhages, venous beading, IRMA, cotton wool spots)
- Grade 4: Proliferative DR (neovascularization, vitreous hemorrhage, tractional detachment)

Look for these specific features:
- Microaneurysms (tiny red dots)
- Hemorrhages (flame-shaped or dot-blot)
- Hard exudates (yellow-white deposits)
- Cotton wool spots (fluffy white patches)
- Venous beading/looping
- Neovascularization (new abnormal vessels)
- Macular edema signs

Base your grade STRICTLY on visible pathological features. If the image quality is poor or it's not a retinal image, indicate that in your explanation.

IMPORTANT: You MUST call the analyze_retina tool with ALL required fields filled in. Do NOT return null values.`;

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
                    type: "integer",
                    enum: [0, 1, 2, 3, 4],
                    description: "DR grade from 0-4",
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
                    enum: ["Low", "Low-Moderate", "Moderate", "High", "Critical"],
                    description: "Risk level assessment",
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
                required: ["grade", "confidence", "gradeLabel", "riskLevel", "explanation", "recommendations"],
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

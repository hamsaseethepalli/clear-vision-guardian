import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, language, onnxGrade, onnxGradeLabel, onnxRiskLevel } = await req.json();

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

    const hasOnnxGrade = onnxGrade !== undefined && onnxGrade !== null;
    
    const gradeContext = hasOnnxGrade 
      ? `\n\nCRITICAL: A specialized retinopathy classification model has determined this image is Grade ${onnxGrade} (${onnxGradeLabel}, Risk: ${onnxRiskLevel}). You MUST use this exact grade (${onnxGrade}). Do NOT change the grade under any circumstances. Your job is ONLY to provide a detailed clinical explanation and recommendations consistent with Grade ${onnxGrade}.`
      : "";

    const systemPrompt = `You are an expert ophthalmologist AI specialized in diabetic retinopathy (DR) grading using the International Clinical Diabetic Retinopathy (ICDR) severity scale. Analyze the retinal fundus image and respond using the "analyze_retina" tool. Write all text in ${langName}.

STRICT GRADING CRITERIA (ICDR Scale):
- Grade 0 (No DR): NO microaneurysms, NO hemorrhages, NO exudates, NO cotton wool spots, NO IRMA, NO venous beading, NO neovascularization. Completely normal retina.
- Grade 1 (Mild NPDR): ONLY microaneurysms present. No other lesions. If you see ANY hemorrhages, hard exudates, or cotton wool spots beyond just microaneurysms, it is NOT Grade 1.
- Grade 2 (Moderate NPDR): More than just microaneurysms but less than severe NPDR. May include: dot-blot hemorrhages, hard exudates, cotton wool spots, but NOT meeting the 4-2-1 rule.
- Grade 3 (Severe NPDR): Must meet at least ONE of the 4-2-1 rule criteria: (a) >20 intraretinal hemorrhages in each of 4 quadrants, OR (b) definite venous beading in ≥2 quadrants, OR (c) prominent IRMA in ≥1 quadrant. NO neovascularization.
- Grade 4 (Proliferative DR): Neovascularization (NVD or NVE) and/or vitreous/preretinal hemorrhage. Fibrovascular proliferation may be present.

IMPORTANT GRADING RULES:
- Be precise. Grade 1 means ONLY microaneurysms, nothing else.
- If you see hemorrhages + exudates, it's at LEAST Grade 2.
- If image quality is poor, state that in explanation but still provide your best assessment.
- Do NOT default to Grade 0 unless you are confident the retina is truly normal.${gradeContext}

Provide a detailed, image-specific clinical explanation describing exactly what lesions you observe and where. List 3-5 actionable clinical recommendations appropriate for the grade.

IMPORTANT: Call the analyze_retina tool with ALL fields. Do NOT return null values.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
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
                text: `Carefully analyze this retinal fundus image for diabetic retinopathy. Look for: microaneurysms, dot-blot hemorrhages, hard exudates, cotton wool spots, venous beading, IRMA, neovascularization. Grade strictly using the ICDR scale (0-4). Provide grade, confidence (0.0-1.0), gradeLabel, riskLevel, explanation, and recommendations. All text must be in ${langName}.`,
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_retina",
              description: "Return the DR grading analysis result. All fields are required and must not be null.",
              parameters: {
                type: "object",
                properties: {
                  grade: {
                    type: "number",
                    description: "DR grade 0-4 using ICDR scale (0=No DR, 1=Mild NPDR - microaneurysms only, 2=Moderate NPDR, 3=Severe NPDR - 4-2-1 rule, 4=PDR - neovascularization)",
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
                    description: "Detailed clinical explanation listing specific lesions observed and their locations in the requested language",
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

    // Validate and provide defaults for missing fields
    if (result.grade === null || result.grade === undefined) result.grade = 0;
    if (result.confidence === null || result.confidence === undefined) result.confidence = 0.5;
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

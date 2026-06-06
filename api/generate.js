export const config = { runtime: "edge" };

const CLAUDE_KEY = process.env.CLAUDE_KEY;
const HIGGS_ID = process.env.HIGGS_ID;
const HIGGS_SECRET = process.env.HIGGS_SECRET;

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const { prompt, width = 1280, height = 720 } = await req.json();
  if (!prompt) return new Response(JSON.stringify({ error: "No prompt" }), { status: 400 });

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      system: `You are an expert AI visual prompt engineer. Transform the user's short prompt into a highly detailed, cinematic, rich image generation prompt. Output ONLY the expanded prompt, no explanation, no preamble. Add lighting, camera angle, color palette, texture, mood, atmosphere. Use photography and cinematography terminology. Length: 100-200 words. Language: English.`,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const claudeData = await claudeRes.json();
  const expanded = claudeData?.content?.[0]?.text?.trim();
  if (!expanded) return new Response(JSON.stringify({ error: "Claude failed", detail: claudeData }), { status: 500 });

  const aspectMap = {
    "1280x720": "16:9",
    "720x1280": "9:16",
    "1024x1024": "1:1",
    "1024x768": "4:3",
  };
  const aspect_ratio = aspectMap[`${width}x${height}`] || "16:9";

  const higgsRes = await fetch("https://platform.higgsfield.ai/higgsfield-ai/soul/standard", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Key ${HIGGS_ID}:${HIGGS_SECRET}`,
    },
    body: JSON.stringify({ prompt: expanded, aspect_ratio, resolution: "720p" }),
  });

  const higgsData = await higgsRes.json();
  const imageUrl = higgsData?.images?.[0]?.url || higgsData?.url || null;

  return new Response(
    JSON.stringify({ expanded, imageUrl, raw: higgsData }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}

export const config = { runtime: "edge" };

const CLAUDE_KEY = process.env.CLAUDE_KEY;

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

  const encoded = encodeURIComponent(expanded);
  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true`;

  return new Response(
    JSON.stringify({ expanded, imageUrl }),
    { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
  );
}

export async function fetchGptSuggestions(prompt: string): Promise<string[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content || "";
  return text.split("\n").filter((line: string) => line.trim() !== "");
}

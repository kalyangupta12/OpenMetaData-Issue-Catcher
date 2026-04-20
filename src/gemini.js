import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

/**
 * Generate a compelling, human-like GitHub comment to claim an issue.
 * @param {Object} issue - The GitHub issue object
 * @returns {Promise<string>} Generated comment text
 */
export async function generateClaimComment(issue) {
  const prompt = `You are a passionate open-source developer trying to contribute to the OpenMetadata project. 
Write a concise, genuine, and enthusiastic GitHub comment to claim the following issue.

Issue Title: ${issue.title}
Issue Body: ${issue.body ? issue.body.substring(0, 1500) : "No description provided."}
Issue Labels: ${issue.labels.map((l) => l.name).join(", ")}
Issue URL: ${issue.html_url}

Requirements for your comment:
1. Express genuine interest and enthusiasm for contributing
2. Briefly mention your relevant skills (TypeScript/Java/Python, distributed systems, data platforms, APIs)
3. Ask to be assigned to the issue
4. Mention you'll submit a PR soon
5. Keep it SHORT (3-5 sentences max), professional and human
6. Do NOT use markdown headers or bullet points - just natural paragraph text
7. End with asking the maintainer to assign the issue to you
8. Be specific about the issue - reference the actual problem being solved if possible

Write ONLY the comment text, nothing else.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text;
  } catch (err) {
    // Fallback comment if Gemini fails
    console.error("[Gemini] Error generating comment, using fallback:", err.message);
    return `Hi! I'm very interested in working on this issue. I have experience with TypeScript, Java, and data platform integrations, and I believe I can provide a solid fix here. Could a maintainer please assign this issue to me? I'll submit a PR as soon as possible!`;
  }
}

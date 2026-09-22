const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey() {
  return process.env.GEMINI_API_KEY || '';
}

function getModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

/**
 * Low-level call to Gemini API using native fetch
 */
async function callGemini(prompt, systemInstruction = null) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const model = getModel();
  const url = `${GEMINI_API_URL}/${model}:generateContent`;

  const bodyPayload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    }
  };

  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

/**
 * Safely parse JSON from model output that might be wrapped in ```json ... ``` markdown
 */
function parseJsonFromText(rawText) {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        // ignore
      }
    }
    return null;
  }
}

/**
 * 1. Smart AI Priority & Severity Classification
 */
async function classifyComplaintPriority({ title, description, categoryName = '', categories = [] }) {
  try {
    const systemPrompt = `You are an AI Incident Triage Engine for an institutional facility and smart complaint management system.
Evaluate the severity, safety hazard, infrastructure risk, operational disruption, and emergency level of the complaint.
Priorities must be one of:
- 'CRITICAL': Life safety hazard, fire, gas leak, high-voltage electric shock, major active flood, server room collapse, severe physical security breach.
- 'HIGH': Major service disruption affecting many people (power outage in a block, network backbone failure, overflowing sewage, broken main door/gate).
- 'MEDIUM': Localized disruptions (air conditioner failing, broken projector in lecture hall, malfunctioning tap, noisy fan, dirty washroom).
- 'LOW': Minor cosmetic or convenience requests (minor paint touch-up, bulb replacement in empty corridor, non-urgent general inquiry).

Output strictly valid JSON with this exact format:
{
  "suggestedPriority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "reason": "1-2 concise, clear sentences explaining why this priority was assigned.",
  "urgencyScore": 1-10,
  "suggestedCategoryName": "Name of best matching category from provided list, or empty if already appropriate",
  "matchedKeywords": ["keyword1", "keyword2"]
}`;

    const categoriesListStr = categories.map(c => `"${c.name}"`).join(', ');

    const userPrompt = `Complaint Title: "${title}"
Description: "${description}"
Current Selected Category: "${categoryName}"
Available Categories: [${categoriesListStr}]

Evaluate and return JSON:`;

    const raw = await callGemini(userPrompt, systemPrompt);
    const parsed = parseJsonFromText(raw);
    if (parsed && parsed.suggestedPriority) {
      return {
        ...parsed,
        aiPowered: true,
      };
    }
  } catch (error) {
    console.warn('[Gemini AI] Priority classification fallback triggered:', error.message);
  }
  return null;
}

/**
 * 2. AI Complaint Description Enhancer
 */
async function enhanceComplaintText({ title, description, categoryName = '' }) {
  const systemPrompt = `You are a helpful Complaint Assistant for students and staff.
The user wants to file a complaint. Rewrite and structure their rough text into a clear, professional, well-formatted complaint report that maintenance teams can act on immediately.
Include:
- Clear concise Title
- Structured Description with:
  * Summary of Problem
  * Exact Location / Equipment Details (if mentioned or prompt user to fill)
  * Impact / Observations
Keep tone objective, polite, and actionable.

Return strictly JSON:
{
  "enhancedTitle": "Polished concise title",
  "enhancedDescription": "Structured formatted description with line breaks",
  "tips": "Brief advice on what extra info or photos might help resolve faster"
}`;

  const userPrompt = `Category: ${categoryName}
Draft Title: ${title}
Draft Description: ${description}

Enhance this draft:`;

  const raw = await callGemini(userPrompt, systemPrompt);
  const parsed = parseJsonFromText(raw);
  if (!parsed) {
    throw new Error('Could not parse AI response');
  }
  return parsed;
}

/**
 * 3. AI Resolution & Troubleshooting Advisor for Staff/Admin
 */
async function getResolutionAdvice({ complaintNumber, title, description, category, priority, location }) {
  const systemPrompt = `You are an expert Facility & Operations Engineering Advisor for institutional maintenance.
Given a student/staff complaint, generate an actionable resolution guide for the assigned technician/admin.

Return strictly JSON:
{
  "rootCauseAnalysis": "Potential underlying causes of this incident",
  "actionSteps": [
    "Step 1: Specific inspection or safety protocol",
    "Step 2: Tools or replacement parts likely needed",
    "Step 3: Verification test before closing"
  ],
  "estimatedResolutionHours": 2,
  "safetyPrecautions": "Crucial safety warnings (e.g. isolate power before servicing)",
  "resolutionNoteTemplate": "A professional resolution message ready to be sent to the complainant once fixed"
}`;

  const userPrompt = `Complaint ID: ${complaintNumber}
Title: ${title}
Category: ${category}
Priority: ${priority}
Location: ${location || 'Not specified'}
Description: ${description}

Provide technical resolution guide:`;

  const raw = await callGemini(userPrompt, systemPrompt);
  const parsed = parseJsonFromText(raw);
  if (!parsed) {
    throw new Error('Could not parse AI advice response');
  }
  return parsed;
}

/**
 * 4. General AI Complaint Assistant / Q&A
 */
async function askComplaintAssistant(question, conversationHistory = []) {
  const systemPrompt = `You are "SmartAssist AI", the friendly and intelligent assistant for the Institutional Smart Complaint Management System.
You help students, faculty, and staff:
- Understand how to register complaints and attach evidence
- Check SLA resolution expectations (Critical: 4-6h, High: 12-24h, Medium: 24-48h, Low: 48-72h)
- Know which department handles which issues (IT Support, Electrical, Maintenance, Security, Housekeeping, Transport, Hostel, Administration)
- Know how escalations and feedback ratings work.
Be concise, helpful, and polite. Use formatting with bullet points when helpful.`;

  const userPrompt = `User question: "${question}"`;
  const raw = await callGemini(userPrompt, systemPrompt);
  return { answer: raw.trim() };
}

module.exports = {
  callGemini,
  classifyComplaintPriority,
  enhanceComplaintText,
  getResolutionAdvice,
  askComplaintAssistant,
};

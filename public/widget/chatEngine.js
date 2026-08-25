function formatContextForPrompt(context) {
  const successfulPages = context.pages.filter((p) => p.status === "success");
  const successfulApis = context.apis.filter((a) => a.status === "success");

  const pageSections = successfulPages.map(
    (p) => `--- Content from ${p.url} ---\n${p.content}`,
  );

  const apiSections = successfulApis.map(
    (a) => `--- Data from "${a.name}" ---\n${JSON.stringify(a.data, null, 2)}`,
  );

  const combinedText = [...pageSections, ...apiSections].join("\n\n");

  const failedSources = [
    ...context.pages.filter((p) => p.status !== "success").map((p) => p.url),
    ...context.apis.filter((a) => a.status !== "success").map((a) => a.name),
  ];

  return { text: combinedText, failedSources };
}

function parseModelResponse(rawText) {
  try {
    const parsed = JSON.parse(rawText);

    if (
      typeof parsed.answer === "string" &&
      typeof parsed.answerFound === "boolean"
    ) {
      return {
        answer: parsed.answer,
        answerFound: parsed.answerFound,
        wellFormed: true,
      };
    }

    return { answer: rawText, answerFound: null, wellFormed: false };
  } catch {
    return { answer: rawText, answerFound: null, wellFormed: false };
  }
}

function buildSystemPrompt(contextText) {
  const systemPrompt = `
  You are a website assistant embedded in a chat widget. Your job is to help users based strictly on the provided context.

CRITICAL RULES:
1. You must answer the user's question using ONLY the provided Context Text below. Do not guess, make up information, or use any outside knowledge.
2. Your response must be strictly valid JSON in the exact format specified below. Do not include any introductory text, markdown formatting (like \`\`\`json), or concluding text. Output ONLY the raw JSON object.

JSON SHAPE:
{
  "answer": "Your answer string here, or a polite message stating the information was not found.",
  "answerFound": true or false
}

If the answer cannot be found completely within the provided Context Text, you must set "answerFound" to false.

CONTEXT TEXT:
${contextText}
 `.trim();
  return systemPrompt;
}

async function askAssistant({
  userMessage,
  pageUrls,
  apiConfigs,
  chatFn,
  timeoutMs = 4000,
}) {
  // your code here
  const rawContext = await gatherFullContext({
    pageUrls,
    apiConfigs,
    timeoutMs,
  });
  const { text, failedSources } = formatContextForPrompt(rawContext);
  const systemPrompt = buildSystemPrompt(text);
  const rawReply = await chatFn({
    systemPrompt: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const parsedResult = parseModelResponse(rawReply);

  return {
    ...parsedResult,
    failedSources: failedSources,
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    formatContextForPrompt,
    parseModelResponse,
    buildSystemPrompt,
    askAssistant,
  };
}

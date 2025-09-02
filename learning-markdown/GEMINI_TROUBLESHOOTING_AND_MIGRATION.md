### Gemini 500 Error: Troubleshooting and SDK Migration Notes

This document explains the 500 error encountered when generating prompts with Gemini, the root cause, and the full set of changes implemented to fix it. It also records the migration from the deprecated `@google/generative-ai` package to the new `@google/genai` SDK.

---

### Symptoms
- UI displayed: "Generation Failed" with a 500 response: `{ "error": "Failed to generate prompt", "errorId": "..." }`.
- Server returned a generic 500 from `PromptSculptor/server/routes.ts` during Gemini prompt generation.

### Root Cause
- The server used the deprecated SDK `@google/generative-ai` and its older usage pattern (`getGenerativeModel(...).generateContent(...)`).
- The code also relied on a model id that may not be recognized in the legacy library path and usage, leading to an error that surfaced as a 500.

### Fix Overview
1. Migrated code to the new official Google Gen AI SDK: `@google/genai`.
2. Updated all Gemini client creation and usage patterns:
   - Before: `new GoogleGenerativeAI(apiKey)` → `getGenerativeModel(...).generateContent(...)`
   - After: `new GoogleGenAI({ apiKey })` → `ai.models.generateContent({ model, contents, config? })`
3. Standardized the default model id to a supported value and made it configurable:
   - Default: `gemini-2.5-flash`
   - Optional override via env: `GEMINI_MODEL`

---

### Dependency Changes
- Installed: `@google/genai`
- Removed: `@google/generative-ai` (deprecated)

Commands executed:
```bash
npm i @google/genai && npm rm @google/generative-ai
```

---

### Files Updated
- `PromptSculptor/server/services/apiKeyManager.ts`
  - Import changed to `import { GoogleGenAI } from "@google/genai"`
  - Singleton type changed to `GoogleGenAI | null`
  - Initialization changed to `new GoogleGenAI({ apiKey })`

- `PromptSculptor/server/services/userApiKeyManager.ts`
  - Import changed to `import { GoogleGenAI } from "@google/genai"`
  - Cache and union types updated to include `GoogleGenAI`
  - Client creation changed to `new GoogleGenAI({ apiKey })`

- `PromptSculptor/server/services/promptGenerator.ts`
  - Import changed to `import { GoogleGenAI, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai"`
  - Handling of the Gemini client updated to route non-OpenAI/Anthropic clients to the Gemini path
  - Generation call refactored to:
    ```ts
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: fullPrompt,
      // config: { temperature: 0.7 }
    } as GenerateContentParameters);
    const text = response.text ?? '';
    ```
  - Parsing made robust against non-JSON responses by stripping ```json fences when present; falls back to using raw text

---

### Before vs After (Representative Snippets)

Before (deprecated library and usage):
```ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const gemini = new GoogleGenerativeAI(apiKey);
const model = gemini.getGenerativeModel({ model: "gemini-2.5-flash" });
const result = await model.generateContent(fullPrompt);
const text = result.response.text();
```

After (current SDK and usage):
```ts
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey });
const response = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  contents: fullPrompt,
});
const text = response.text ?? '';
```

---

### Environment Variables
- `GEMINI_API_KEY`: Required for server-side Gemini calls.
- `GEMINI_MODEL` (optional): Override default model id. Defaults to `gemini-2.5-flash`.

---

### Verification Steps
1. Kill and restart the server.
2. In the UI, select target model "Gemini" and generate a prompt.
3. Expected: Success response with generated content, or a graceful demo-mode fallback—no 500 error.

---

### Operational Notes
- The new SDK uses named exports; import style differs from OpenAI/Anthropic:
  - OpenAI/Anthropic: default export (`import OpenAI from "openai"`) / (`import Anthropic from "@anthropic-ai/sdk"`)
  - Google Gen AI: named export (`import { GoogleGenAI } from "@google/genai"`)
- Error class in the new SDK is `ApiError` (not used directly in this fix but relevant for future handling).

---

### Rollback
If you must revert:
1. Reinstall the deprecated package: `npm i @google/generative-ai`
2. Restore previous imports and usage (`getGenerativeModel(...).generateContent(...)`)
3. Remove `@google/genai`

Note: Rollback is not recommended since the legacy SDK is deprecated.



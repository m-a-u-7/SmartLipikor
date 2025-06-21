

// API_KEY is expected to be set externally via environment variables
// Type declarations for globalThis.process are in global.d.ts.
// The application now strictly relies on the execution environment to provide globalThis.process.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { FormattedBlock, FormattedParagraphBlock, FormattedTableBlock, TextSpan, ChatMessage } from './types'; // Added ChatMessage
import { ImageUploader } from './components/ImageUploader';
import { FormattedTextViewer } from './components/FormattedTextViewer';
import { Toolbar } from './components/Toolbar';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { ChatWithAI } from './components/ChatWithAI'; // New component
import { generateDocx, generatePdf, generateImage } from '@/services/exportService'; 
import { Eye, EyeOff } from 'lucide-react'; // For Print Layout Toggle

let apiKeyFromEnv: string | undefined = undefined;
let nodeEnv: string | undefined = undefined;

try {
  // Check if globalThis and process and process.env are available
  if (typeof globalThis !== 'undefined' && 
      globalThis.process && 
      typeof globalThis.process.env === 'object' && 
      globalThis.process.env !== null) {
    apiKeyFromEnv = globalThis.process.env.API_KEY;
    nodeEnv = globalThis.process.env.NODE_ENV;
  }
} catch (e) {
  // This catch block is a fallback for unusual environments where accessing globalThis.process might throw.
  // The primary checks above should prevent most errors.
  console.warn("Could not access process.env. API key and NODE_ENV might not be available directly.", e);
}

const API_KEY = apiKeyFromEnv;
let ai: GoogleGenAI | undefined;

if (API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    // ai remains undefined
  }
} else {
  let isTestEnvironment = false;
  // Use the safely retrieved nodeEnv
  if (nodeEnv === "test") {
    isTestEnvironment = true;
  }

  if (!isTestEnvironment) {
    console.warn("API Key (API_KEY in process.env) is not set or process.env is not accessible. The application will not be able to connect to the Gemini API.");
  }
}

const promptPart1 = `YOUR ABSOLUTE, NON-NEGOTIABLE PRIMARY OBJECTIVE IS FLAWLESS, MAXIMUM ACCURACY IN VERBATIM TEXT EXTRACTION AND VISUAL FORMATTING REPLICATION. THIS INCLUDES DIFFICULT, BLURRY, AND HANDWRITTEN TEXT WHERE POSSIBLE. ERRORS ARE NOT ACCEPTABLE.
This is not a basic OCR task. You are expected to perform advanced document analysis and intelligent character recognition, focusing on precise visual data.

TEXT ACCURACY AND MINOR CORRECTIONS:
Your primary goal is to produce a VERBATIM transcription of the image content.
When encountering slightly blurry or ambiguous characters/words that are difficult to discern directly, you may use contextual understanding of the *immediate surrounding legible text* to help decipher those specific difficult characters/words. This is ONLY for disambiguation of visually challenging parts.
HOWEVER, for extremely minor, obvious single-character typographical errors within a word (e.g., "aplication" instead of "application", or a clear transposition like "teh" for "the") where the correction is trivial, unambiguously clear from the immediate surrounding context and common language usage, AND does not change the intended meaning, you MAY make the correction. THIS IS A STRICT EXCEPTION AND SHOULD BE USED SPARINGLY.
If there is ANY doubt, or if the "error" could be intentional, or if it's more than a single character, or if it changes meaning significantly, YOU MUST TRANSCRIBE VERBATIM AS IT APPEARS IN THE IMAGE. Do not alter text that is visually legible in the image, even if it appears to be a typo or grammatical error, unless it meets this very strict, narrow criterion for minor correction. When in doubt, always prioritize verbatim transcription. Do not "improve" or "normalize" grammar or phrasing found in the image.

FORMATTING ACCURACY:
PAY EXTREME, METICULOUS ATTENTION TO:
- PRECISE FONT NAMES: Identify actual names like 'Arial', 'SutonnyMJ', 'Times New Roman' if visually discernible. Do not just categorize unless the specific name is impossible to determine.
- FONT SIZE: Even subtle variations matter. Aim for exact point sizes (e.g., 10pt, 12.5pt) if inferable from the visual scale.
- PRECISE TEXT COLOR: Provide HEX CODES for ALL text elements.
- BOLDNESS: Identify all instances of bold (using \`isBold: true\` and appropriate \`fontWeight\`), even subtle bolding.
- ITALICS, UNDERLINE, STRIKETHROUGH: Accurately detect and represent these styles.
- LINE HEIGHT: Replicate the visual line height accurately relative to font size.
- PARAGRAPH SPACING: Capture space before and after paragraphs precisely.
- ALIGNMENT: Left, center, right, justify.
- **CRITICAL WHITESPACE HANDLING: Accurate representation of tabs and multiple spaces is ESSENTIAL for visual fidelity.**
  - **TAB STOPS:** If you visually detect a tab indentation, you MUST represent it with a '\\t' character in the JSON string.
  - **MULTIPLE SPACES:** If you visually detect a sequence of two or more spaces, you MUST preserve ALL of those spaces in the JSON string. Do NOT collapse them into a single space.
  - **Distinguishing Tabs from Spaces:** If it's visually ambiguous whether an indentation is a tab or multiple spaces, use your best judgment. If it creates a clear, sharp indentation typical of a tab stop, prefer '\\t'. Otherwise, represent the visible spaces.
- TABLE STRUCTURES: Including cells, rows, headers, merged cells, borders (style, color, width), and cell backgrounds.
- NUMERALS AND SYMBOLS: Accurate transcription of all numerals (e.g., 123, IV, рззрзж), ordinal indicators (e.g., 1st, 2nd, рзйржпрж╝, рззржо), mathematical symbols (e.g., E = mc┬▓, HтВВO), currency symbols (e.g., $, тВм, ┬г, тВ╣), and other special characters is ABSOLUTELY CRITICAL.
- EMOJIS: Flawless recognition and transcription of emojis as Unicode characters (e.g., тЬи, тВм, тЬУ, ЁЯдФ).

These visual details are PARAMOUNT for accurately replicating the original document's appearance. YOUR RESPONSES WILL BE STRICTLY EVALUATED ON THE ABSOLUTE ACCURACY OF THE EXTRACTED VERBATIM TEXT (even from challenging, blurry, or handwritten sources) AND THE FAITHFUL, PIXEL-PERFECT REPLICATION OF ALL VISUAL FORMATTING DETAILS. Adherence to the specified JSON output structure is mandatory.

BENGALI FONT HANDLING: For Bengali text, the application will often override the font family to 'Tiro Bangla' or a similar consistent Bengali font for display purposes. However, you MUST still accurately detect and report the *original visual font characteristics* as best as possible in the \`fontFamilySuggestion\` or \`fontFamily\` fields (e.g., if it looks like 'SutonnyMJ' or a generic 'bengali-serif'), along with all other formatting attributes like bold, color, size, etc.

UNCERTAINTY AND ILLEGIBILITY:
While striving for perfect accuracy, if you infer a word but retain significant uncertainty (even after contextual analysis limited to deciphering visually ambiguous parts, and after considering the minor correction rule), you MUST mark this word by setting \`isUncertain: true\` in its TextSpan and prepending the appropriate language-specific uncertainty marker (e.g., \`[ржЕржирж┐рж╢рзНржЪрж┐ржд: ]\`, \`[uncertain: ]\`, \`[╪║┘К╪▒ ┘Е╪д┘Г╪п: ]\`) to the text of that span, as detailed in the TextSpan structure. This is distinct from completely illegible text. If a character or word is COMPLETELY ILLEGIBLE and cannot be contextually inferred even from immediate surroundings, use '[ржЕрж╕рзНржкрж╖рзНржЯ]' (for Bengali), '[illegible]' (for English), or '[╪║┘К╪▒ ┘И╪з╪╢╪н]' (for Arabic) as the SOLE content of this 'text' field for that span (and 'isUncertain' should be false or omitted).

FINAL VERIFICATION & JSON STRUCTURE:
Analyze the provided image with EXTREME METICULOUSNESS to extract text content and its detailed formatting. THE PRIMARY GOAL IS TO REPLICATE THE VISUAL APPEARANCE, STRUCTURE, AND TYPOGRAPHY of the text as closely as humanly possible, based strictly on the visual information.
Before outputting the JSON, cross-verify every extracted attribute (font name, font size, color, weight, alignment, spacing, table cell structure, mathematical symbols, chemical structures etc.) with the visual evidence in the image. The JSON data must be a direct and accurate representation of what you see.
Output MUST be a JSON array of objects. Each object represents a distinct block, which can be a paragraph, heading, list item, OR A TABLE.
CRITICAL JSON RULE: ALL JSON property names (keys) MUST be enclosed in double quotes (e.g., "keyName": "value"). Failure to strictly adhere to this rule will render the output unusable.
`;

const promptPart2 = `
--- TEXT/PARAGRAPH/HEADING BLOCK STRUCTURE (blockType: "paragraph", "heading1-6", "listItem") ---
Each such block object MUST follow this structure:
{
  "id": "unique_string_id_for_block",
  "blockType": "paragraph" | "heading1" | "heading2" | "heading3" | "heading4" | "heading5" | "heading6" | "listItem",
  "language": "en" | "bn" | "ar" | "unknown", // CRITICAL FOR MULTILINGUAL DOCUMENTS: This field MUST accurately reflect the PREDOMINANT language of the text within THIS SPECIFIC BLOCK. For example, if a block contains mostly Bengali text, set language: "bn". If mostly English, set language: "en". If mostly Arabic, set language: "ar". Use "unknown" sparingly, only if the language is genuinely indeterminable or heavily mixed within the block. ACCURATE PER-BLOCK LANGUAGE IDENTIFICATION IS ABSOLUTELY ESSENTIAL for correct downstream font processing and user experience. Incorrect language tagging will lead to improper font application.
  "alignment": "left" | "center" | "right" | "justify",
  "fontSizeCategory": "pt8" | ... | "pt72",
  "fontFamilySuggestion": "default" | "serif" | "sans-serif" | "monospace" | "bengali" | "arabic" | "unknown",
  "lineHeight": "normal" | "1.0" | ... | "3.0", // Represents visual line height relative to font size.
  "spaceAfter": "APPROXIMATE space after this block in points (e.g., '6pt', '12pt', '0pt')", // Visual spacing after paragraph.
  "spans": [ /* Array of TextSpan objects as detailed below */ ]
}

--- TABLE BLOCK STRUCTURE (blockType: "table") ---
If a table is detected, use the following structure:
{
  "id": "unique_string_id_for_table_block",
  "blockType": "table",
  "language": "en" | "bn" | "ar" | "unknown", // CRITICAL FOR MULTILINGUAL DOCUMENTS: Default PREDOMINANT language for cell content in this table if not overridden by more specific cues. ACCURACY IS ESSENTIAL.
  "caption": [ /* Optional: Array of TextSpan objects for the table caption */ ],
  "tableWidth": "APPROXIMATE_WIDTH_PERCENT_OR_PX", // e.g., "80%", "500px", optional
  "cellPadding": "APPROXIMATE_PADDING_PT", // e.g., "4pt", optional, default for cells
  "borderColor": "HEX_COLOR_OR_DEFAULT", // e.g., "#333333", optional, default border color for table/cells
  "borderWidth": "APPROXIMATE_WIDTH_PT", // e.g., "1pt", optional, default border width for table/cells
  "rows": [ /* Array of TableRow objects */ ]
}

--- TableRow STRUCTURE (within "rows" array of a table block) ---
Each TableRow object MUST follow this structure:
{
  "id": "unique_string_id_for_row",
  "cells": [ /* Array of TableCell objects */ ]
}

--- TableCell STRUCTURE (within "cells" array of a TableRow object) ---
Each TableCell object MUST follow this structure:
{
  "id": "unique_string_id_for_cell",
  "content": [ /* Array of TextSpan objects for the cell's content */ ],
  "colSpan": NUMBER, // Optional, default is 1. Number of columns this cell spans.
  "rowSpan": NUMBER, // Optional, default is 1. Number of rows this cell spans.
  "isHeader": BOOLEAN, // Optional, true if this cell acts as a table header (<th>).
  "alignment": "left" | "center" | "right" | "justify", // Optional, cell-specific content alignment.
  "backgroundColor": "HEX_COLOR", // Optional, e.g., "#F0F0F0".
  "borderColor": "HEX_COLOR", // Optional, cell-specific border color.
  "borderWidth": "APPROXIMATE_WIDTH_PT", // Optional, cell-specific border width.
  "fontSizeCategory": "pt8" | ... | "pt72", // Optional, cell-specific font size.
  "fontFamilySuggestion": "default" | ... | "unknown" // Optional, cell-specific font family.
}

--- TextSpan STRUCTURE (within "spans" array of paragraph/heading blocks, "caption" array of table blocks, AND "content" array of TableCell objects) ---
Each TextSpan object MUST follow this structure:
{
  "text": "The exact text content. Transcribe with EXTREME PRECISION. **CRITICAL WHITESPACE: For visually detected tab characters, YOU MUST use '\\\\t'. For visually detected sequences of multiple spaces, YOU MUST preserve ALL of them.** For line breaks within a single conceptual span, use '\\\\n'. NUMERALS, ORDINALS, SYMBOLS, EMOJIS, MATH, CHEMICAL FORMULAS: Transcribe ALL with absolute precision as previously detailed. CRITICAL FOR PARTIALLY LEGIBLE/AMBIGUOUS TEXT: If 'isUncertain' is true, this 'text' field MUST contain your best guess for the word/phrase (derived ONLY from visual cues and immediate context, NOT general knowledge), PREPENDED with the language-specific uncertainty marker: '[ржЕржирж┐рж╢рзНржЪрж┐ржд: ]' for Bengali (e.g., '[ржЕржирж┐рж╢рзНржЪрж┐ржд: ]ржЖрж▓рзЛ'), '[uncertain: ]' for English (e.g., '[uncertain: ]light'), or '[╪║┘К╪▒ ┘Е╪д┘Г╪п: ]' for Arabic (e.g., '[╪║┘К╪▒ ┘Е╪д┘Г╪п: ]╪╢┘И╪б'). The marker includes a colon and a space before the guessed word. If a character or word is COMPLETELY ILLEGIBLE and cannot be contextually inferred even from immediate surroundings, use '[ржЕрж╕рзНржкрж╖рзНржЯ]' (for Bengali), '[illegible]' (for English), or '[╪║┘К╪▒ ┘И╪з╪╢╪н]' (for Arabic) as the SOLE content of this 'text' field for that span (and 'isUncertain' should be false or omitted). DO NOT USE GENERAL KNOWLEDGE TO FILL GAPS OR CORRECT APPARENT ERRORS IN THE IMAGE.",
  "isBold": boolean, // CRITICALLY IMPORTANT. Set to 'true' if the text is visually BOLD. Missing or incorrect bolding is a significant error.
  "isItalic": boolean,
  "fontFamily": "VISUAL ACCURACY IS PARAMOUNT. CRITICAL: Identify the *EXACT* font name if possible (e.g., 'Arial', 'SutonnyMJ'). If impossible, provide a *visually closest generic category* (e.g., 'bengali-traditional', 'arabic-naskh', 'serif'). AVOID 'unknown' unless absolutely no visual cues exist.",
  "fontWeight": 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, // CRITICALLY IMPORTANT. The numerical font weight. Correlate this with 'isBold'.
  "color": "VISUAL ACCURACY FOR COLOR IS PARAMOUNT. Provide the *exact* Hex color code (e.g., '#FF0000'). Mistakes in color extraction are highly undesirable.",
  "textDecoration": "none" | "underline" | "line-through",
  "fontStyleAttributes": ["string"], // Optional visual attributes like 'condensed', 'expanded', 'small-caps'.
  "isUncertain": boolean // CRITICALLY IMPORTANT FOR AMBIGUOUS TEXT: Set to 'true' if you are not completely confident in the transcription of this span, even after contextual analysis (limited to visual cues) and providing your best guess in the 'text' field (which will be prepended with the uncertainty marker). Set to 'false' or omit if confident or if the text is completely illegible (using placeholders like '[ржЕрж╕рзНржкрж╖рзНржЯ]').
}

FONT SIZE CATEGORY (fontSizeCategory), LINE HEIGHT (lineHeight), SPACE AFTER PARAGRAPH (spaceAfter): Detailed instructions as per previous prompt. CRITICAL FOR VISUAL ACCURACY.
SPACING ACCURACY: Detailed instructions as per previous prompt. Ensure precise capture of all visual spacing.
`;

const promptPart3 = `
--- EXAMPLE OF DESIRED JSON OUTPUT (Illustrative) ---
[
  { 
    "id": "b1", "blockType": "heading1", "language": "bn", "alignment": "center", "fontSizeCategory": "pt22", 
    "fontFamilySuggestion": "bengali", "lineHeight": "1.3", "spaceAfter": "12pt",
    "spans": [{ "text": "ржмрж┐ржЬрзНржЮрж╛ржи ржнржмржи, ржмрж░рзНрж╖ рж╕ржВржЦрзНржпрж╛ рзл тЬи тВмURO тЬУ ЁЯдФ", "isBold": true, "isItalic": false, "fontFamily": "bengali-traditional", "fontWeight": 700, "color": "#1A2B3C", "textDecoration": "none", "fontStyleAttributes": [], "isUncertain": false }]
  },
  {
    "id": "b_uncertain", "blockType": "paragraph", "language": "bn", "alignment": "left", "fontSizeCategory": "pt12",
    "fontFamilySuggestion": "bengali", "lineHeight": "1.5", "spaceAfter": "6pt",
    "spans": [
      { "text": "ржПржЯрж┐ ржПржХржЯрж┐ ", "isBold": false, "fontWeight": 400, "color": "#333333", "isUncertain": false },
      { "text": "[ржЕржирж┐рж╢рзНржЪрж┐ржд: ]рж╕ржирзНржжрзЗрж╣ржЬржиржХ", "isBold": false, "fontWeight": 400, "color": "#333333, "isUncertain": true },
      { "text": " рж╢ржмрзНржжред", "isBold": false, "fontWeight": 400, "color": "#333333", "isUncertain": false }
    ]
  },
  { 
    "id": "t1", "blockType": "table", "language": "en", "borderColor": "#666666", "borderWidth": "1pt", "cellPadding": "5pt", "tableWidth": "90%",
    "caption": [{ "text": "Product Sales Q1", "isBold": true, "fontFamily": "sans-serif", "fontWeight": 600, "color": "#000000", "isUncertain": false}],
    "rows": [
      { "id": "t1r1", "cells": [
        { "id": "t1r1c1", "isHeader": true, "content": [{ "text": "Product ID ┬й", "isBold": true, "fontWeight": 700, "isUncertain": false }], "alignment": "left" },
        { "id": "t1r1c2", "isHeader": true, "content": [{ "text": "Name", "isBold": true, "fontWeight": 700, "isUncertain": false }], "alignment": "left" },
        { "id": "t1r1c3", "isHeader": true, "content": [{ "text": "[uncertain: ]Units Sold?", "isBold": true, "fontWeight": 700, "isUncertain": true }], "alignment": "right" }
      ]},
      { "id": "t1r2", "cells": [
        { "id": "t1r2c1", "content": [{ "text": "P001", "fontWeight": 400, "isUncertain": false }] },
        { "id": "t1r2c2", "content": [{ "text": "Widget A", "fontWeight": 400, "isUncertain": false }] },
        { "id": "t1r2c3", "content": [{ "text": "150 units", "fontWeight": 400, "isUncertain": false }], "alignment": "right", "backgroundColor": "#F0F8FF" }
      ]}
    ]
  },
  { 
    "id": "b2", "blockType": "paragraph", "language": "en", "alignment": "justify", "fontSizeCategory": "pt11",
    "fontFamilySuggestion": "serif", "lineHeight": "1.6", "spaceAfter": "8pt",
    "spans": [
        { "text": "The equation is E = mc┬▓.", "fontFamily": "serif", "fontWeight": 400, "color": "#222222", "isUncertain": false },
        { "text": " Water is HтВВO. Illegible part: [illegible].", "fontFamily": "serif", "fontWeight": 400, "color": "#222222", "isUncertain": false }
    ]
  }
]
`;

const extractionPrompt = promptPart1 + promptPart2 + promptPart3;

const aiChatSystemPrompt = `You are an AI assistant specialized in editing document content and formatting based on user commands.
The user will provide their current document data as a JSON string (an array of FormattedBlock objects) and a command for how to modify it.
Your primary task is to understand the command and apply the changes DIRECTLY to the provided JSON data.

CRITICAL INSTRUCTIONS:
1.  OUTPUT FORMAT: You MUST return the *entire, complete, and updated JSON object array* as a string. Do NOT return only the changed parts. Do NOT return a natural language description of what you did INSTEAD of the JSON. The JSON output should be parsable and directly usable to replace the old document data. Ensure the JSON string is properly formatted and enclosed in \`\`\`json ... \`\`\` if it's part of a larger text response, but ideally, just return the raw JSON string.
2.  SCHEMA ADHERENCE: The output JSON MUST strictly adhere to the following schema. Any deviation will make the output unusable.
    ${promptPart2} 
    ${promptPart3} 
3.  COMMAND INTERPRETATION:
    *   Interpret user commands to modify text content, font styles (family, size, weight, color, decoration), alignment, spacing, block types (paragraph, heading), and table structures (cells, rows, content).
    *   If a command is ambiguous or cannot be reasonably applied (e.g., "delete the 5th paragraph" when there are only 3), respond with a clear explanation IN NATURAL LANGUAGE, not JSON. In such cases, your response text should NOT be a JSON string.
    *   If the command asks to add new content, try to infer appropriate formatting or use sensible defaults based on surrounding content or common document practices, adhering to the JSON schema.
    *   If the command involves complex changes or seems to misunderstand the document structure, you can ask for clarification in natural language.
4.  TEXT ACCURACY: When modifying text, maintain the user's intent. Do not introduce new spelling errors.
5.  WHITESPACE AND SPECIAL CHARACTERS: Preserve existing representations of tabs (\\\\t) and multiple spaces as per the schema unless explicitly asked to change them.
6.  VERBATIM DATA: Only change what the user explicitly or implicitly asks to change. Leave other parts of the JSON data untouched.

EXAMPLE INTERACTION (Illustrative):
User provides current document JSON (similar to the example in promptPart3).
User command: "Change the text of the first heading to 'Chapter 1: Introduction' and make it blue."

Your expected JSON output (stringified and potentially wrapped in \`\`\`json ... \`\`\`):
\`\`\`json
[
  { 
    "id": "b1", "blockType": "heading1", "language": "bn", "alignment": "center", "fontSizeCategory": "pt22", 
    "fontFamilySuggestion": "bengali", "lineHeight": "1.3", "spaceAfter": "12pt",
    "spans": [{ "text": "Chapter 1: Introduction", "isBold": true, "isItalic": false, "fontFamily": "bengali-traditional", "fontWeight": 700, "color": "#0000FF", "textDecoration": "none", "fontStyleAttributes": [], "isUncertain": false }] 
  }
  // ... rest of the original JSON structure ...
]
\`\`\`

If the user command is something like "Tell me a joke", you should respond in natural language: "I am an AI assistant for document editing. I cannot tell jokes. Please provide a command related to modifying the document content or formatting." Your response should NOT be JSON in this case.

Current document content (JSON) will be provided next, followed by the user's command.
`;


export type ExportFormat = 'docx-word' | 'docx-gdocs' | 'pdf' | 'png';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [formattedText, setFormattedText] = useState<FormattedBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const formattedTextViewerRef = useRef<HTMLDivElement>(null); // Refers to the main output container (canvas)
  
  const [currentStage, setCurrentStage] = useState<string>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const progressIntervalRef = useRef<number | null>(null);

  const [selectedTextLength, setSelectedTextLength] = useState(0); 
  const [isSelectAndCopyModeActive, setIsSelectAndCopyModeActive] = useState(false);

  // State for AI Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAIChatProcessing, setIsAIChatProcessing] = useState<boolean>(false);
  const [aiChatError, setAIChatError] = useState<string | null>(null);

  // State for Print Layout
  const [isPrintLayoutActive, setIsPrintLayoutActive] = useState<boolean>(false);


  useEffect(() => {
    const handleGlobalSelectionChange = () => {
      const selection = window.getSelection();
      setSelectedTextLength(selection ? selection.toString().length : 0);
    };

    document.addEventListener('selectionchange', handleGlobalSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleGlobalSelectionChange);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []); 

  const handleImageUpload = (imageDataUrl: string) => {
    setUploadedImage(imageDataUrl);
    setFormattedText([]);
    setError(null);
    setIsSelectAndCopyModeActive(false); 
    setChatHistory([]); // Clear chat history on new image upload
    setAIChatError(null);
    setIsPrintLayoutActive(false); // Reset print layout on new image
    processImage(imageDataUrl);
  };

  const processImage = useCallback(async (imageDataUrl: string) => {
    if (!imageDataUrl) return;

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setIsLoading(true);
    setError(null);
    setFormattedText([]); 
    setChatHistory([]);
    setAIChatError(null);
    setIsPrintLayoutActive(false);


    if (!ai) {
      setError("AI client is not initialized. This could be due to a missing/invalid API Key or an initialization error. Please ensure API_KEY is set and valid in your execution environment.");
      setIsLoading(false);
      setCurrentStage("Error");
      setProgressPercent(0);
      return;
    }
    
    try {
      // Stage 1: Uploading Image (0-5%)
      setCurrentStage("Uploading Image...");
      setProgressPercent(0);
      await delay(100); setProgressPercent(2);
      await delay(150); setProgressPercent(5);

      // Stage 2: Preparing AI Request (5-15%)
      setCurrentStage("Preparing AI Request...");
      await delay(100); setProgressPercent(8);
      await delay(150); setProgressPercent(12);
      await delay(150); setProgressPercent(15);
      
      const base64Data = imageDataUrl.split(',')[1];
      const mimeTypeMatch = imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg'; 

      const imagePart: Part = {
        inlineData: {
          mimeType: mimeType, 
          data: base64Data,
        },
      };
      const textPart = { text: extractionPrompt };

      // Stage 3: AI Processing (Simulated "thinking" phase) - 15% to 70%
      setCurrentStage("AI Processing...");
      const thinkingSimulationTime = 3500; // 3.5 seconds for simulated thinking
      const thinkingStartProgress = 15;
      const thinkingEndProgress = 70;
      const thinkingProgressRange = thinkingEndProgress - thinkingStartProgress; // 55
      const thinkingNumIntervals = thinkingProgressRange; // Each interval = 1%
      const thinkingStepIncrement = 1;
      const thinkingIntervalDuration = thinkingSimulationTime / thinkingNumIntervals; // ~63.6ms

      await new Promise<void>(resolve => {
        progressIntervalRef.current = window.setInterval(() => {
          setProgressPercent(prev => {
            const newProgress = prev + thinkingStepIncrement;
            if (newProgress >= thinkingEndProgress) {
              if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
              setProgressPercent(thinkingEndProgress); 
              resolve(); 
              return thinkingEndProgress;
            }
            return newProgress;
          });
        }, thinkingIntervalDuration);
      });
      // At this point, progress is at thinkingEndProgress (70%)

      // Actual API Call (progress holds at 70%)
      const response: GenerateContentResponse = await ai.models.generateContent({ 
        model: 'gemini-2.5-flash-preview-04-17',
        contents: { parts: [imagePart, textPart] },
      });
      
      // Stage 4: Parsing Response - 70% to 98%
      // API call finished. Progress is at 70%.
      setProgressPercent(70); // Ensure it's exactly 70
      setCurrentStage("Parsing Response...");

      await delay(100); setProgressPercent(75);
      await delay(100); setProgressPercent(80);
      
      let jsonStr = response.text;
      if (!jsonStr) {
        throw new Error("Received empty response from AI model. The model might not have found any text or an internal error occurred.");
      }
      jsonStr = jsonStr.trim();
      
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) {
        jsonStr = match[2].trim(); 
      }
      
      await delay(100); setProgressPercent(85); // Simulate some parsing work

      try {
        const parsedData = JSON.parse(jsonStr) as FormattedBlock[];
        if (!Array.isArray(parsedData)) {
            console.error("Parsed data is not an array:", parsedData);
            throw new Error("AI response was not in the expected JSON format: root is not an array.");
        }
        if (!parsedData.every(block => {
            if (typeof block !== 'object' || block === null || typeof block.id !== 'string' || typeof block.blockType !== 'string') return false;
            if (block.blockType === 'table') {
                const tableBlock = block as FormattedTableBlock;
                return Array.isArray(tableBlock.rows) && tableBlock.rows.every(row => typeof row === 'object' && row !== null && typeof row.id === 'string' && Array.isArray(row.cells) && row.cells.every(cell => typeof cell === 'object' && cell !== null && typeof cell.id === 'string' && Array.isArray(cell.content) && cell.content.every(span => typeof span === 'object' && span !== null && typeof span.text === 'string')));
            } else {
                const paraBlock = block as FormattedParagraphBlock;
                return Array.isArray(paraBlock.spans) && paraBlock.spans.every(span => typeof span === 'object' && span !== null && typeof span.text === 'string');
            }
        })) {
            console.error("Parsed data contains blocks not matching FormattedBlock structure:", parsedData);
            throw new Error("AI response format error: One or more blocks do not match the expected structure.");
        }
        setFormattedText(parsedData);
      } catch (parseError: any) {
        console.error("Failed to parse JSON response. Raw string from AI:", jsonStr, parseError);
        throw new Error(`Failed to parse AI's JSON response. Raw response snippet: ${jsonStr.substring(0, 500)}... Error: ${parseError.message}`);
      }

      await delay(100); setProgressPercent(92);
      await delay(100); setProgressPercent(98);

      // Stage 5: Completed
      setProgressPercent(100);
      setCurrentStage("Completed");
      await delay(300);

    } catch (e: any) {
      console.error("Error processing image:", e);
      let errorMessage = "Failed to process the image. The AI model could not be reached or returned an error.";
      if (progressIntervalRef.current) { 
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (e.message) {
        const lowerEMessage = e.message.toLowerCase();
        if (lowerEMessage.includes("403") || lowerEMessage.includes("permission_denied") || lowerEMessage.includes("caller does not have permission")) {
          errorMessage = "Error: Permission Denied (403). Please check that your API key is valid, has the Generative Language API enabled in your Google Cloud project, and that the 'gemini-2.5-flash-preview-04-17' model is accessible with your key. The key might be missing necessary permissions or could be incorrect.";
        } else if (lowerEMessage.includes("api key not valid")) {
            errorMessage = "Error: API key not valid. Please ensure API_KEY is correctly set in your environment variables and is a valid key.";
        } else if (lowerEMessage.includes("quota")) {
            errorMessage = "Error: Quota exceeded. You may have hit usage limits for the API. Please check your Google Cloud Console.";
        } else if (lowerEMessage.includes("model not found")) {
            errorMessage = "Error: Model not found. The specified AI model ('gemini-2.5-flash-preview-04-17') might be unavailable or incorrectly named.";
        } else if (lowerEMessage.includes("billing account")) {
            errorMessage = "Error: Billing issue. Please check that your Google Cloud project has a valid and active billing account associated with it.";
        } else if (lowerEMessage.includes("rpc failed") && lowerEMessage.includes("xhr error")) {
            errorMessage = "A communication problem occurred with the AI service (RPC/XHR error). This is often temporary and related to network issues or transient service unavailability (e.g., error code 6). Please check your internet connection and try again in a few moments. If the issue persists, the service might be experiencing problems or the request might be too complex for the current conditions.";
        } else if (lowerEMessage.includes("500")) {
            errorMessage = "The AI model encountered an internal server error (500). This might be due to a temporary issue with the service, or the request (e.g., image complexity, prompt length) might be too demanding. Please try again in a few moments. If the problem persists with the same image, consider using a smaller or simpler image.";
        } else {
            errorMessage = `An unexpected error occurred: ${e.message}`;
        }
      }
      setError(errorMessage);
      setCurrentStage("Error");
      setProgressPercent(0); 
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsLoading(false);
      // Only reset to 'idle' if not an error and not completed successfully (which has its own brief "Completed" display)
      if (!error && currentStage !== "Completed") {
        setTimeout(() => {
          if (currentStage !== "Error" && currentStage !== "Completed") setCurrentStage('idle');
        }, 1500); // Give "Completed" or "Exported" messages time to show
      } else if (error) {
         // Error stage is already set, no need to go to idle immediately
      }
    }
  }, [currentStage, error]); // Added currentStage and error to dependencies for finally block logic

  const handleSpanTextChange = useCallback((blockId: string, spanIndex: number, newText: string, rowIndex?: number, cellIndex?: number) => {
    setFormattedText(prevFormattedText =>
      prevFormattedText.map(block => {
        if (block.id === blockId) {
          if (block.blockType === 'table' && rowIndex !== undefined && cellIndex !== undefined) {
             const tableBlock = block as FormattedTableBlock;
             const newRows = tableBlock.rows.map((row, rIdx) => {
              if (rIdx === rowIndex) {
                const newCells = row.cells.map((cell, cIdx) => {
                  if (cIdx === cellIndex) {
                    const newSpans = [...cell.content];
                    if (newSpans[spanIndex]) {
                      newSpans[spanIndex] = { ...newSpans[spanIndex], text: newText };
                    }
                    return { ...cell, content: newSpans };
                  }
                  return cell;
                });
                return { ...row, cells: newCells };
              }
              return row;
            });
            return { ...block, rows: newRows };
          } else if (block.blockType !== 'table') { 
            const paraBlock = block as FormattedParagraphBlock;
            const newSpans = [...paraBlock.spans];
            if (newSpans[spanIndex]) {
              newSpans[spanIndex] = { ...newSpans[spanIndex], text: newText };
            }
            return { ...block, spans: newSpans };
          }
        }
        return block;
      })
    );
  }, []);

  const handleAIChatSubmit = useCallback(async (userCommand: string) => {
    if (!ai) {
      setAIChatError("AI client is not initialized. Cannot process chat command.");
      setChatHistory(prev => [...prev, {id: `sys-${Date.now()}`, sender: 'system', content: "AI client not ready. Please ensure API Key is configured.", timestamp: new Date()}]);
      return;
    }
    if (formattedText.length === 0) {
      setAIChatError("No extracted text available to edit.");
      setChatHistory(prev => [...prev, {id: `sys-${Date.now()}`, sender: 'system', content: "No document loaded to edit.", timestamp: new Date()}]);
      return;
    }

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userCommand,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, newUserMessage]);
    setIsAIChatProcessing(true);
    setAIChatError(null);

    try {
      const currentFormattedTextJson = JSON.stringify(formattedText, null, 2); // Pretty print for AI readability
      const fullPromptForChat = `${aiChatSystemPrompt}\n\nCURRENT DOCUMENT JSON:\n\`\`\`json\n${currentFormattedTextJson}\n\`\`\`\n\nUSER COMMAND:\n${userCommand}`;

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: fullPromptForChat,
      });

      let aiResponseText = response.text;
      if (!aiResponseText) {
        throw new Error("AI returned an empty response.");
      }
      aiResponseText = aiResponseText.trim();
      
      let parsedData;
      let isJsonResponseSuccessfullyApplied = false;

      // Check if response is likely JSON (wrapped in triple backticks or starting with [ or {)
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s; // Keep ^ to ensure it's the primary content
      let potentialJsonStr = aiResponseText;
      const match = aiResponseText.match(fenceRegex);
      if (match && match[2]) {
        potentialJsonStr = match[2].trim();
      }

      try {
        parsedData = JSON.parse(potentialJsonStr) as FormattedBlock[];
        // Validate structure (same as in processImage)
        if (Array.isArray(parsedData) && (parsedData.length === 0 || (parsedData.length > 0 && typeof parsedData[0] === 'object' && parsedData[0] !== null && typeof parsedData[0].id === 'string' && typeof parsedData[0].blockType === 'string'))) {
          if (!parsedData.every(block => {
              if (typeof block !== 'object' || block === null || typeof block.id !== 'string' || typeof block.blockType !== 'string') return false;
              if (block.blockType === 'table') {
                  const tableBlock = block as FormattedTableBlock;
                  return Array.isArray(tableBlock.rows) && tableBlock.rows.every(row => typeof row === 'object' && row !== null && typeof row.id === 'string' && Array.isArray(row.cells) && row.cells.every(cell => typeof cell === 'object' && cell !== null && typeof cell.id === 'string' && Array.isArray(cell.content) && cell.content.every(span => typeof span === 'object' && span !== null && typeof span.text === 'string')));
              } else {
                  const paraBlock = block as FormattedParagraphBlock;
                  return Array.isArray(paraBlock.spans) && paraBlock.spans.every(span => typeof span === 'object' && span !== null && typeof span.text === 'string');
              }
          })) {
              console.warn("AI chat response JSON structure is invalid after parsing:", parsedData);
              throw new Error("AI returned JSON with an invalid structure. Treating as natural language.");
          }
          setFormattedText(parsedData);
          isJsonResponseSuccessfullyApplied = true;
          const aiSuccessMessage: ChatMessage = {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              content: "Your changes have been applied to the document.",
              timestamp: new Date(),
          };
          setChatHistory(prev => [...prev, aiSuccessMessage]);
        } else {
          // Parsed but not the expected FormattedBlock[] structure
          throw new Error("Parsed JSON, but it's not the expected FormattedBlock array structure. Treating as natural language.");
        }
      } catch (jsonParseOrValidationError: any) {
        // If JSON parsing or validation fails, assume it's a natural language response
        console.warn("Could not parse AI chat response as valid JSON or failed validation:", jsonParseOrValidationError.message);
        const aiTextMessage: ChatMessage = {
            id: `ai-text-${Date.now()}`,
            sender: 'ai',
            content: aiResponseText, // The original, unparsed/unvalidated (if failed) AI response
            timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, aiTextMessage]);
        if (!isJsonResponseSuccessfullyApplied) { 
            // Only set error if we didn't successfully apply a JSON update
            setAIChatError("AI responded, but it wasn't a valid document update. See chat for AI's message.");
        }
      }

    } catch (e: any) {
      console.error("Error in AI Chat submission or processing:", e);
      const errorMessage = e.message || "An unexpected error occurred with the AI chat.";
      setAIChatError(errorMessage);
      const aiErrorMessage: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        sender: 'ai', // Or 'system' for critical errors
        content: `Error processing your request: ${errorMessage}`,
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsAIChatProcessing(false);
    }
  }, [formattedText, ai]); // Ensure 'ai' is a dependency


  const handleCopyToClipboard = useCallback(() => {
    if (formattedText.length === 0) {
        alert('No text to copy.');
        return;
    }
    let plainText = '';
    formattedText.forEach(block => {
      if (block.blockType === 'table') {
        (block as FormattedTableBlock).rows.forEach(row => {
          row.cells.forEach((cell, cellIndex) => {
            cell.content.forEach(span => {
              plainText += span.text.replace(/\\n/g, '\n');
            });
            if (cellIndex < row.cells.length - 1) {
              plainText += '\t'; 
            }
          });
          plainText += '\n'; 
        });
      } else { 
        (block as FormattedParagraphBlock).spans.forEach(span => {
          plainText += span.text.replace(/\\n/g, '\n');
        });
      }
      plainText += '\n\n'; 
    });
    plainText = plainText.trim();

    navigator.clipboard.writeText(plainText)
      .then(() => alert('All text copied to clipboard!'))
      .catch(err => {
        alert('Failed to copy text.');
        console.error('Failed to copy text: ', err);
      });
  }, [formattedText]);
  
  const handleToggleSelectAndCopyMode = useCallback(() => {
    setIsSelectAndCopyModeActive(prevMode => {
        if (!prevMode) { 
            if (window.getSelection()) {
                window.getSelection()?.removeAllRanges();
            }
            setSelectedTextLength(0);
            alert("Selection mode activated. Select your text, then click 'Copy & Exit Mode' to copy.");
            return true; 
        } else { 
            const selection = window.getSelection();
            const currentSelectedText = selection ? selection.toString().trim() : '';

            if (currentSelectedText.length > 0) {
                navigator.clipboard.writeText(currentSelectedText)
                    .then(() => {
                        alert('Selected text copied to clipboard. Selection mode deactivated.');
                    })
                    .catch(err => {
                        console.error('Failed to copy selected text: ', err);
                        alert('Failed to copy selected text.');
                    });
            } else {
                alert('No text was selected. Selection mode deactivated.');
            }
            
            setTimeout(() => { 
                if (window.getSelection()) {
                    window.getSelection()?.removeAllRanges();
                }
                setSelectedTextLength(0);
            }, 0);
            return false; 
        }
    });
  }, []);


  const handleExport = useCallback(async (format: ExportFormat) => {
    const canvasElement = formattedTextViewerRef.current; // This is the gray canvas
    if (!canvasElement || formattedText.length === 0) {
      alert("No content to export.");
      return;
    }

    let elementToCaptureForExport: HTMLElement = canvasElement;

    if (isPrintLayoutActive) {
      const whitePageElement = canvasElement.querySelector('.print-layout-actual-page') as HTMLElement;
      if (whitePageElement) {
        elementToCaptureForExport = whitePageElement;
      } else {
        console.warn("Print layout active, but '.print-layout-actual-page' element not found. Exporting the entire canvas area.");
        alert("Could not isolate the page for Print Layout export. Exporting visible area.");
      }
    }
    
    setIsLoading(true); 
    setCurrentStage(`Exporting to ${format.toUpperCase()}...`);
    setProgressPercent(0); 
    setError(null);
    let formatName = format.toUpperCase();
    try {
      if (format === 'docx-word') {
        await generateDocx(formattedText, "extracted_text_word.docx", "word");
        formatName = "Microsoft Word (.docx)";
      } else if (format === 'docx-gdocs') {
        await generateDocx(formattedText, "extracted_text_gdocs.docx", "gdocs");
        formatName = "Google Docs (.docx)";
      } else if (format === 'pdf') {
        await generatePdf(elementToCaptureForExport, isPrintLayoutActive);
      } else if (format === 'png') {
        await generateImage(elementToCaptureForExport, isPrintLayoutActive);
      }
      setProgressPercent(100);
      setCurrentStage(`Exported ${formatName}`);
    } catch (exportError: any) {
      console.error(`Error exporting to ${format}:`, exportError);
      setError(`Failed to export as ${formatName}. ${exportError.message}`);
      setCurrentStage("Export Error");
    } finally {
      setIsLoading(false); 
      setTimeout(() => {
        if (currentStage !== "Export Error") {
            setCurrentStage('idle');
        }
      }, 1500);
    }
  }, [formattedText, currentStage, isPrintLayoutActive]); 

  const clearUpload = () => {
    setUploadedImage(null);
    setFormattedText([]);
    setError(null);
    setIsSelectAndCopyModeActive(false); 
    setCurrentStage('idle');
    setProgressPercent(0);
    if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
    }
    setChatHistory([]);
    setAIChatError(null);
    setIsAIChatProcessing(false);
    setIsPrintLayoutActive(false); 

    const input = document.getElementById('image-upload-input') as HTMLInputElement;
    if (input) {
      input.value = ""; 
    }
  };

  const baseMainControlsDisabled = isLoading || formattedText.length === 0;
  const effectiveMainControlsDisabled = baseMainControlsDisabled || isSelectAndCopyModeActive; 

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 md:p-8">
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-sky-400 py-2">
          Smart Lipikor
        </h1>
        <p className="mt-2 text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
          Extract text and format from your images with precision, and save in various ways.
        </p>
      </header>

      <main className="flex-grow container mx-auto max-w-7xl w-full"> 
        <ImageUploader 
          onImageUpload={handleImageUpload} 
          disabled={isLoading}
          onClear={clearUpload}
          hasUploadedImage={!!uploadedImage}
        />

        {isLoading && <LoadingSpinner message={currentStage} progress={progressPercent} />}
        {error && <ErrorMessage message={error} />}

        <div className="flex flex-col md:flex-row md:gap-x-6 lg:gap-x-8 mt-6 md:mt-8">
          {uploadedImage && !isLoading && !error && (
            <div className="md:w-5/12 lg:w-1/2 w-full mb-6 md:mb-0">
              <div className="p-3 sm:p-4 bg-slate-800/70 rounded-xl shadow-xl md:sticky md:top-6 lg:top-8">
                <h2 className="text-lg sm:text-xl font-semibold text-teal-300 mb-3 text-center">Uploaded Image</h2>
                <div className="max-w-full overflow-auto rounded-lg border border-slate-700 flex justify-center items-center p-2 bg-slate-850 shadow-inner max-h-[75vh] md:max-h-[calc(100vh-10rem)]">
                  <img 
                      src={uploadedImage} 
                      alt="Uploaded content preview" 
                      className="max-w-full max-h-[70vh] md:max-h-[calc(100vh-12rem)] h-auto object-contain rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {(formattedText.length > 0 || (uploadedImage && !isLoading && !error)) && (
            <div className={`w-full ${uploadedImage && !isLoading && !error ? 'md:w-7/12 lg:w-1/2' : 'md:w-full'}`}>
              <Toolbar 
                onCopyToClipboard={handleCopyToClipboard}
                onToggleSelectAndCopyMode={handleToggleSelectAndCopyMode}
                isSelectAndCopyModeActive={isSelectAndCopyModeActive}
                onExport={handleExport}
                mainControlsDisabled={effectiveMainControlsDisabled} 
                selectAndCopyDisabled={isLoading && currentStage !== 'Completed' && !currentStage?.toLowerCase().includes("export")} 
              />

              {formattedText.length > 0 && !isLoading && !error && (
                <div className="flex justify-end items-center my-3 sm:my-4">
                  <label htmlFor="print-layout-toggle" className="mr-2 text-sm text-slate-300 select-none">Print Layout:</label>
                  <button
                    id="print-layout-toggle"
                    onClick={() => setIsPrintLayoutActive(!isPrintLayoutActive)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-500 ${
                      isPrintLayoutActive ? 'bg-teal-600' : 'bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={isPrintLayoutActive}
                    title={isPrintLayoutActive ? "Disable Print Layout View" : "Enable Print Layout View (A4-like page)"}
                  >
                    <span className="sr-only">Toggle Print Layout</span>
                    <span
                      className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${
                        isPrintLayoutActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
              
              <div 
                id="formatted-text-output" 
                ref={formattedTextViewerRef} 
                className={`
                  rounded-lg shadow-2xl min-h-[300px] md:min-h-[400px] 
                  overflow-x-auto border border-slate-700/50 transition-colors duration-300
                  ${isPrintLayoutActive 
                    ? 'bg-slate-500/70 dark:bg-slate-600/70 p-4 sm:p-6 md:p-8 lg:p-10' // Canvas background & padding for print layout
                    : 'bg-white text-slate-900 p-4 sm:p-6 md:p-8' // Normal view
                  }
                `}
                aria-live="polite"
                aria-atomic="true"
              >
                {formattedText.length > 0 ? (
                  <FormattedTextViewer 
                    blocks={formattedText} 
                    onSpanTextChange={handleSpanTextChange}
                    isSelectAndCopyModeActive={isSelectAndCopyModeActive}
                    isPrintLayoutActive={isPrintLayoutActive} 
                  />
                ) : (
                  uploadedImage && !isLoading && !error && (
                    <p className={`text-center py-10 ${isPrintLayoutActive ? 'text-slate-700' : 'text-slate-500'}`}>No text could be extracted, or the extracted content was empty. Please try another image.</p>
                  )
                )}
              </div>
              
              {formattedText.length > 0 && !isLoading && !error && (
                <div className="mt-6 md:mt-8">
                  <ChatWithAI
                    chatHistory={chatHistory}
                    onSendMessage={handleAIChatSubmit}
                    isProcessing={isAIChatProcessing}
                    error={aiChatError}
                  />
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-8 mt-12 md:mt-16 text-slate-500 text-sm">
        <p>Smart Lipikor &copy; {new Date().getFullYear()}. All rights reserved.</p>
      </footer>
    </div>
  );
};



import {
    FormattedBlock,
    TextSpan,
    FontFamilySuggestion,
    FontSizeCategory,
    TextAlign,
    Language,
    FormattedParagraphBlock,
    FormattedTableBlock,
    // Explicitly import TableCell type if needed, though it's used as part of FormattedTableBlock.rows[].cells[]
} from '../types';
import {
    Document as DocxDocument,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    HeadingLevel,
    UnderlineType,
    ISpacingProperties,
    Table,
    TableRow as DocxTableRow,
    TableCell as DocxTableCell,
    WidthType,
    BorderStyle,
    VerticalMergeType,
    ShadingType
} from 'docx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas'; 
import saveAs from 'file-saver';


const parsePtStringToNumber = (ptString: FontSizeCategory | undefined, defaultSize: number = 11): number => {
    if (!ptString) return defaultSize;
    const match = ptString.match(/^pt(\d+)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return defaultSize;
};

const parseUnitValueToTwips = (valueStr?: string, defaultTwipsIfUnparsable: number = 0): number => {
    if (!valueStr) {
        return defaultTwipsIfUnparsable;
    }
    if (valueStr === "0" || valueStr === "0pt") {
        return 0;
    }
    const match = valueStr.match(/^(\d+(\.\d+)?)pt$/);
    if (match && match[1]) {
        const points = parseFloat(match[1]);
        if (!isNaN(points)) {
            return Math.round(points * 20); // 1 point = 20 twips
        }
    }
    return defaultTwipsIfUnparsable;
};


const mapFontSizeToDocx = (category: FontSizeCategory | undefined, blockType?: FormattedParagraphBlock['blockType']): number => {
  let ptSize = parsePtStringToNumber(category, 11);
    if (category && category.match(/^pt\d+$/) === null && blockType) {
        switch (blockType) {
            case 'heading1': ptSize = 22; break;
            case 'heading2': ptSize = 16; break;
            case 'heading3': ptSize = 13; break;
            default: ptSize = 11; break;
        }
    }
  return ptSize * 2; // Return half-points
};

const mapAlignmentToDocx = (alignment: TextAlign | undefined): typeof AlignmentType[keyof typeof AlignmentType] => {
  switch (alignment) {
    case 'left': return AlignmentType.LEFT;
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.BOTH;
    default: return AlignmentType.LEFT;
  }
};

// --- Script Detection Utilities ---
const BENGALI_REGEX_CHAR = /[\u0980-\u09FF]/;
const ARABIC_REGEX_CHAR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_REGEX_CHAR = /[a-zA-Z]/;
const DIGIT_REGEX_CHAR = /[0-9]/;
const COMMON_PUNCT_SPACE_REGEX_CHAR = /[\s.,!?;:'"(){}\[\]\-@#$%^&*+=_<>/\\|~`]/;

type ScriptType = 'bengali' | 'arabic' | 'latin' | 'digit' | 'punct_space' | 'other';

const detectCharScript = (char: string): ScriptType => {
    if (BENGALI_REGEX_CHAR.test(char)) return 'bengali';
    if (ARABIC_REGEX_CHAR.test(char)) return 'arabic';
    if (LATIN_REGEX_CHAR.test(char)) return 'latin';
    if (DIGIT_REGEX_CHAR.test(char)) return 'digit';
    if (COMMON_PUNCT_SPACE_REGEX_CHAR.test(char)) return 'punct_space';
    return 'other';
};
// --- End Script Detection Utilities ---

const commonArabicFonts = ['Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', 'Lateef', 'Noto Kufi Arabic', 'Traditional Arabic', 'Arial Unicode MS'];

const mapFontFamilyToDocx = (
    _spanTextContentForRefOnly: string, 
    detectedSegmentScript: ScriptType,
    spanFontFamilyKeyFromAI: string | undefined,
    _spanFontWeight: number | undefined,
    _blockFontFamilySuggestionFromAI: FontFamilySuggestion | undefined, // This is block's suggestion (or cell's suggestion)
    _blockLanguageFromAI: Language, // This is block's language (or cell's language)
    targetApplication: 'word' | 'gdocs'
): string => {

    if (targetApplication === 'word') {
        switch (detectedSegmentScript) {
            case 'bengali':
                return 'SutonnyOMJ'; // Common choice for Word compatibility in some regions
            case 'latin':
            case 'digit':
            case 'punct_space': 
                return 'Times New Roman';
            case 'arabic':
                if (spanFontFamilyKeyFromAI && commonArabicFonts.includes(spanFontFamilyKeyFromAI)) return spanFontFamilyKeyFromAI;
                if (spanFontFamilyKeyFromAI === 'arabic-naskh' || spanFontFamilyKeyFromAI === 'arabic') return 'Traditional Arabic';
                if (spanFontFamilyKeyFromAI === 'arabic-kufi') return 'Traditional Arabic'; 
                if (spanFontFamilyKeyFromAI === 'arabic-modern-sans') return 'Arial';
                return 'Traditional Arabic';
            default: 
                return 'Calibri'; 
        }
    } else { // targetApplication === 'gdocs'
        switch (detectedSegmentScript) {
            case 'bengali':
                return 'Tiro Bangla'; // Good Unicode font often available or easily addable in GDocs
            case 'latin':
            case 'digit':
            case 'punct_space':
                return 'Open Sans'; // Common GDocs default
            case 'arabic':
                if (spanFontFamilyKeyFromAI && commonArabicFonts.includes(spanFontFamilyKeyFromAI)) return spanFontFamilyKeyFromAI;
                return 'Noto Naskh Arabic'; // Good Unicode font
            default: 
                return 'Open Sans';
        }
    }
};


const getHeadingLevelFromBlockType = (blockType: FormattedParagraphBlock['blockType']): typeof HeadingLevel[keyof typeof HeadingLevel] | undefined => {
    switch(blockType) {
        case 'heading1': return HeadingLevel.HEADING_1;
        case 'heading2': return HeadingLevel.HEADING_2;
        case 'heading3': return HeadingLevel.HEADING_3;
        case 'heading4': return HeadingLevel.HEADING_4;
        case 'heading5': return HeadingLevel.HEADING_5;
        case 'heading6': return HeadingLevel.HEADING_6;
        default: return undefined;
    }
}

const mapTextDecorationToDocx = (decoration?: 'none' | 'underline' | 'line-through'): {underline?: any, strike?: boolean} => {
    if (decoration === 'underline') {
        return { underline: { type: UnderlineType.SINGLE, color: "auto" } };
    }
    if (decoration === 'line-through') {
        return { strike: true };
    }
    return {};
}

const getLineSpacing = (lineHeightStr: string | undefined, fontSizePt: number): Pick<ISpacingProperties, "line" | "lineRule">  => {
    if (!lineHeightStr || lineHeightStr === "normal") {
        return { lineRule: "auto" as any, line: Math.round(fontSizePt * 1.15 * 20) }; // Default line spacing
    }
    const lhValue = parseFloat(lineHeightStr);
    if (!isNaN(lhValue) && lhValue > 0) {
        // For docx, line height is specified in twips (1/20th of a point).
        // If lineHeight is a multiplier (e.g., 1.5), calculate based on font size.
        // docx 'line' property expects total line height in twips.
        return { lineRule: "exact" as any, line: Math.round(fontSizePt * lhValue * 20) };
    }
    return { lineRule: "auto" as any, line: Math.round(fontSizePt * 1.15 * 20) };
};

const createTextRunsFromSpans = (
    spans: TextSpan[],
    defaultFontSizeCategoryForBlock: FontSizeCategory | undefined, // For paragraph/heading, this is block's. For cell, this is cell's.
    blockFontFamilySuggestionFromAI: FontFamilySuggestion | undefined, // For paragraph/heading, this is block's. For cell, this is cell's.
    blockLanguageFromAI: Language, // For paragraph/heading, this is block's. For cell, this is cell's (or table's).
    targetApplication: 'word' | 'gdocs',
    defaultBlockType?: FormattedParagraphBlock['blockType'] // Only for paragraph/heading blocks
): TextRun[] => {
    const allRuns: TextRun[] = [];

    spans.forEach(span => {
        const originalText = span.text;
        // Split by explicit newlines from AI (\\n) or actual newlines if any slip through
        const textLines = originalText.split(/\\n|\n/g); 

        textLines.forEach((lineText, lineIndex) => {
            // Handle empty lines that are part of multiple newlines
            if (lineText === "" && textLines.length > 1) { // Check if it's not the only "empty" line
                if (lineIndex < textLines.length - 1) { // Add a break if it's not the last line
                    allRuns.push(new TextRun({ break: 1 }));
                }
                return; // Skip further processing for this genuinely empty line segment
            }

            // Script segmentation logic for the current lineText
            const segments: { text: string, script: ScriptType }[] = [];
            if (lineText.length > 0) {
                let currentSegmentText = "";
                // Determine initial script more robustly based on language context if first char is neutral
                let firstCharScript = detectCharScript(lineText[0]);
                
                if (firstCharScript === 'punct_space' || firstCharScript === 'other' || firstCharScript === 'digit') {
                    // If block language is bn/ar and no latin/other script chars found, assume neutral chars belong to block lang
                    if (blockLanguageFromAI === 'bn' && !(LATIN_REGEX_CHAR.test(lineText) || ARABIC_REGEX_CHAR.test(lineText))) firstCharScript = 'bengali';
                    else if (blockLanguageFromAI === 'ar' && !(LATIN_REGEX_CHAR.test(lineText) || BENGALI_REGEX_CHAR.test(lineText))) firstCharScript = 'arabic';
                    else firstCharScript = 'latin'; // Default to latin for neutral chars in other contexts
                }
                let currentSegmentScript: ScriptType = firstCharScript;


                for (let i = 0; i < lineText.length; i++) {
                    const char = lineText[i];
                    const charScript = detectCharScript(char);
                    
                    let effectiveJoinScript = charScript;
                    // Neutral characters (punct, space, digit) join the current script segment
                    if (charScript === 'punct_space' || charScript === 'digit') {
                        effectiveJoinScript = currentSegmentScript;
                    }

                    if (effectiveJoinScript === currentSegmentScript) {
                        currentSegmentText += char;
                    } else {
                        // New script detected, push the old segment
                        if (currentSegmentText.length > 0) {
                            segments.push({ text: currentSegmentText, script: currentSegmentScript });
                        }
                        // Start new segment
                        currentSegmentText = char;
                        currentSegmentScript = charScript; // The actual script of the char starting the new segment
                    }
                }
                // Push the last segment
                if (currentSegmentText.length > 0) {
                    segments.push({ text: currentSegmentText, script: currentSegmentScript });
                }
            }

            // Create TextRun for each segment
            segments.forEach(segment => {
                if (segment.text.length === 0) return; // Should not happen if logic above is correct

                const decorationProps = mapTextDecorationToDocx(span.textDecoration);
                let spanColor = (span.color && span.color !== 'default' && span.color !== 'inherit' && /^#[0-9A-Fa-f]{3,8}$/.test(span.color))
                                ? span.color.replace("#", "")
                                : undefined;

                allRuns.push(new TextRun({
                    text: segment.text,
                    bold: span.fontWeight ? span.fontWeight >= 600 : (span.isBold || false),
                    italics: span.isItalic,
                    font: mapFontFamilyToDocx(
                        segment.text, // For reference/debugging, not directly used in current mapFontFamilyToDocx
                        segment.script, 
                        span.fontFamily, // AI's suggestion for the span
                        span.fontWeight,
                        blockFontFamilySuggestionFromAI, // Pass the block/cell's suggestion
                        blockLanguageFromAI, // Pass the block/cell's language
                        targetApplication
                    ),
                    size: mapFontSizeToDocx(defaultFontSizeCategoryForBlock, defaultBlockType), // Use block's default size category
                    color: spanColor,
                    ...decorationProps,
                    // fontStyleAttributes not directly mapped, complex. Could add if needed.
                }));
            });

            // Add a line break if this isn't the last line from the original split
            if (lineIndex < textLines.length - 1) {
                allRuns.push(new TextRun({ break: 1 }));
            }
        });
    });
    return allRuns;
};

const createDocumentContent = (blocks: FormattedBlock[], targetApplication: 'word' | 'gdocs'): (Paragraph | Table)[] => {
    return blocks.map(block => {
        if (block.blockType === 'table') {
            const tableBlock = block as FormattedTableBlock;
            const docxRows: DocxTableRow[] = tableBlock.rows.map(row => {
                const docxCells: DocxTableCell[] = row.cells.map(cell => {
                    // Determine effective language for the cell: cell's own language if specified, else table's language
                    const cellEffectiveLanguage = (cell as any).language || tableBlock.language; // Assuming cell might have 'language'
                    const cellFontFamilySuggestion = cell.fontFamilySuggestion; // From TableCell type
                    const cellFontSizeCategory = cell.fontSizeCategory; // From TableCell type

                    const cellContentRuns = createTextRunsFromSpans(
                        cell.content,
                        cellFontSizeCategory,      // Use cell's own font size category
                        cellFontFamilySuggestion,  // Use cell's own font family suggestion
                        cellEffectiveLanguage,     // Use cell's (or table's) language
                        targetApplication,
                        undefined // No blockType for table cell content itself
                    );

                    // Ensure even empty cells have a paragraph for structure, using cell's font size if defined
                    const cellParagraphs = cellContentRuns.length > 0 
                        ? [new Paragraph({ children: cellContentRuns, alignment: mapAlignmentToDocx(cell.alignment) })] 
                        // For empty cell, use its font size category for consistency if defined
                        : [new Paragraph({ children: [new TextRun({text: "", size: mapFontSizeToDocx(cellFontSizeCategory)})], alignment: mapAlignmentToDocx(cell.alignment) })];


                    let shading;
                    if (cell.backgroundColor && /^#[0-9A-Fa-f]{3,6}$/i.test(cell.backgroundColor)) {
                        shading = {
                            type: ShadingType.CLEAR,
                            fill: cell.backgroundColor.replace("#", ""),
                            color: "auto" // This is for pattern color, not text color
                        };
                    }

                    const borderStyle = BorderStyle.SINGLE; // Default border style
                    const borderSize = parseUnitValueToTwips(cell.borderWidth || tableBlock.borderWidth || "1pt", 20) / 20; // Default 1pt
                    const borderColor = (cell.borderColor || tableBlock.borderColor || "#000000").replace("#",""); // Default black


                    return new DocxTableCell({
                        children: cellParagraphs,
                        columnSpan: cell.colSpan,
                        rowSpan: cell.rowSpan,
                        // verticalAlign: VerticalAlign.TOP, // Default, can be customized
                        verticalMerge: cell.rowSpan && cell.rowSpan > 1 ? VerticalMergeType.RESTART : undefined, // Simplistic rowSpan handling
                        shading: shading,
                        margins: tableBlock.cellPadding ? { 
                            top: parseUnitValueToTwips(tableBlock.cellPadding),
                            bottom: parseUnitValueToTwips(tableBlock.cellPadding),
                            left: parseUnitValueToTwips(tableBlock.cellPadding),
                            right: parseUnitValueToTwips(tableBlock.cellPadding)
                        } : {top:80,bottom:80,left:80,right:80}, // Default padding if not specified
                        borders: { // Assuming all borders are the same for simplicity
                            top: { style: borderStyle, size: borderSize, color: borderColor },
                            bottom: { style: borderStyle, size: borderSize, color: borderColor },
                            left: { style: borderStyle, size: borderSize, color: borderColor },
                            right: { style: borderStyle, size: borderSize, color: borderColor },
                        }
                    });
                });
                return new DocxTableRow({ children: docxCells });
            });

            // Calculate table width
            const tableWidthPercent = tableBlock.tableWidth?.endsWith('%') ? parseFloat(tableBlock.tableWidth) : 100;

            let captionParagraphs: Paragraph[] = [];
            if (tableBlock.caption && tableBlock.caption.length > 0) {
                // For caption, use table's language and some generic font suggestions
                const captionRuns = createTextRunsFromSpans(tableBlock.caption, 'pt10', 'sans-serif', tableBlock.language, targetApplication, undefined);
                captionParagraphs.push(new Paragraph({ children: captionRuns, alignment: AlignmentType.CENTER, style: "Caption" }));
            }
            
            const docxTable = new Table({
                rows: docxRows,
                width: {
                    size: tableWidthPercent,
                    type: WidthType.PERCENTAGE,
                },
                // Add other table-wide properties if needed: borders, cell margins (defaults), etc.
            });
            // To ensure caption appears before the table if that's the desired layout
            const result: (Paragraph | Table)[] = [];
            if (captionParagraphs.length > 0) {
                result.push(...captionParagraphs);
            }
            result.push(docxTable);
            return result;


        } else { // Handle FormattedParagraphBlock (paragraphs, headings)
            const paraBlock = block as FormattedParagraphBlock;
            const currentFontSizePt = parsePtStringToNumber(paraBlock.fontSizeCategory);
            const paragraphLineSpacing = getLineSpacing(paraBlock.lineHeight, currentFontSizePt);
            const isHeading = paraBlock.blockType.startsWith('heading');

            // Default spacing after, can be adjusted or made more sophisticated
            const defaultSpaceAfterTwips = isHeading ? 200 : 100; // e.g., 10pt for headings, 5pt for paragraphs
            const spaceAfterTwips = parseUnitValueToTwips(paraBlock.spaceAfter, defaultSpaceAfterTwips);


            const docxSpans = createTextRunsFromSpans(
                paraBlock.spans,
                paraBlock.fontSizeCategory,
                paraBlock.fontFamilySuggestion,
                paraBlock.language,
                targetApplication,
                paraBlock.blockType
            );

            const headingLevel = getHeadingLevelFromBlockType(paraBlock.blockType);

            return [new Paragraph({ 
              children: docxSpans.length > 0 ? docxSpans : [new TextRun("")], // Ensure paragraph is not empty
              alignment: mapAlignmentToDocx(paraBlock.alignment),
              heading: headingLevel,
              spacing: {
                  // before: spaceBeforeTwips, // Can add if defined in FormattedBlock
                  after: spaceAfterTwips,
                  ...paragraphLineSpacing
              },
              style: headingLevel ? undefined : "NormalParcelStyle", // Use a defined style or let heading level apply
              // bullet/numbering could be added here if paraBlock.blockType is 'listItem'
            })];
        }
    }).flat(); // flat() is used because table processing might return an array [caption, table]
};

export const generateDocx = async (
    blocks: FormattedBlock[], 
    filename: string = "extracted_text.docx",
    targetApplication: 'word' | 'gdocs' = 'gdocs' // Default to GDocs friendly fonts
): Promise<void> => {
    const docxObjects = createDocumentContent(blocks, targetApplication);

    const baseFont = targetApplication === 'word' ? 'Calibri' : 'Open Sans';
    const baseFontSizeHalfPoints = mapFontSizeToDocx('pt11'); // Default 11pt -> 22 half-points

    const doc = new DocxDocument({
        sections: [{
          properties: {}, // Page setup, margins, etc. can go here
          children: docxObjects,
        }],
        styles: {
            default: {
                document: { // For settings like "automaticallyUpdateSyles: false"
                    run: { font: baseFont, size: baseFontSizeHalfPoints },
                },
                // paragraph: { // Default paragraph style if not overridden
                //   spacing: { after: 120 }, // e.g., 6pt after
                // },
            },
            paragraphStyles: [
                { id: "NormalParcelStyle", name: "Normal Parcel", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: baseFont, size: baseFontSizeHalfPoints } },
                { id: "Caption", name: "Caption", basedOn: "Normal", next: "NormalParcelStyle", run: { font: baseFont, size: 18, italics: true }, paragraph: { alignment: AlignmentType.CENTER, spacing: { after: 120 }}}, // 9pt
                // Define heading styles if not relying purely on HeadingLevel enum
                { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "NormalParcelStyle", quickFormat: true, run: { size: mapFontSizeToDocx('pt22', 'heading1'), bold: true, font: baseFont }, paragraph: { spacing: { before: 240, after: parseUnitValueToTwips(undefined, 240), ...getLineSpacing("1.2", 22) } as ISpacingProperties }},
                { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "NormalParcelStyle", quickFormat: true, run: { size: mapFontSizeToDocx('pt16', 'heading2'), bold: true, font: baseFont }, paragraph: { spacing: { before: 220, after: parseUnitValueToTwips(undefined, 220), ...getLineSpacing("1.2", 16) } as ISpacingProperties }},
                { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "NormalParcelStyle", quickFormat: true, run: { size: mapFontSizeToDocx('pt13', 'heading3'), bold: true, font: baseFont }, paragraph: { spacing: { before: 200, after: parseUnitValueToTwips(undefined, 200), ...getLineSpacing("1.3", 13) } as ISpacingProperties }},
                { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "NormalParcelStyle", quickFormat: true, run: { size: mapFontSizeToDocx('pt11', 'heading4'), bold: true, font: baseFont }, paragraph: { spacing: { before: 180, after: parseUnitValueToTwips(undefined, 180), ...getLineSpacing("1.4", 11) } as ISpacingProperties }},
                { id: "Heading5", name: "Heading 5", basedOn: "Normal", next: "NormalParcelStyle", quickFormat: true, run: { size: mapFontSizeToDocx('pt10', 'heading5'), bold: true, font: baseFont }, paragraph: { spacing: { before: 160, after: parseUnitValueToTwips(undefined, 160), ...getLineSpacing("1.4", 10) } as ISpacingProperties }},
                { id: "Heading6", name: "Heading 6", basedOn: "Normal", next: "NormalParcelStyle", quickFormat: true, run: { size: mapFontSizeToDocx('pt9', 'heading6'), bold: true, font: baseFont }, paragraph: { spacing: { before: 140, after: parseUnitValueToTwips(undefined, 140), ...getLineSpacing("1.5", 9) } as ISpacingProperties }},
            ]
        },
        creator: "Smart Lipikor",
        title: "Extracted Document Content",
        // description, keywords, etc.
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
};


const cloneStylesAndFonts = (documentClone: Document) => {
    // Clear existing head elements to avoid conflicts, but keep essential meta tags
    const head = documentClone.head;
    let charsetMeta = head.querySelector('meta[charset]');
    if (!charsetMeta) {
        charsetMeta = documentClone.createElement('meta');
        charsetMeta.setAttribute('charset', 'UTF-8');
    }
    let viewportMeta = head.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        viewportMeta = documentClone.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    
    while (head.firstChild) {
        head.removeChild(head.firstChild);
    }
    if (charsetMeta) head.appendChild(charsetMeta);
    if (viewportMeta) head.appendChild(viewportMeta);
    
    const originalLinks = window.document.querySelectorAll('link[href^="https://fonts.googleapis.com"]');
    originalLinks.forEach(link => {
        head.appendChild(link.cloneNode(true));
    });

    const originalStyles = window.document.querySelectorAll('style');
    originalStyles.forEach(style => {
        const clonedStyle = documentClone.createElement('style');
        clonedStyle.textContent = style.textContent; 
        head.appendChild(clonedStyle);
    });
};

const isDevEnvironment = (): boolean => {
  try {
    return typeof process !== 'undefined' &&
           typeof process.env !== 'undefined' &&
           process.env.NODE_ENV === 'development';
  } catch (e) {
    return false;
  }
};

export const generatePdf = async (element: HTMLElement, isPrintLayoutActive?: boolean): Promise<void> => {
  const options: Record<string, any> = { 
    scale: 2.5, 
    backgroundColor: isPrintLayoutActive ? null : '#FFFFFF', 
    useCORS: true, 
    allowTaint: true, 
    logging: isDevEnvironment(), 
    onclone: (documentClone: Document) => {
        cloneStylesAndFonts(documentClone);
        // If isPrintLayoutActive is true, 'element' is the white page itself.
        // Its white background will be captured. No body manipulation needed.
        // If isPrintLayoutActive is false, 'element' is the standard viewer,
        // which has a white background set by its Tailwind class in App.tsx.
        // The html2canvas backgroundColor: '#FFFFFF' option handles this.
        // So, specific body manipulations are generally not needed here if 'element' is styled correctly.
    }
  };
  const canvas = await html2canvas(element, options);
  const imgData = canvas.toDataURL('image/png');

  const pdfWidth = 210; 
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'l' : 'p', 
    unit: 'mm',
    format: [pdfWidth, pdfHeight] 
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save("extracted_text.pdf");
};

export const generateImage = async (element: HTMLElement, isPrintLayoutActive?: boolean): Promise<void> => {
   const options: Record<string, any> = { 
    scale: 2, 
    backgroundColor: isPrintLayoutActive ? null : '#FFFFFF', 
    useCORS: true,
    allowTaint: true,
    logging: isDevEnvironment(),
    onclone: (documentClone: Document) => {
       cloneStylesAndFonts(documentClone);
        // Similar to generatePdf, specific body manipulations are generally not needed
        // if 'element' is styled correctly and html2canvas options are set appropriately.
    }
  };
  const canvas = await html2canvas(element, options);
  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, "extracted_text.png");
    } else {
      throw new Error("Canvas to Blob conversion failed.");
    }
  }, 'image/png');
};



import React, { useRef, useCallback } from 'react';
import { 
    FormattedBlock, 
    TextSpan, 
    FontFamilySuggestion, 
    FontSizeCategory, 
    TextAlign, 
    Language, 
    FormattedParagraphBlock,
    FormattedTableBlock,
    TableCell
} from '../types';

interface FormattedTextViewerProps {
  blocks: FormattedBlock[];
  onSpanTextChange?: (blockId: string, spanIndex: number, newText: string, rowIndex?: number, cellIndex?: number) => void;
  isSelectAndCopyModeActive?: boolean; 
  isPrintLayoutActive?: boolean; // New prop for print layout mode
}

// Predefined font stacks for categories
const fontStacks = {
  'bengali-traditional': "'Tiro Bangla', 'SutonnyMJ', 'Kalpurush', 'Noto Sans Bengali', sans-serif",
  'bengali-modern-sans': "'Noto Sans Bengali', 'Hind Siliguri', 'Baloo Da 2', 'Tiro Bangla', sans-serif", 
  'bengali-stylized': "'Noto Sans Bengali', 'Hind Siliguri', 'Baloo Da 2', 'Tiro Bangla', sans-serif", 
  'arabic-naskh': "'Noto Naskh Arabic', 'Lateef', 'Cairo', serif",
  'arabic-kufi': "'Noto Kufi Arabic', 'Cairo', sans-serif", 
  'arabic-modern-sans': "'Noto Sans Arabic', 'Cairo', sans-serif",
  'serif': "'Merriweather', 'Playfair Display', 'Georgia', 'Times New Roman', serif",
  'sans-serif': "'Open Sans', 'Lato', 'Montserrat', 'Roboto', 'Arial', sans-serif",
  'monospace': "'Source Code Pro', 'Courier New', monospace",
  'script': "'Dancing Script', 'Pacifico', cursive", 
  'display': "'Playfair Display', 'Lobster', fantasy", 
  'default-bn': "'Tiro Bangla', 'Noto Sans Bengali', 'Hind Siliguri', 'Baloo Da 2', sans-serif",
  'default-ar': "'Noto Naskh Arabic', 'Noto Sans Arabic', serif",
  'default-en': "'Open Sans', 'Roboto', 'Arial', sans-serif",
  'print-layout-default': "'Times New Roman', serif", // Default for print layout
};

const getBaseFontFamilyCss = (suggestion: FontFamilySuggestion | undefined, lang: Language, isPrintLayout?: boolean): string => {
    if (isPrintLayout) {
        if (lang === 'bn') return fontStacks['default-bn'];
        if (lang === 'ar') return fontStacks['default-ar'];
        // For other languages in print layout, allow specific suggestions to override, else use print default
        if (suggestion && suggestion !== 'default' && suggestion !== 'unknown' && fontStacks[suggestion as keyof typeof fontStacks]) {
          return fontStacks[suggestion as keyof typeof fontStacks];
        }
        return fontStacks['print-layout-default'];
    }

    if (lang === 'bn') return fontStacks['default-bn'];
    
    switch (suggestion) {
        case 'bengali': return fontStacks['default-bn'];
        case 'arabic': return fontStacks['default-ar'];
        case 'serif': return fontStacks['serif'];
        case 'sans-serif': return fontStacks['sans-serif'];
        case 'monospace': return fontStacks['monospace'];
        default: 
          if (lang === 'ar') return fontStacks['default-ar'];
          return fontStacks['default-en'];
      }
};

const getTextAlignClass = (alignment: TextAlign | undefined): string => {
  switch (alignment) {
    case 'left': return 'text-left';
    case 'center': return 'text-center';
    case 'right': return 'text-right';
    case 'justify': return 'text-justify';
    default: return 'text-left'; // Default alignment
  }
};

const parsePtSize = (ptString: FontSizeCategory | undefined, defaultSize: number = 11): number => {
    if (!ptString) return defaultSize;
    const match = ptString.match(/^pt(\d+)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return defaultSize;
};

const getBlockElement = (blockType: FormattedParagraphBlock['blockType'], props: any, children: React.ReactNode): React.ReactElement => {
  switch (blockType) {
    case 'heading1': return <h1 {...props}>{children}</h1>;
    case 'heading2': return <h2 {...props}>{children}</h2>;
    case 'heading3': return <h3 {...props}>{children}</h3>;
    case 'heading4': return <h4 {...props}>{children}</h4>;
    case 'heading5': return <h5 {...props}>{children}</h5>;
    case 'heading6': return <h6 {...props}>{children}</h6>;
    case 'paragraph':
    case 'listItem': 
    default: return <p {...props}>{children}</p>;
  }
};


// Component to render individual spans - reusable for paragraphs and table cells
const RenderSpans: React.FC<{
  spans: TextSpan[];
  baseFontFamily: string;
  language: Language;
  blockId?: string; // For editing
  spanPath?: { rowIndex?: number; cellIndex?: number }; // For table cell editing
  onSpanTextChange?: FormattedTextViewerProps['onSpanTextChange'];
  isEditable: boolean;
  isSelectAndCopyModeActive?: boolean;
  isPrintLayoutActive?: boolean; // Pass this down
}> = ({ spans, baseFontFamily, language, blockId, spanPath, onSpanTextChange, isEditable, isSelectAndCopyModeActive, isPrintLayoutActive }) => {
  
  const debounceTimers = useRef<Record<string, number | null>>({});

  const handleSpanInput = useCallback((spanIndex: number, newText: string) => {
    if (!onSpanTextChange || !blockId || isSelectAndCopyModeActive) return;

    const timerKey = `${blockId}-${spanPath?.rowIndex ?? 'p'}-${spanPath?.cellIndex ?? 'p'}-${spanIndex}`;
    
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]!);
    }

    debounceTimers.current[timerKey] = window.setTimeout(() => { 
      onSpanTextChange(blockId, spanIndex, newText, spanPath?.rowIndex, spanPath?.cellIndex);
      debounceTimers.current[timerKey] = null; 
    }, 500); 
  }, [onSpanTextChange, blockId, spanPath, isSelectAndCopyModeActive]);

  React.useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return (
    <>
      {spans.map((span, spanIndex) => {
        const spanStyles: React.CSSProperties = {};
        let finalFontStack: string;

        if (language === 'bn') {
          finalFontStack = fontStacks['default-bn']; 
        } else if (language === 'ar' && isPrintLayoutActive) {
            finalFontStack = fontStacks['default-ar'];
        } else if (language === 'ar') {
            finalFontStack = fontStacks['default-ar'];
        } else if (isPrintLayoutActive && (!span.fontFamily || span.fontFamily === 'unknown' || span.fontFamily === 'default' || span.fontFamily === 'inherit')) {
            finalFontStack = fontStacks['print-layout-default']; // Default print font if no specific span font
        }
         else {
          finalFontStack = baseFontFamily; 
          if (span.fontFamily && span.fontFamily !== 'unknown' && span.fontFamily !== 'inherit' && span.fontFamily !== 'default') {
            // @ts-ignore
            if (fontStacks[span.fontFamily]) {
              // @ts-ignore
              finalFontStack = fontStacks[span.fontFamily];
            } else {
              const specificFont = span.fontFamily.includes(' ') || !/^[a-zA-Z0-9-]+$/.test(span.fontFamily) 
                                 ? `"${span.fontFamily}"` 
                                 : span.fontFamily;
              finalFontStack = `${specificFont}, ${baseFontFamily}`;
            }
          }
        }
        spanStyles.fontFamily = finalFontStack;

        // In print layout, ensure text is dark unless a specific dark color is already set by AI
        if (isPrintLayoutActive) {
            if (!span.color || span.color === 'default' || span.color === 'inherit' || /^#(FFF|FFFFFF|F0F0F0|E0E0E0)$/i.test(span.color)) { // common light/white colors
                spanStyles.color = '#333333'; // Default dark text for print layout if span color is light/white
            } else if (/^#[0-9A-Fa-f]{3,8}$/.test(span.color)) {
                spanStyles.color = span.color; // Use AI-specified color if it's not light/white
            } else {
                 spanStyles.color = '#333333'; // Fallback
            }
        } else if (span.color && span.color !== 'default' && span.color !== 'inherit' && /^#[0-9A-Fa-f]{3,8}$/.test(span.color)) { 
          spanStyles.color = span.color;
        }


        if (span.textDecoration && span.textDecoration !== 'none') {
          spanStyles.textDecoration = span.textDecoration;
        }
        if (span.fontWeight) {
          spanStyles.fontWeight = span.fontWeight;
        } else if (span.isBold) {
          spanStyles.fontWeight = 700; 
        }

        const spanClassesArray: string[] = [];
        if (span.isItalic) spanClassesArray.push('italic');
        if (span.isUncertain) spanClassesArray.push('uncertain-text');
        
        const textParts = span.text.split(/\\n|\n/g);
        const currentSpanIsEditable = isEditable && !!onSpanTextChange && !!blockId; // Check if editing is generally enabled for this context

        return (
          <span 
            key={spanIndex} 
            className={spanClassesArray.join(' ')} 
            style={spanStyles}
            contentEditable={currentSpanIsEditable}
            suppressContentEditableWarning={true}
            onInput={(e) => { 
              if (currentSpanIsEditable) { 
                handleSpanInput(spanIndex, e.currentTarget.innerText);
              }
            }}
            title={currentSpanIsEditable ? "Type to edit text" : (isSelectAndCopyModeActive ? "Text selection active" : (span.isUncertain ? "Uncertain transcription by AI" : undefined))} 
          >
            {textParts.map((part, partIndex) => (
              <React.Fragment key={partIndex}>
                {part}
                {partIndex < textParts.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
};


export const FormattedTextViewer: React.FC<FormattedTextViewerProps> = ({ blocks, onSpanTextChange, isSelectAndCopyModeActive, isPrintLayoutActive }) => {
  if (!blocks || blocks.length === 0) {
    const noContentClasses = `text-center ${isPrintLayoutActive ? 'py-10 text-slate-600' : 'text-slate-600'}`;
    return <p className={noContentClasses}>No text content to display.</p>;
  }
  
  const viewerWrapperClasses = [
    "break-words", 
    isPrintLayoutActive 
      ? "bg-white text-slate-900 shadow-xl mx-auto p-6 sm:p-8 md:p-10 w-full max-w-[880px] print-layout-actual-page" // Added print-layout-actual-page class
      : "", 
  ].filter(Boolean).join(' ');

  const viewerWrapperStyles: React.CSSProperties = {};
  if (isPrintLayoutActive) {
      viewerWrapperStyles.fontFamily = fontStacks['print-layout-default'];
      viewerWrapperStyles.minHeight = '1150px'; // Approx A4 height given max-width and padding.
  }


  return (
    <div className={viewerWrapperClasses} style={viewerWrapperStyles}> 
      {blocks.map((block) => {
        if (block.blockType === 'table') {
          const tableBlock = block as FormattedTableBlock;
          const tableStyles: React.CSSProperties = {
            width: tableBlock.tableWidth || 'auto',
            borderCollapse: 'collapse', 
            border: `${tableBlock.borderWidth || '1px'} solid ${tableBlock.borderColor || (isPrintLayoutActive ? '#666666' : '#cccccc')}`,
            margin: '1em 0', 
          };
          if (tableBlock.cellSpacing && tableStyles.borderCollapse === 'separate') {
            tableStyles.borderSpacing = tableBlock.cellSpacing;
          }

          return (
            <table key={tableBlock.id} style={tableStyles} className="w-full my-4">
              {tableBlock.caption && tableBlock.caption.length > 0 && (
                <caption className={`caption-bottom text-sm p-2 text-center ${isPrintLayoutActive ? 'text-slate-700' : 'text-slate-700'}`}>
                  <RenderSpans
                    spans={tableBlock.caption}
                    baseFontFamily={getBaseFontFamilyCss(undefined, tableBlock.language, isPrintLayoutActive)}
                    language={tableBlock.language}
                    isEditable={false} 
                    isSelectAndCopyModeActive={isSelectAndCopyModeActive}
                    isPrintLayoutActive={isPrintLayoutActive}
                  />
                </caption>
              )}
              <tbody>
                {tableBlock.rows.map((row, rowIndex) => (
                  <tr key={row.id}>
                    {row.cells.map((cell, cellIndex) => {
                      const cellStyles: React.CSSProperties = {
                        border: `${cell.borderWidth || tableBlock.borderWidth || '1px'} solid ${cell.borderColor || tableBlock.borderColor || (isPrintLayoutActive ? '#666666' : '#cccccc')}`,
                        padding: cell.content.length > 0 ? (tableBlock.cellPadding || '4pt') : '0', 
                        textAlign: cell.alignment || 'left',
                        backgroundColor: cell.backgroundColor, 
                        fontSize: `${parsePtSize(cell.fontSizeCategory, parsePtSize(undefined, 11))}pt`, 
                        fontFamily: getBaseFontFamilyCss(cell.fontFamilySuggestion, tableBlock.language, isPrintLayoutActive),
                      };
                      
                      const CellElement = cell.isHeader ? 'th' : 'td';
                      const cellIsEditable = !!onSpanTextChange && !isSelectAndCopyModeActive;

                      return (
                        <CellElement 
                            key={cell.id} 
                            style={cellStyles} 
                            colSpan={cell.colSpan} 
                            rowSpan={cell.rowSpan}
                            className={`${getTextAlignClass(cell.alignment)}`}
                        >
                          <RenderSpans
                            spans={cell.content}
                            baseFontFamily={getBaseFontFamilyCss(cell.fontFamilySuggestion, tableBlock.language, isPrintLayoutActive)}
                            language={tableBlock.language}
                            blockId={tableBlock.id}
                            spanPath={{ rowIndex, cellIndex }}
                            onSpanTextChange={onSpanTextChange}
                            isEditable={cellIsEditable} 
                            isSelectAndCopyModeActive={isSelectAndCopyModeActive}
                            isPrintLayoutActive={isPrintLayoutActive}
                          />
                        </CellElement>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        } else {
          // Handle FormattedParagraphBlock (paragraphs, headings)
          const paragraphBlock = block as FormattedParagraphBlock;
          const baseFontFamily = getBaseFontFamilyCss(paragraphBlock.fontFamilySuggestion, paragraphBlock.language, isPrintLayoutActive);
          
          const isHeading = paragraphBlock.blockType.startsWith('heading');
          const paragraphBaseClasses = [
            getTextAlignClass(paragraphBlock.alignment),
            isHeading ? 'font-semibold' : '', 
            isHeading ? 'mt-5' : '' 
          ].filter(Boolean).join(' ');

          let marginBottomValue = isHeading ? '1em' : '0.5em'; 
          if (paragraphBlock.spaceAfter) {
              if (paragraphBlock.spaceAfter === "0pt" || paragraphBlock.spaceAfter === "0") {
                  marginBottomValue = '0';
              } else if (typeof paragraphBlock.spaceAfter === 'string' && paragraphBlock.spaceAfter.endsWith('pt')) {
                  marginBottomValue = paragraphBlock.spaceAfter;
              }
          }

          const paragraphInlineStyles: React.CSSProperties = {
              fontSize: `${parsePtSize(paragraphBlock.fontSizeCategory)}pt`,
              fontFamily: (paragraphBlock.language === 'bn' || (paragraphBlock.language === 'ar' && isPrintLayoutActive)) 
                            ? getBaseFontFamilyCss(paragraphBlock.fontFamilySuggestion, paragraphBlock.language, isPrintLayoutActive) 
                            : baseFontFamily, 
              lineHeight: paragraphBlock.lineHeight || 'normal',
              marginBottom: marginBottomValue,
          };
          if (isPrintLayoutActive && !paragraphInlineStyles.color) {
            paragraphInlineStyles.color = '#333333'; 
          }


          const paragraphIsEditable = !!onSpanTextChange && !isSelectAndCopyModeActive;
          
          return getBlockElement(
            paragraphBlock.blockType,
            { 
              key: paragraphBlock.id, 
              className: paragraphBaseClasses,
              style: paragraphInlineStyles 
            },
            <RenderSpans 
              spans={paragraphBlock.spans}
              baseFontFamily={baseFontFamily} 
              language={paragraphBlock.language}
              blockId={paragraphBlock.id}
              onSpanTextChange={onSpanTextChange}
              isEditable={paragraphIsEditable}
              isSelectAndCopyModeActive={isSelectAndCopyModeActive}
              isPrintLayoutActive={isPrintLayoutActive}
            />
          );
        }
      })}
    </div>
  );
};

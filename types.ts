

export interface TextSpan {
  text: string;
  isBold?: boolean; 
  isItalic?: boolean;
  fontFamily?: string; 
  fontWeight?: number; 
  color?: string; 
  textDecoration?: 'none' | 'underline' | 'line-through';
  fontStyleAttributes?: string[]; 
  isUncertain?: boolean; // Added for marking uncertain words
}

export type FontFamilySuggestion = 'default' | 'serif' | 'sans-serif' | 'monospace' | 'bengali' | 'arabic' | 'unknown';

export type FontSizeCategory = 
  'pt8' | 'pt9' | 'pt10' | 'pt11' | 'pt12' | 'pt13' | 'pt14' | 'pt16' | 'pt18' | 
  'pt20' | 'pt22' | 'pt24' | 'pt26' | 'pt28' | 'pt30' | 'pt32' | 'pt36' | 
  'pt40' | 'pt44' | 'pt48' | 'pt54' | 'pt60' | 'pt72';

export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type Language = 'en' | 'bn' | 'ar' | 'unknown';

// --- New Table Types ---
export interface TableCell {
  id: string; // Unique ID for the cell
  content: TextSpan[]; // Content of the cell, can be formatted
  colSpan?: number;
  rowSpan?: number;
  isHeader?: boolean; // If true, render as <th>
  alignment?: TextAlign; // Cell specific alignment
  backgroundColor?: string; // e.g., '#FFFF00'
  borderColor?: string;     // e.g., '#000000'
  borderWidth?: string;   // e.g., '1px'
  // Cell-specific font overrides
  fontSizeCategory?: FontSizeCategory;
  fontFamilySuggestion?: FontFamilySuggestion; 
}

export interface TableRow {
  id: string; // Unique ID for the row
  cells: TableCell[];
}

// --- Block Types ---
export type ParagraphAndHeadingBlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6' | 'listItem';
export type TableBlockType = 'table';
export type AllBlockTypes = ParagraphAndHeadingBlockType | TableBlockType;


export interface BaseBlock {
  id: string;
  language: Language; // Predominant language of the block or default for table cells
}

export interface FormattedParagraphBlock extends BaseBlock {
  blockType: ParagraphAndHeadingBlockType;
  alignment: TextAlign;
  fontSizeCategory: FontSizeCategory; 
  fontFamilySuggestion: FontFamilySuggestion;
  lineHeight?: string; 
  spaceAfter?: string; 
  spans: TextSpan[];
}

export interface FormattedTableBlock extends BaseBlock {
  blockType: TableBlockType; // Should be 'table'
  rows: TableRow[];
  caption?: TextSpan[]; // Optional table caption
  // Table-wide visual properties (optional, AI might provide these)
  tableWidth?: string; // e.g., "100%", "500px"
  cellPadding?: string; // e.g., "5pt" (will be applied to cells by viewer)
  cellSpacing?: string; // e.g., "1pt" (for border-collapse: separate, if implemented)
  borderColor?: string; // Default border color for the table/cells
  borderWidth?: string; // Default border width for table/cells
}

export type FormattedBlock = FormattedParagraphBlock | FormattedTableBlock;

// --- Chat Message Type ---
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

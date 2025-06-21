

import React, { useState } from 'react';
import { Copy, Download, FileText, FileImage, FileType, CheckSquare, Edit3, Briefcase, FileUp } from 'lucide-react'; // Added Briefcase, FileUp for variety
import { ExportFormat } from '@/App'; // Import ExportFormat type

interface ToolbarProps {
  onCopyToClipboard: () => void;
  onToggleSelectAndCopyMode: () => void;
  isSelectAndCopyModeActive: boolean;
  onExport: (format: ExportFormat) => void;
  mainControlsDisabled: boolean;
  selectAndCopyDisabled: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
    onCopyToClipboard, 
    onToggleSelectAndCopyMode,
    isSelectAndCopyModeActive,
    onExport, 
    mainControlsDisabled,
    selectAndCopyDisabled
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);

  const handleExportClick = (format: ExportFormat) => {
    onExport(format);
    setShowExportOptions(false);
  };

  const selectAndCopyButtonText = isSelectAndCopyModeActive ? "Copy & Exit Mode" : "Select & Copy";
  const SelectAndCopyIcon = isSelectAndCopyModeActive ? CheckSquare : Edit3; 


  return (
    <div className="my-6 md:my-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-3 sm:p-4 bg-slate-800/70 rounded-lg shadow-xl">
      <h2 className="text-xl sm:text-2xl font-semibold text-teal-300">Extracted Content</h2>
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3">
        <button
          onClick={onToggleSelectAndCopyMode}
          disabled={selectAndCopyDisabled} 
          className={`flex items-center px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-150 ease-in-out
                      ${isSelectAndCopyModeActive 
                        ? 'text-amber-200 bg-amber-600/80 hover:bg-amber-500/80 focus:ring-amber-400 shadow-md hover:shadow-lg' 
                        : 'text-cyan-200 bg-cyan-700/70 hover:bg-cyan-600/70 focus:ring-cyan-500 shadow-sm hover:shadow-md'}
                      ${selectAndCopyDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
          title={isSelectAndCopyModeActive ? "Copy the selected text and exit this mode" : "Activate mode for text selection and copying"}
        >
          <SelectAndCopyIcon className="w-4 h-4 mr-2" />
          {selectAndCopyButtonText}
        </button>
        <button
          onClick={onCopyToClipboard}
          disabled={mainControlsDisabled} 
          className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium text-sky-200 bg-sky-700/70 hover:bg-sky-600/70 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
          title="Copy all extracted text"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy All
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            disabled={mainControlsDisabled} 
            className="flex items-center px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-medium text-emerald-200 bg-emerald-700/70 hover:bg-emerald-600/70 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out shadow-sm hover:shadow-md"
            title="Export options"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          {showExportOptions && (
            <div 
              className="absolute right-0 mt-2 w-56 bg-slate-750 rounded-md shadow-2xl py-1 z-20 border border-slate-600/70"
              onMouseLeave={() => setShowExportOptions(false)} 
            >
              <button
                onClick={() => handleExportClick('docx-word')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-650 hover:text-sky-300 transition-colors duration-150"
              >
                <Briefcase className="w-4 h-4 mr-3 text-sky-400" />
                Microsoft Word (.docx)
              </button>
              <button
                onClick={() => handleExportClick('docx-gdocs')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-650 hover:text-lime-300 transition-colors duration-150"
              >
                <FileUp className="w-4 h-4 mr-3 text-lime-400" /> {/* Changed icon */}
                Google Docs (.docx)
              </button>
              <button
                onClick={() => handleExportClick('pdf')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-650 hover:text-red-300 transition-colors duration-150"
              >
                <FileType className="w-4 h-4 mr-3 text-red-400" />
                PDF
              </button>
              <button
                onClick={() => handleExportClick('png')}
                className="w-full flex items-center px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-650 hover:text-purple-300 transition-colors duration-150"
              >
                <FileImage className="w-4 h-4 mr-3 text-purple-400" />
                PNG (Image)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
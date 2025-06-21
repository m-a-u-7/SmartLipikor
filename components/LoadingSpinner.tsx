
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  progress?: number; // 0-100
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Processing...", progress }) => (
  <div 
    className="flex flex-col items-center justify-center my-8 p-6 bg-slate-800/60 rounded-xl shadow-xl backdrop-blur-sm border border-slate-700/50"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-4 border-b-4 border-teal-400 mb-4"></div>
    <p className="text-teal-300 text-base sm:text-lg font-medium mb-2 text-center px-2">{message}</p>
    
    {typeof progress === 'number' && progress >= 0 && progress <= 100 && (
      <div className="w-full max-w-sm sm:max-w-md bg-slate-700 rounded-full h-2.5 my-2.5 overflow-hidden shadow-inner">
        <div 
          className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2.5 rounded-full transition-all duration-300 ease-linear" 
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={`Loading progress: ${progress}%`}
        ></div>
      </div>
    )}

    {typeof progress === 'number' && progress >= 0 && progress < 100 && (
        <p className="text-slate-400 text-xs sm:text-sm">{progress.toFixed(0)}% - This might take a few moments. Please wait.</p>
    )}
    {typeof progress === 'number' && progress === 100 && message !== "Export Error" && !message?.toLowerCase().includes("error") && ( // Check message to avoid showing 100% on error
         <p className="text-teal-400 text-xs sm:text-sm">Completed! Preparing results...</p>
    )}
    {/* Fallback text if progress is not applicable or not in a success state */}
    {(typeof progress !== 'number' || (progress < 100 && !message?.toLowerCase().includes("completed"))) && 
     !(typeof progress === 'number' && progress === 100 && (message === "Completed" || message?.toLowerCase().includes("exported"))) && (
      <p className="text-slate-400 text-xs sm:text-sm">Please wait patiently.</p>
    )}
  </div>
);

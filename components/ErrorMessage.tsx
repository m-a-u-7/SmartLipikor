import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="my-6 p-4 bg-rose-900/40 border border-rose-700/70 text-rose-300 rounded-lg flex items-start space-x-3 shadow-lg">
    <AlertTriangle className="h-6 w-6 text-rose-400 flex-shrink-0 mt-0.5" />
    <div>
      <h4 className="font-semibold text-rose-200">An error occurred</h4>
      <p className="text-sm break-words">{message}</p>
    </div>
  </div>
);
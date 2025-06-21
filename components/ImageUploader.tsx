import React, { useCallback, useState } from 'react';
import { UploadCloud, XCircle } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void;
  disabled: boolean;
  onClear: () => void;
  hasUploadedImage: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, disabled, onClear, hasUploadedImage }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a valid image file (JPG, PNG, WEBP).");
    }
  }, [onImageUpload, disabled]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  return (
    <div className="mb-6 md:mb-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex flex-col items-center justify-center w-full h-52 sm:h-60 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ease-in-out
                    ${disabled ? 'cursor-not-allowed bg-slate-800 opacity-60' : 
                       dragOver ? 'border-teal-500 bg-slate-700/70 shadow-lg scale-105' : 'border-slate-700 hover:border-teal-400 bg-slate-800/50 hover:bg-slate-700/50 shadow-md'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className={`w-10 h-10 sm:w-12 sm:h-12 mb-3 transition-colors ${dragOver ? 'text-teal-400' : 'text-slate-500'}`} />
          <p className={`mb-2 text-sm sm:text-base transition-colors ${dragOver ? 'text-teal-300' : 'text-slate-400'}`}>
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className={`text-xs sm:text-sm transition-colors ${dragOver ? 'text-teal-400' : 'text-slate-500'}`}>
            JPG, PNG, or WEBP (Max 5MB)
          </p>
        </div>
        <input 
          id="image-upload-input" 
          type="file" 
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" 
          accept="image/jpeg,image/png,image/webp" 
          onChange={handleFileChange} 
          disabled={disabled}
          aria-label="Image upload input"
        />
      </div>
      {hasUploadedImage && !disabled && (
        <button
          onClick={onClear}
          className="mt-4 flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-rose-400 hover:text-rose-300 border border-rose-600/70 hover:border-rose-500 bg-transparent hover:bg-rose-700/30 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-rose-500 transition-all duration-150 ease-in-out"
          aria-label="Clear uploaded image and results"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Clear Image & Results
        </button>
      )}
    </div>
  );
};
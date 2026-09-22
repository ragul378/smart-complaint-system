import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected, maxFiles = 5 }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);

    const files = Array.from(e.target.files);
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`File '${file.name}' exceeds maximum allowed size of 10MB.`);
        return;
      }
      validFiles.push(file);
    }

    const updated = [...selectedFiles, ...validFiles].slice(0, maxFiles);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        Attachments (Evidence / Photos / Documents)
      </label>

      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Paperclip className="w-6 h-6 text-slate-400 mb-1" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-[10px] text-slate-400">
              JPG, PNG, PDF, DOC (Max 10MB per file)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}

      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedFiles.map((file, idx) => {
            const isImage = file.type.startsWith('image/');
            return (
              <div
                key={idx}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
              >
                {isImage ? (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-[10px] text-slate-400">
                  ({(file.size / 1024).toFixed(0)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

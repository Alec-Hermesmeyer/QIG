// src/components/ContractAnalyzer/UploadZone.tsx
import React from 'react';
import { Text, DefaultButton } from '@fluentui/react';
import { UploadZoneProps } from '@/types';

/**
 * Component for file upload area with drag-and-drop functionality
 */
const UploadZone: React.FC<UploadZoneProps> = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  fileInputRef,
  handleFileInputChange
}) => {
  return (
    <div
      className={`rounded border-2 border-dashed border-gray-300 p-6 bg-gray-50 hover:bg-gray-100 transition cursor-pointer text-center my-4 ${
        isDragging ? 'bg-indigo-50 border-indigo-300' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div className="text-2xl text-gray-500">📄</div>
        <Text className="font-semibold text-gray-800">
          Drag and drop your contract file here
        </Text>
        <Text className="text-gray-500">
          or click to browse (DOCX or TXT)
        </Text>
        <DefaultButton
          text="Select File"
          className="mt-2 bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
        />
      </div>
    </div>
  );
};

export default UploadZone;
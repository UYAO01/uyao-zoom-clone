/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import { FileText, FileSpreadsheet, File as FileGeneric } from 'lucide-react';

interface FilePreviewProps {
  file: File;
}

const FilePreview = ({ file }: FilePreviewProps) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setPreview(null);
  }, [file]);

  if (file.type.startsWith('image/') && preview) {
    return (
      <img
        src={preview}
        alt={file.name}
        className="w-20 h-20 object-cover rounded-md border border-gray-200"
      />
    );
  }

  const getIcon = () => {
    if (file.type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (file.type.includes('word') || file.type.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (file.type.includes('sheet') || file.type.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    if (file.type.includes('presentation') || file.type.includes('powerpoint')) return <FileGeneric className="w-8 h-8 text-orange-500" />;
    return <FileGeneric className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div className="flex flex-col items-center justify-center w-20 h-20 bg-gray-50 rounded-md border border-gray-200 p-2" title={file.name}>
      {getIcon()}
      <span className="text-[10px] text-gray-500 mt-1 truncate w-full text-center">
        {file.name}
      </span>
    </div>
  );
};

export default FilePreview;
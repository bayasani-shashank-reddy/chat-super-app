import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

export default function FileUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadComplete(res.data);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div {...getRootProps()} className="border-2 border-dashed p-4 rounded cursor-pointer">
      <input {...getInputProps()} />
      {uploading ? (
        <p>Uploading...</p>
      ) : isDragActive ? (
        <p>Drop the file here...</p>
      ) : (
        <p>Drag & drop a file, or click to select</p>
      )}
    </div>
  );
}
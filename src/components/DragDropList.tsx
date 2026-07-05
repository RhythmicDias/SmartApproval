import { useRef, useState, DragEvent } from "react";
import { X, GripVertical, FileText } from "lucide-react";
import { basename } from "../lib/helpers";

interface DragDropListProps {
  files: string[];
  onChange: (files: string[]) => void;
}

export function DragDropList({ files, onChange }: DragDropListProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // Accept external PDF drops onto the list zone
  const handleExternalDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter((f) => f.name.toLowerCase().endsWith(".pdf"))
      .map((f) => (f as File & { path?: string }).path ?? f.name);

    if (droppedFiles.length > 0) {
      onChange([...files, ...droppedFiles]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  // Internal item reorder
  const handleItemDragStart = (index: number) => setDraggingIndex(index);

  const handleItemDragEnter = (index: number) => {
    dragOverIndex.current = index;
  };

  const handleItemDrop = () => {
    if (draggingIndex === null || dragOverIndex.current === null) return;
    if (draggingIndex === dragOverIndex.current) return;

    const reordered = [...files];
    const [moved] = reordered.splice(draggingIndex, 1);
    reordered.splice(dragOverIndex.current, 0, moved);
    onChange(reordered);
    setDraggingIndex(null);
    dragOverIndex.current = null;
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`drag-drop-zone ${isDragOver ? "drag-active" : ""}`}
      onDrop={handleExternalDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
    >
      {files.length === 0 ? (
        <div className="drag-drop-empty">
          <FileText size={36} className="drag-drop-icon" />
          <p>Drop PDF files here or use <strong>Add Files</strong></p>
          <p className="muted">Files can be reordered by dragging</p>
        </div>
      ) : (
        <ul className="file-list">
          {files.map((filePath, index) => (
            <li
              key={filePath + index}
              className={`file-item ${draggingIndex === index ? "dragging" : ""}`}
              draggable
              onDragStart={() => handleItemDragStart(index)}
              onDragEnter={() => handleItemDragEnter(index)}
              onDrop={handleItemDrop}
              onDragEnd={() => setDraggingIndex(null)}
              title={filePath}
            >
              <span className="grip">
                <GripVertical size={14} />
              </span>
              <span className="file-index">{index + 1}</span>
              <span className="file-name">{basename(filePath)}</span>
              <button
                className="remove-btn"
                onClick={() => removeFile(index)}
                title="Remove"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

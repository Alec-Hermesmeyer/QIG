"use' client";
import { useState } from "react";
import mammoth from "mammoth";

export function ContractUpload({ onExtracted }: { onExtracted: (text: string) => void }) {
  const [fileName, setFileName] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    let text = "";
    if (file.type === "application/pdf") {
      const pdfjsLib = await import("pdfjs-dist");
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else if (file.type === "text/plain") {
      text = await file.text();
    }

    onExtracted(text);
  };

  return (
    <div>
      <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
      {fileName && <p className="text-sm mt-2">Uploaded: {fileName}</p>}
    </div>
  );
}

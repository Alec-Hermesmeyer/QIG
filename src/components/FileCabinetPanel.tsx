"use client";

import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelType,
  Stack,
  Text,
  DefaultButton,
  Spinner,
  MessageBar,
  MessageBarType,
  DetailsList,
  IColumn,
  SelectionMode
} from '@fluentui/react';
import { Prompt } from '@/lib/prompt';
import { getCitationFilePath } from '@/lib/api'; // Assuming you have this util

interface FileCabinetPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  onRunAnalysis: (fileName: string, analysisResult: any, citationUrl: string) => void;
}

export const FileCabinetPanel: React.FC<FileCabinetPanelProps> = ({ isOpen, onDismiss, onRunAnalysis }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "List the contracts I have uploaded. Return only a JSON array of file names, and wrap it in triple backticks with json like ```json [\"Contract A.pdf\", \"Contract B.pdf\"]```",
            },
          ],
        }),
      });

      const streamReader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let result = "";

      if (streamReader) {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          result += decoder.decode(value);
        }
      }

      const lines = result.split(/\n/).map(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.content || "";
        } catch {
          return "";
        }
      });

      let fullContent = lines.join("").trim();
      fullContent = fullContent.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(fullContent);

      setFiles(parsed);
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError(err.message || "Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (fileName: string) => {
    try {
      setAnalyzingFile(fileName);
      
      // Fetch the document content using your proxy endpoint
      const contentRes = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`);
      
      if (!contentRes.ok) {
        throw new Error(`Failed to retrieve document content: ${contentRes.status}`);
      }
      
      const documentContent = await contentRes.text();
      
      // Now send the document content for analysis
      const analysisRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${Prompt}\n\nAnalyze the following contract text from "${fileName}":\n\n${documentContent}`,
            },
          ],
        }),
      });
      
      // Process the streaming response as before
      const streamReader = analysisRes.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let result = "";
  
      if (streamReader) {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          result += decoder.decode(value);
        }
      }
  
      const lines = result.split(/\n/).map(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.content || "";
        } catch {
          return "";
        }
      });
  
      const analysisContent = lines.join("").trim();
      
      // Call the parent component's callback with the analysis result
      const citationUrl = getCitationFilePath(fileName); // Assuming this utility generates the citation URL
      onRunAnalysis(fileName, analysisContent, citationUrl);
    } catch (err: any) {
      console.error("Error running analysis:", err);
      setError(`Error analyzing ${fileName}: ${err.message}`);
    } finally {
      setAnalyzingFile(null);
    }
  };

  const columns: IColumn[] = [
    {
      key: 'filename',
      name: 'File Name',
      fieldName: 'name',
      minWidth: 200,
      isResizable: true,
    },
    {
      key: 'actions',
      name: 'Actions',
      minWidth: 150,
      onRender: (item: { name: string }) => (
        <DefaultButton
          text={analyzingFile === item.name ? "Analyzing..." : "Run Analysis"}
          onClick={() => handleRunAnalysis(item.name)}
          disabled={analyzingFile !== null}
        />
      ),
    },
  ];

  const fileItems = files.map((f) => ({ name: f }));

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Contract File Cabinet"
      closeButtonAriaLabel="Close"
    >
      <Stack tokens={{ childrenGap: 12 }}>
        {loading && <Spinner label="Loading files..." />}
        {analyzingFile && <Spinner label={`Analyzing ${analyzingFile}...`} />}
        {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
        {!loading && !error && (
          <DetailsList
            items={fileItems}
            columns={columns}
            selectionMode={SelectionMode.none}
          />
        )}
      </Stack>
    </Panel>
  );
};

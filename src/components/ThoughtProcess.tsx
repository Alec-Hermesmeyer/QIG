import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import { a11yLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Thoughts } from "@/types/models";

// Register the JSON language for syntax highlighting
SyntaxHighlighter.registerLanguage("json", json);

interface Props {
  thoughts: Thoughts[];
}

export const ThoughtProcess = ({ thoughts }: Props) => {
  return (
    <ul className="p-4 bg-gray-50 rounded-lg w-full">
      {thoughts.map((t, ind) => (
        <li key={ind} className="mb-6 last:mb-0 pb-6 border-b last:border-b-0 border-gray-200">
          {/* Thought Step Title */}
          <div className="font-semibold text-blue-700 mb-2">{t.title}</div>
          
          {/* Thought Properties */}
          {t.props && Object.keys(t.props).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.keys(t.props).map((key) => (
                <span 
                  key={key} 
                  className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-md"
                >
                  {key}: {JSON.stringify(t.props?.[key] ?? null)}
                </span>
              ))}
            </div>
          )}
          
          {/* Thought Description */}
          <div className="mt-2">
            {Array.isArray(t.description) ? (
              <SyntaxHighlighter 
                language="json" 
                wrapLongLines 
                className="max-h-96 overflow-auto rounded-md" 
                style={a11yLight}
              >
                {JSON.stringify(t.description, null, 2)}
              </SyntaxHighlighter>
            ) : (
              <div className="whitespace-pre-wrap">{t.description}</div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};
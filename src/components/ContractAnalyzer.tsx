"use client";
import { useState } from "react";
import { OpenAI } from "openai"; // or groq/anthropic if preferred
import {Prompt} from "@/lib/prompt";

const PROMPT_HEADER = Prompt;

export function ContractAnalyzer({ contractText }: { contractText: string }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const analyzeContract = async () => {
    setLoading(true);

    const fullPrompt = `${PROMPT_HEADER}\n\n${contractText}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.01,
      }),
    });

    const data = await res.json();
    setAnalysis(data.choices?.[0]?.message?.content || "No response.");
    setLoading(false);
  };

  return (
    <div>
      <button onClick={analyzeContract} className="bg-blue-600 text-white px-4 py-2 rounded">
        Analyze Contract
      </button>
      {loading && <p className="mt-4">Analyzing...</p>}
      {analysis && (
        <div className="prose mt-6">
          <h2>Analysis Result</h2>
          <pre className="whitespace-pre-wrap">{analysis}</pre>
        </div>
      )}
    </div>
  );
}

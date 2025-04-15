"use client";
import { useState } from "react";
import { OpenAI } from "openai"; // or groq/anthropic if preferred

const PROMPT_HEADER = `You are an expert construction contract analyst with deep experience in risk assessment. Analyze the following construction contract in full. Identify and return every potential risk to the Construction Manager-At-Risk (Contractor), based on legal, financial, operational, reputational, or environmental exposure.
 
For each risk identified, return the following structured fields:
 
Risk Category – Classify the type of risk (e.g., Payment, Schedule, Termination, Liability, Design Risk, etc.)
 
Risk Score – Assign a score based on severity and likelihood using one of the following labels:
 
Critical – High likelihood of material impact (e.g., insolvency, uninsurable loss)
 
High – Likely and potentially costly or damaging
 
Medium – Possibly impactful with moderate consequences
 
Low – Limited impact or remote likelihood
 
Risky Contract Text – Quote or summarize the relevant contract clause(s) that create the risk. If the risk is in multiple places, then return all of them. If the risk is assumed then return the text that the assumption is based on.
 
Why This Is a Risk – Clearly explain the contractor’s exposure or disadvantage and the source of the risk.
 
Contract Location – Provide the section heading, article number, or page number where the clause appears.
 
After listing all risks, provide a final Mitigation Summary that:
 
Matches each risk (by category or reference) with a specific recommendation on how the contractor can mitigate, negotiate, or revise the contract language.
 
Groups similar mitigation suggestions where appropriate to avoid duplication.
 
Ensure that the following areas are thoroughly covered, but do not limit the scope to just these:
 
Liquidated Damages
 
Consequential Damages
 
Indemnification
 
Limitation of Liability
 
Termination (for default or convenience)
 
Force Majeure, Delay, and Schedule Obligations
 
Payment Terms, Lien Rights, Withholding
 
Hazardous Materials and Environmental Risks
 
Insurance and Risk of Loss
 
Change Orders and Scope Modifications
 
Dispute Resolution and Governing Law
 
Intellectual Property and Work Product Ownership
 
Owner-Furnished Info and Design Reliance
 
Key Personnel, Subcontracting, and Flow-Down Clauses
 
Confidentiality, Audit Rights, MWBE Compliance
 
Return the risks in a clean, structured list. Use bullet or number formatting, and include headers to separate the risk items from the mitigation summary.`; // use your full prompt

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
        temperature: 0.4,
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

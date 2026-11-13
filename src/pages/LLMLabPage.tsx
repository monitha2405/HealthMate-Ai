import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Terminal,
  Database,
  SplitSquareVertical,
  Network,
  Wrench,
  BrainCircuit,
  CheckCircle,
  Activity,
  Play,
  Loader2,
  AlertTriangle,
  Layers,
  Sparkles,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import type { EvaluationSummary, AgentExecutionTrace } from '../types';

type LabTab = 'prompt' | 'rag' | 'compare' | 'routing' | 'tools' | 'memory' | 'evaluation' | 'observability';

export const LLMLabPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LabTab>('evaluation');

  // A. Prompt Playground State
  const [systemPrompt, setSystemPrompt] = useState('You are a clinical decision-support assistant. Answer in bullet points with high precision. Do not diagnose.');
  const [userPrompt, setUserPrompt] = useState('Explain the pathophysiological relationship between HbA1c and long-term microvascular complications.');
  const [promptResponse, setPromptResponse] = useState<string>('');
  const [promptLoading, setPromptLoading] = useState(false);

  // B. RAG Inspector State
  const [ragQuery, setRagQuery] = useState('What was my fasting glucose and HbA1c value in my last report?');
  const [ragTopK, setRagTopK] = useState(3);
  const [ragInspectionResult, setRagInspectionResult] = useState<any>(null);
  const [ragLoading, setRagLoading] = useState(false);

  // C. Comparison State
  const [compareQuery, setCompareQuery] = useState('What is my current total cholesterol level according to my test?');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // D. Routing State
  const [routingQuery, setRoutingQuery] = useState('Can you suggest a vegetarian high-protein Indian diet plan for me?');
  const [routingResult, setRoutingResult] = useState<any>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  // E. Tools State
  const [selectedTool, setSelectedTool] = useState('calculateBMI');
  const [toolArgs, setToolArgs] = useState('{"weightKg": 74, "heightCm": 175}');
  const [toolResult, setToolResult] = useState<any>(null);
  const [toolLoading, setToolLoading] = useState(false);

  // F. Memory State
  const [memoryData, setMemoryData] = useState<any>(null);

  // G. Evaluation State
  const [evaluationSummary, setEvaluationSummary] = useState<EvaluationSummary | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  // H. Observability State
  const [traces, setTraces] = useState<AgentExecutionTrace[]>([]);
  const [observabilityLoading, setObservabilityLoading] = useState(false);

  // Auto-run evaluation or load memory on mount
  useEffect(() => {
    loadMemory();
    loadObservability();
    runEvalSuite();
  }, []);

  const runPromptTest = async () => {
    setPromptLoading(true);
    try {
      const res = await api.runPromptPlayground(systemPrompt, userPrompt);
      setPromptResponse(res.response);
    } catch (e: any) {
      setPromptResponse('Error: ' + e.message);
    } finally {
      setPromptLoading(false);
    }
  };

  const runRagInspect = async () => {
    setRagLoading(true);
    try {
      const res = await api.inspectRAG(ragQuery, ragTopK);
      setRagInspectionResult(res);
    } catch (e: any) {
      alert('RAG Inspection failed: ' + e.message);
    } finally {
      setRagLoading(false);
    }
  };

  const runCompare = async () => {
    setCompareLoading(true);
    try {
      const res = await api.compareLLMvsRAG(compareQuery);
      setComparisonResult(res);
    } catch (e: any) {
      alert('Comparison failed: ' + e.message);
    } finally {
      setCompareLoading(false);
    }
  };

  const runRouting = async () => {
    setRoutingLoading(true);
    try {
      const res = await api.visualizeRouting(routingQuery);
      setRoutingResult(res);
    } catch (e: any) {
      alert('Routing visualization failed: ' + e.message);
    } finally {
      setRoutingLoading(false);
    }
  };

  const runTool = async () => {
    setToolLoading(true);
    setToolResult(null);
    try {
      const parsedArgs = JSON.parse(toolArgs);
      const res = await api.executeToolLab(selectedTool, parsedArgs);
      setToolResult(res.result);
    } catch (e: any) {
      setToolResult({ error: e.message });
    } finally {
      setToolLoading(false);
    }
  };

  const loadMemory = async () => {
    try {
      const mem = await api.getMemoryInspector();
      setMemoryData(mem);
    } catch (e) {
      console.warn('Memory load error:', e);
    }
  };

  const toggleMemoryConsent = async (allowed: boolean) => {
    try {
      await api.updateMemoryConsent(allowed);
      loadMemory();
    } catch (e: any) {
      alert('Consent update failed: ' + e.message);
    }
  };

  const clearMemory = async () => {
    try {
      await api.clearUserMemory();
      loadMemory();
    } catch (e: any) {
      alert('Memory purge failed: ' + e.message);
    }
  };

  const runEvalSuite = async () => {
    setEvaluating(true);
    try {
      const summary = await api.runEvaluationSuite();
      setEvaluationSummary(summary);
    } catch (e) {
      console.warn('Evaluation failed:', e);
    } finally {
      setEvaluating(false);
    }
  };

  const loadObservability = async () => {
    setObservabilityLoading(true);
    try {
      const logs = await api.getObservabilityTraces();
      setTraces(logs);
    } catch (e) {
      console.warn('Observability load error:', e);
    } finally {
      setObservabilityLoading(false);
    }
  };

  const tabs = [
    { id: 'evaluation' as LabTab, label: 'Evaluation Suite (40+ Tests)', icon: CheckCircle },
    { id: 'routing' as LabTab, label: 'Agent Routing Visualizer', icon: Network },
    { id: 'rag' as LabTab, label: 'RAG Inspector', icon: Database },
    { id: 'compare' as LabTab, label: 'Standard vs RAG Grounding', icon: SplitSquareVertical },
    { id: 'tools' as LabTab, label: 'Tool Calling Laboratory', icon: Wrench },
    { id: 'prompt' as LabTab, label: 'Prompt Engineering', icon: Terminal },
    { id: 'memory' as LabTab, label: 'Memory Inspector', icon: BrainCircuit },
    { id: 'observability' as LabTab, label: 'Observability & Traces', icon: Activity },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* Lab Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#07566A] text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-teal-500/20 text-[#21C4B8] text-[11px] font-mono">
            <span>Healthcare Intelligence & Clinical LLM Showcase</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight">LLM Engineering & Multi-Agent Architecture Laboratory</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Interactive verification of prompt engineering, persistent SQLite vector embeddings, intent classification routing, deterministic tool execution, and automated safety benchmark suites.
          </p>
        </div>

        <button
          onClick={runEvalSuite}
          disabled={evaluating}
          className="px-4 py-2 bg-[#0FAEAE] hover:bg-[#21C4B8] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
        >
          {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>Run 40-Test Benchmark Suite</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#07566A] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB G: Evaluation Suite */}
      {activeTab === 'evaluation' && (
        <div className="space-y-6">
          {evaluationSummary ? (
            <>
              {/* Scorecard */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 uppercase">Overall Benchmark Accuracy</div>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
                    {evaluationSummary.accuracyPercent}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {evaluationSummary.passed} / {evaluationSummary.totalTests} Tests Passing
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 uppercase">Agent Routing Precision</div>
                  <div className="text-3xl font-extrabold text-[#0FAEAE] mt-1 font-mono">
                    {evaluationSummary.categoryScores.routing?.accuracy}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {evaluationSummary.categoryScores.routing?.passed} / {evaluationSummary.categoryScores.routing?.total} Scenarios
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 uppercase">Medical Safety Compliance</div>
                  <div className="text-3xl font-extrabold text-indigo-600 mt-1 font-mono">
                    {evaluationSummary.categoryScores.safety?.accuracy}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Emergency & Non-Diagnostic Guardrails
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="text-xs font-bold text-slate-500 uppercase">Deterministic Tools & RAG</div>
                  <div className="text-3xl font-extrabold text-teal-700 mt-1 font-mono">
                    {evaluationSummary.categoryScores.tools?.accuracy}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Math, MAP, & Cosine Invariants
                  </div>
                </div>
              </div>

              {/* Table of all 40 test cases */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Automated Test Matrix ({evaluationSummary.results.length} Tests)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Executed: {new Date(evaluationSummary.executionTimestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">Test ID</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4">Scenario Name</th>
                        <th className="py-2.5 px-4">Result / Observation</th>
                        <th className="py-2.5 px-4">Latency</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {evaluationSummary.results.map(r => (
                        <tr key={r.testId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-slate-600">{r.testId}</td>
                          <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-slate-500">{r.category}</td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{r.name}</td>
                          <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">{r.actualOutcome}</td>
                          <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{r.latencyMs}ms</td>
                          <td className="py-2.5 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.passed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {r.passed ? 'PASSED' : 'FAILED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0FAEAE] mb-2" />
              <span>Running automated evaluation benchmark suite...</span>
            </div>
          )}
        </div>
      )}

      {/* TAB D: Routing Visualizer */}
      {activeTab === 'routing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h4 className="text-sm font-bold text-slate-900">Intent Classification & Multi-Agent Dispatcher</h4>
          <p className="text-xs text-slate-500">
            Tests the central orchestrator's deterministic intent classifier to select between the 5 specialist agents or emergency interceptor.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={routingQuery}
              onChange={e => setRoutingQuery(e.target.value)}
              placeholder="Enter a healthcare question..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            />
            <button
              onClick={runRouting}
              disabled={routingLoading || !routingQuery.trim()}
              className="px-4 py-2.5 bg-[#0FAEAE] text-white rounded-xl text-xs font-bold hover:bg-[#21C4B8] transition-colors cursor-pointer"
            >
              {routingLoading ? 'Routing...' : 'Analyze Intent'}
            </button>
          </div>

          {routingResult && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Classified Intent</div>
                  <div className="text-sm font-bold text-slate-900 mt-1 font-mono">{routingResult.intent}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Selected Specialist Agent</div>
                  <div className="text-sm font-bold text-[#07566A] mt-1">{routingResult.selectedAgent}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Routing Confidence</div>
                  <div className="text-sm font-bold text-emerald-600 mt-1 font-mono">{(routingResult.confidence * 100).toFixed(0)}%</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">Orchestrator Routing Rationale:</div>
                <p className="text-slate-600">{routingResult.reasoning}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: RAG Inspector */}
      {activeTab === 'rag' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h4 className="text-sm font-bold text-slate-900">Persistent SQLite RAG Inspector & Cosine Similarity</h4>
          <p className="text-xs text-slate-500">
            Computes query embedding via Gemini Embeddings, queries SQLite vector chunks scoped to your UID, and calculates cosine similarity scores.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={ragQuery}
              onChange={e => setRagQuery(e.target.value)}
              placeholder="Query to search against indexed document chunks..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            />
            <button
              onClick={runRagInspect}
              disabled={ragLoading || !ragQuery.trim()}
              className="px-4 py-2.5 bg-[#0FAEAE] text-white rounded-xl text-xs font-bold hover:bg-[#21C4B8] transition-colors cursor-pointer"
            >
              {ragLoading ? 'Searching...' : 'Search Vector Store'}
            </button>
          </div>

          {ragInspectionResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span>Total Indexed Chunks in SQLite: <strong>{ragInspectionResult.totalUserChunksIndexed}</strong></span>
                <span>Search Latency: <strong>{ragInspectionResult.latencyMs} ms</strong></span>
              </div>

              {ragInspectionResult.retrievedChunks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                  No matching document chunks found in your personal storage. Upload a lab report under Health Documents first.
                </div>
              ) : (
                <div className="space-y-3">
                  {ragInspectionResult.retrievedChunks.map((chunk: any, i: number) => (
                    <div key={chunk.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#07566A]">
                          Rank #{i + 1}: {chunk.documentTitle} (Chunk Index: {chunk.chunkIndex})
                        </span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Cosine Similarity: {chunk.similarity}
                        </span>
                      </div>
                      <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                        {chunk.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB C: Base vs RAG Comparison */}
      {activeTab === 'compare' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h4 className="text-sm font-bold text-slate-900">Parametric Gemini LLM vs Grounded RAG Comparison</h4>
          <p className="text-xs text-slate-500">
            Side-by-side run demonstrating how RAG injects retrieved user document excerpts to eliminate hallucination of private health data.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={compareQuery}
              onChange={e => setCompareQuery(e.target.value)}
              placeholder="e.g. What is my cholesterol reading?"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            />
            <button
              onClick={runCompare}
              disabled={compareLoading || !compareQuery.trim()}
              className="px-4 py-2.5 bg-[#0FAEAE] text-white rounded-xl text-xs font-bold hover:bg-[#21C4B8] transition-colors cursor-pointer"
            >
              {compareLoading ? 'Generating...' : 'Compare Responses'}
            </button>
          </div>

          {comparisonResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700">1. Base Gemini Model (Parametric)</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">No RAG</span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{comparisonResult.baseResponse}</p>
                </div>

                <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                    <span className="text-xs font-bold text-[#07566A]">2. Grounded RAG Response</span>
                    <span className="text-[10px] bg-teal-200 text-[#07566A] px-1.5 py-0.5 rounded font-mono font-bold">RAG Active</span>
                  </div>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{comparisonResult.ragResponse}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
                <span className="font-bold text-slate-900">Grounding Rationale: </span>
                {comparisonResult.groundingExplanation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB E: Tool Calling Lab */}
      {activeTab === 'tools' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h4 className="text-sm font-bold text-slate-900">Controlled Deterministic Function Calling</h4>
          <p className="text-xs text-slate-500">
            Executes controlled mathematical and clinical tools that bypass LLM hallucination for precise clinical formulas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Select Tool</label>
              <select
                value={selectedTool}
                onChange={e => {
                  setSelectedTool(e.target.value);
                  if (e.target.value === 'calculateBMI') setToolArgs('{"weightKg": 74, "heightCm": 175}');
                  else if (e.target.value === 'calculateMeanArterialPressure') setToolArgs('{"systolic": 125, "diastolic": 82}');
                  else if (e.target.value === 'compareMeasurements') setToolArgs('{"baselineValue": 80, "currentValue": 76, "metricName": "weight"}');
                  else if (e.target.value === 'evaluateLabReference') setToolArgs('{"testName": "glucose_fasting", "value": 115}');
                  else if (e.target.value === 'calculateNutritionTargets') setToolArgs('{"weightKg": 70, "heightCm": 170, "age": 28, "gender": "male", "goal": "weight_loss"}');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden"
              >
                <option value="calculateBMI">calculateBMI</option>
                <option value="calculateMeanArterialPressure">calculateMeanArterialPressure (MAP)</option>
                <option value="compareMeasurements">compareMeasurements (Delta & Direction)</option>
                <option value="evaluateLabReference">evaluateLabReference (Biomarker Interval)</option>
                <option value="calculateNutritionTargets">calculateNutritionTargets (Mifflin-St Jeor)</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">Input Arguments (JSON)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={toolArgs}
                  onChange={e => setToolArgs(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                />
                <button
                  onClick={runTool}
                  disabled={toolLoading}
                  className="px-4 py-2 bg-[#0FAEAE] text-white rounded-xl text-xs font-bold hover:bg-[#21C4B8] transition-colors cursor-pointer"
                >
                  Execute Tool
                </button>
              </div>
            </div>
          </div>

          {toolResult && (
            <div className="bg-slate-900 text-teal-300 p-4 rounded-xl font-mono text-xs overflow-x-auto">
              <div className="text-slate-400 text-[11px] pb-1 border-b border-slate-800 mb-2">// Deterministic Execution Output</div>
              <pre>{JSON.stringify(toolResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* TAB A: Prompt Engineering */}
      {activeTab === 'prompt' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <h4 className="text-sm font-bold text-slate-900">Prompt Engineering Playground</h4>
          <p className="text-xs text-slate-500">Experiment with conditioning system instructions and observing LLM outputs.</p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">System Instruction</label>
              <textarea
                rows={2}
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">User Prompt</label>
              <textarea
                rows={2}
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
              />
            </div>

            <button
              onClick={runPromptTest}
              disabled={promptLoading}
              className="px-4 py-2 bg-[#0FAEAE] text-white rounded-xl text-xs font-bold hover:bg-[#21C4B8] cursor-pointer"
            >
              {promptLoading ? 'Generating...' : 'Run Generation'}
            </button>
          </div>

          {promptResponse && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs whitespace-pre-wrap">
              <div className="font-bold text-slate-900 mb-1">Generated Output:</div>
              {promptResponse}
            </div>
          )}
        </div>
      )}

      {/* TAB F: Memory Inspector */}
      {activeTab === 'memory' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Conversational Memory & User Consent</h4>
              <p className="text-xs text-slate-500">Demonstrates user-consented semantic memory storage and granular purge</p>
            </div>

            <button
              onClick={clearMemory}
              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Memory</span>
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="consentBox"
              checked={memoryData?.consentAllowed || false}
              onChange={e => toggleMemoryConsent(e.target.checked)}
              className="rounded text-[#0FAEAE] focus:ring-teal-500"
            />
            <label htmlFor="consentBox" className="text-xs text-slate-700 cursor-pointer">
              <strong>Consent for semantic memory:</strong> Allow HealthMate AI to retain past query context to personalize future multi-agent responses.
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">Saved Semantic Context Records ({memoryData?.memories?.length || 0})</span>
            {memoryData?.memories?.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No active memories saved. Ask questions in the AI Assistant with "Remember context" checked.
              </div>
            ) : (
              <div className="space-y-2">
                {memoryData?.memories?.map((m: any) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{m.content}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-teal-100 text-teal-800">
                      {m.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB H: Observability */}
      {activeTab === 'observability' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Execution Traces & Agent Telemetry</h4>
              <p className="text-xs text-slate-500">Real runtime audit logs capturing agent dispatch latency, tools invoked, and RAG retrieval</p>
            </div>
            <button
              onClick={loadObservability}
              className="text-xs text-[#0FAEAE] font-bold hover:underline cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Query</th>
                  <th className="py-2.5 px-4">Agent</th>
                  <th className="py-2.5 px-4">RAG Chunks</th>
                  <th className="py-2.5 px-4">Latency</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {traces.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 max-w-xs truncate">
                      {t.query}
                    </td>
                    <td className="py-2.5 px-4 text-[#07566A] font-medium">{t.agentSelected}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{t.ragChunksRetrieved}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{t.latencyMs}ms</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        t.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'safety_intercepted'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

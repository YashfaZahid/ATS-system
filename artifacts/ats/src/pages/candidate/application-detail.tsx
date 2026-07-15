import React from 'react';
import { useRoute, Link } from 'wouter';
import { useGetApplication, useGetApplicationHistory, useGetApplicationAnalysis } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, Zap, CheckCircle, AlertCircle, Building, MapPin } from 'lucide-react';
import { STAGE_COLORS, STAGE_LABELS, formatDate, getMatchScoreColor } from '@/lib/utils/format';

const ALL_STAGES = [
  'applied', 'screening', 'shortlisted', 'technical_interview', 'hr_interview', 'offer', 'hired'
];

export default function ApplicationDetail() {
  const [, params] = useRoute('/applications/:id');
  const id = params?.id || '';

  const { data: application, isLoading: appLoading } = useGetApplication(id, { query: { enabled: !!id } });
  const { data: history, isLoading: histLoading } = useGetApplicationHistory(id, { query: { enabled: !!id } });
  const { data: analysis, isLoading: analysisLoading } = useGetApplicationAnalysis(id, { query: { enabled: !!id } });

  if (appLoading) return <div className="p-8 text-center">Loading application...</div>;
  if (!application) return <div className="p-8 text-center text-red-500">Application not found.</div>;

  const job = application.job;
  const currentStageIndex = ALL_STAGES.indexOf(application.stage);
  const isRejected = application.stage === 'rejected';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Link href="/applications" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to applications
      </Link>

      {/* Header Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{job?.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
              <span className="flex items-center"><Building className="mr-1.5 h-4 w-4" /> {job?.department}</span>
              <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4" /> {job?.location}</span>
              <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> Applied {formatDate(application.createdAt)}</span>
            </div>
          </div>
          <Badge className={`px-4 py-1.5 text-sm font-semibold rounded-full border-0 ${STAGE_COLORS[application.stage]}`}>
            {STAGE_LABELS[application.stage]}
          </Badge>
        </div>

        {/* Progress Pipeline */}
        <div className="mt-12">
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-zinc-800 -translate-y-1/2 rounded-full"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-1000"
              style={{ width: `${isRejected ? 100 : (Math.max(0, currentStageIndex) / (ALL_STAGES.length - 1)) * 100}%`, backgroundColor: isRejected ? 'var(--color-destructive)' : '' }}
            ></div>
            
            <div className="relative flex justify-between">
              {isRejected ? (
                // Rejected state shows simplified pipeline
                <>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center z-10 ring-4 ring-white dark:ring-zinc-900">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="mt-2 text-xs font-medium text-gray-900 dark:text-white">Applied</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center z-10 ring-4 ring-white dark:ring-zinc-900">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <span className="mt-2 text-xs font-medium text-red-500">Rejected</span>
                  </div>
                </>
              ) : (
                ALL_STAGES.map((stage, idx) => {
                  const isCompleted = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;
                  
                  return (
                    <div key={stage} className="flex flex-col items-center w-24">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ring-4 ring-white dark:ring-zinc-900 transition-colors
                          ${isCompleted ? 'bg-primary text-white' : 
                            isCurrent ? 'bg-white dark:bg-zinc-900 border-2 border-primary text-primary' : 
                            'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}
                      >
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-primary' : 'bg-gray-300 dark:bg-zinc-600'}`}></div>}
                      </div>
                      <span className={`mt-2 text-xs font-medium text-center ${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {STAGE_LABELS[stage]}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* AI Analysis section - if available */}
          {!analysisLoading && analysis && (
            <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap className="w-24 h-24 text-primary" />
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle>AI Match Analysis</CardTitle>
                </div>
                <CardDescription>How your profile aligns with this role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-20 h-20 rounded-full border-4 ${getMatchScoreColor(analysis.matchScore)} bg-white dark:bg-zinc-900 shadow-sm shrink-0`}>
                    <span className="text-2xl font-black">{analysis.matchScore}%</span>
                  </div>
                  <div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center text-sm"><CheckCircle className="h-4 w-4 mr-1.5" /> Core Strengths</h4>
                    <ul className="space-y-1.5">
                      {analysis.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="text-green-500 mr-2">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-zinc-900/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center text-sm"><Zap className="h-4 w-4 mr-1.5" /> Improvement Suggestions</h4>
                    <ul className="space-y-1.5">
                      {analysis.improvementSuggestions.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="text-blue-500 mr-2">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {application.coverLetter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                  {application.coverLetter}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {/* History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application History</CardTitle>
            </CardHeader>
            <CardContent>
              {histLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse"></div>)}
                </div>
              ) : history && history.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-gray-200 dark:border-zinc-800 space-y-6 ml-2">
                  {history.map((item, idx) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-[31px] bg-primary w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900"></div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Moved to <span className="text-primary">{STAGE_LABELS[item.newStage]}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(item.changedAt)}</p>
                      {item.comment && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900 p-2 rounded">
                          "{item.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                  {/* First entry - implicit created */}
                  <div className="relative">
                    <div className="absolute -left-[31px] bg-gray-300 dark:bg-zinc-700 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900"></div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Applied</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(application.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No history events yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
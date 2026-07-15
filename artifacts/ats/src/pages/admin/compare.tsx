import React, { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useListCandidates, useCompareCandidates } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, User, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getMatchScoreColor } from '@/lib/utils/format';

export default function CompareCandidates() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: candidatesData, isLoading: cLoading } = useListCandidates({ limit: 50 });
  const candidates = candidatesData?.candidates || [];
  
  const compareMutation = useCompareCandidates();
  
  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) {
        toast({ title: "Limit reached", description: "You can compare up to 4 candidates at a time." });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast({ title: "Not enough candidates", description: "Please select at least 2 candidates." });
      return;
    }
    
    try {
      await compareMutation.mutateAsync({
        data: { candidateIds: selectedIds }
      });
    } catch (e: any) {
      toast({ title: "Comparison failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/candidates"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compare Candidates</h1>
            <p className="text-gray-500">Select 2-4 candidates for side-by-side analysis</p>
          </div>
        </div>
        {!compareMutation.data && (
          <Button onClick={handleCompare} disabled={selectedIds.length < 2 || compareMutation.isPending}>
            {compareMutation.isPending ? 'Analyzing...' : `Compare ${selectedIds.length} Candidates`}
          </Button>
        )}
        {compareMutation.data && (
          <Button variant="outline" onClick={() => compareMutation.reset()}>
            Reset Selection
          </Button>
        )}
      </div>

      {!compareMutation.data ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-6 py-4 w-12"></th>
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Headline</th>
                    <th className="px-6 py-4">Experience</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {cLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr>
                  ) : candidates.map(c => (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer ${selectedIds.includes(c.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                      onClick={() => handleToggle(c.id)}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedIds.includes(c.id)}
                          onCheckedChange={() => handleToggle(c.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.headline || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{c.yearsOfExperience ? `${c.yearsOfExperience} yrs` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-8">
          <div className="flex gap-6 min-w-max">
            {compareMutation.data.candidates.map((candidate, i) => {
              const analysis = compareMutation.data.analyses[i];
              return (
                <div key={candidate.id} className="w-[350px] space-y-6 shrink-0">
                  <Card className="border-t-4 border-t-primary h-full">
                    <CardHeader className="text-center pb-2">
                      <Avatar className="h-20 w-20 mx-auto mb-2 border-2 border-gray-100">
                        <AvatarImage src={candidate.avatarUrl || ''} />
                        <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <CardTitle>{candidate.name}</CardTitle>
                      <CardDescription>{candidate.headline}</CardDescription>
                      <div className="mt-4 flex justify-center">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/candidates/${candidate.id}`}>View Profile</Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                      {analysis ? (
                        <>
                          <div className="flex flex-col items-center">
                            <span className="text-xs uppercase font-semibold text-gray-500 mb-2">Match Score</span>
                            <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold text-xl ${getMatchScoreColor(analysis.matchScore)}`}>
                              {analysis.matchScore}
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-xs uppercase font-semibold text-gray-500 mb-2 block">AI Summary</span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-zinc-900/50 p-3 rounded-lg">
                              {analysis.summary}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs uppercase font-semibold text-green-600 mb-2 flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> Strengths</span>
                            <ul className="space-y-1.5">
                              {analysis.strengths.map((s, idx) => (
                                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                                  <span className="text-green-500 mr-2 mt-0.5">•</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="text-xs uppercase font-semibold text-orange-600 mb-2 flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Weaknesses</span>
                            <ul className="space-y-1.5">
                              {analysis.weaknesses.map((s, idx) => (
                                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                                  <span className="text-orange-500 mr-2 mt-0.5">•</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-gray-500 text-sm py-8">
                          No analysis available.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
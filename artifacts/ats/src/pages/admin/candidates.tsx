import React, { useState } from 'react';
import { useListCandidates, useSemanticSearchCandidates, useBackfillCandidateEmbeddings, type SemanticSearchCandidate } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link, useLocation } from 'wouter';
import { Search, MapPin, Mail, Briefcase, FileText, ArrowRight, Sparkles, X, Loader2, RefreshCw } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AdminCandidates() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const semanticSearch = useSemanticSearchCandidates();
  const backfillEmbeddings = useBackfillCandidateEmbeddings();

  // ── keyword search (existing) ─────────────────────────────────────
  const { data, isLoading } = useListCandidates(
    { q: debouncedSearch || undefined, limit: 100 },
    { query: { enabled: !debouncedSearch || debouncedSearch.length > 0 } }
  );
  const candidates = data?.candidates || [];

  // ── semantic search state ─────────────────────────────────────────
  const [semanticMode, setSemanticMode] = useState(false);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticResults, setSemanticResults] = useState<SemanticSearchCandidate[] | null>(null);

  const handleSemanticSearch = async () => {
    if (semanticQuery.trim().length < 3) {
      toast({ title: "Enter at least 3 characters", variant: "destructive" });
      return;
    }
    try {
      const result = await semanticSearch.mutateAsync({
        query: semanticQuery,
        threshold: 0.2,
        limit: 20,
      });
      setSemanticResults(result.candidates);
      if (result.candidates.length === 0) {
        toast({
          title: "No matches found",
          description: "Try a different job description, or backfill embeddings for existing resumes.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Semantic search failed",
        description: err?.message || "The model may still be loading — try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const handleBackfillEmbeddings = async () => {
    try {
      const result = await backfillEmbeddings.mutateAsync({ limit: 50 });
      toast({
        title: "Embedding backfill complete",
        description: `Updated ${result.updated} of ${result.processed} candidates.`,
      });
    } catch (err: any) {
      toast({
        title: "Backfill failed",
        description: err?.message || "Could not generate embeddings.",
        variant: "destructive",
      });
    }
  };

  const exitSemanticMode = () => {
    setSemanticMode(false);
    setSemanticQuery('');
    setSemanticResults(null);
  };

  // Which list to render
  const displayCandidates = semanticMode && semanticResults !== null ? semanticResults : candidates;
  const displayTotal = semanticMode && semanticResults !== null ? semanticResults.length : (data?.total || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Candidates</h1>
          <p className="text-gray-500 mt-1">Manage talent pool and profiles</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={semanticMode ? "default" : "outline"}
            onClick={() => { if (semanticMode) exitSemanticMode(); else setSemanticMode(true); }}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {semanticMode ? "Exit AI Search" : "AI Semantic Search"}
          </Button>
          <Button onClick={() => setLocation('/admin/candidates/compare')} variant="secondary">
            Compare
          </Button>
        </div>
      </div>

      {/* Semantic search panel */}
      {semanticMode && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Semantic Resume Search
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Paste a job description or skills list — we'll find the best-matching candidates by embedding similarity.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={exitSemanticMode}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="e.g. We need a senior full-stack engineer with 5+ years React, Node.js, PostgreSQL experience…"
              rows={4}
              value={semanticQuery}
              onChange={(e) => setSemanticQuery(e.target.value)}
              className="resize-none bg-white dark:bg-zinc-950"
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Results are ranked by cosine similarity to the query embedding (all-MiniLM-L6-v2).
              </p>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackfillEmbeddings}
                  disabled={backfillEmbeddings.isPending}
                  className="gap-2"
                >
                  {backfillEmbeddings.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Backfill Embeddings
                </Button>
                <Button onClick={handleSemanticSearch} disabled={semanticSearch.isPending} className="gap-2 min-w-[120px]">
                  {semanticSearch.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</> : <><Sparkles className="h-4 w-4" /> Search</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          {!semanticMode ? (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-gray-50 dark:bg-zinc-950 border-transparent focus-visible:bg-white"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Sparkles className="h-4 w-4" />
              {semanticResults !== null ? `${displayTotal} semantic match${displayTotal !== 1 ? 'es' : ''}` : 'Enter a query above to search'}
            </div>
          )}
          <div className="text-sm text-gray-500 font-medium ml-4">
            {!semanticMode && `${data?.total || 0} Candidates`}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Experience</th>
                <th className="px-6 py-4 font-medium">Top Skills</th>
                {semanticMode && semanticResults !== null && (
                  <th className="px-6 py-4 font-medium text-center">Match</th>
                )}
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {isLoading && !semanticMode ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading candidates...</td></tr>
              ) : semanticSearch.isPending ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-gray-500 text-sm">Generating embeddings and searching…</p>
                  </td>
                </tr>
              ) : semanticMode && semanticResults === null ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p>Enter a job description above and click <strong>Search</strong></p>
                  </td>
                </tr>
              ) : displayCandidates.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No candidates found.</td></tr>
              ) : (
                displayCandidates.map(candidate => {
                  const sim = (candidate as any).similarity as number | undefined;
                  return (
                    <tr
                      key={candidate.id}
                      className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                      onClick={() => setLocation(`/admin/candidates/${candidate.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-gray-100 dark:border-zinc-800">
                            <AvatarImage src={candidate.avatarUrl || ''} />
                            <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                              {candidate.name}
                              {candidate.resumeUrl && <FileText className="h-3.5 w-3.5 ml-2 text-primary" title="Resume uploaded" />}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 mt-1 gap-3">
                              <span className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {candidate.email}</span>
                              {candidate.location && <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {candidate.location}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">{candidate.headline || 'No headline'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {candidate.yearsOfExperience != null ? `${candidate.yearsOfExperience} yrs exp.` : 'Exp. unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                          {candidate.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded text-xs">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-50 dark:bg-zinc-900 text-gray-400 rounded text-xs">
                              +{candidate.skills.length - 3}
                            </span>
                          )}
                          {candidate.skills.length === 0 && <span className="text-gray-400 text-xs">No skills listed</span>}
                        </div>
                      </td>
                      {semanticMode && semanticResults !== null && (
                        <td className="px-6 py-4 text-center">
                          {sim !== undefined ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              sim >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              sim >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              sim >= 30 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300'
                            }`}>
                              {sim}%
                            </span>
                          ) : '—'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                          <Link href={`/admin/candidates/${candidate.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

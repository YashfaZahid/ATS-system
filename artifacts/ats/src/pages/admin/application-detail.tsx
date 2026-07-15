import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetApplication, useGetApplicationHistory, useGetApplicationAnalysis, useListApplicationNotes, useAddApplicationNote, useUpdateApplicationStage } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getGetApplicationQueryKey, getGetApplicationHistoryQueryKey, getListApplicationNotesQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Zap, CheckCircle2, Clock, MessageSquare, AlertCircle, FileText, ChevronRight, User } from 'lucide-react';
import { STAGE_COLORS, STAGE_LABELS, formatDate, formatRelative, getMatchScoreColor } from '@/lib/utils/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const NEXT_STAGES: Record<string, string[]> = {
  applied: ['screening', 'rejected'],
  screening: ['shortlisted', 'rejected'],
  shortlisted: ['technical_interview', 'rejected'],
  technical_interview: ['hr_interview', 'rejected'],
  hr_interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: []
};

export default function AdminApplicationDetail() {
  const [, params] = useRoute('/admin/applications/:id');
  const id = params?.id || '';
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: app, isLoading: appLoading } = useGetApplication(id, { query: { enabled: !!id } });
  const { data: analysis, isLoading: analysisLoading } = useGetApplicationAnalysis(id, { query: { enabled: !!id } });
  const { data: history } = useGetApplicationHistory(id, { query: { enabled: !!id } });
  const { data: notesData } = useListApplicationNotes(id, { query: { enabled: !!id } });
  
  const updateStage = useUpdateApplicationStage();
  const addNote = useAddApplicationNote();

  const [newNote, setNewNote] = useState('');
  const [stageComment, setStageComment] = useState('');
  const [stageOpen, setStageOpen] = useState(false);
  const [selectedNextStage, setSelectedNextStage] = useState('');

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await addNote.mutateAsync({ id, data: { content: newNote } });
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: getListApplicationNotesQueryKey(id) });
      toast({ title: "Note added" });
    } catch (e: any) {
      toast({ title: "Failed to add note", description: e.message, variant: "destructive" });
    }
  };

  const handleUpdateStage = async () => {
    try {
      await updateStage.mutateAsync({
        id,
        data: { stage: selectedNextStage as any, comment: stageComment || undefined }
      });
      setStageOpen(false);
      setStageComment('');
      queryClient.invalidateQueries({ queryKey: getGetApplicationQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetApplicationHistoryQueryKey(id) });
      toast({ title: "Stage updated" });
    } catch (e: any) {
      toast({ title: "Failed to update stage", description: e.message, variant: "destructive" });
    }
  };

  if (appLoading) return <div className="p-8 text-center">Loading application...</div>;
  if (!app) return <div className="p-8 text-center text-red-500">Application not found.</div>;

  const notes = notesData || [];
  const nextStages = NEXT_STAGES[app.stage] || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/admin/applications" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to applications
      </Link>

      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-6 z-10">
          <Avatar className="h-20 w-20 border-4 border-gray-50 dark:border-zinc-950 shadow-sm shrink-0">
            <AvatarImage src={app.candidate?.avatarUrl || ''} />
            <AvatarFallback className="text-2xl">{app.candidate?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {app.candidate?.name}
            </h1>
            <div className="flex items-center text-gray-500 gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-sm">
                for {app.job?.title}
              </span>
              <span>•</span>
              <span className="text-sm">Applied {formatRelative(app.createdAt)}</span>
            </div>
            <div className="pt-2 flex gap-3">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/candidates/${app.candidateId}`}>
                  <User className="mr-2 h-4 w-4" /> View Full Profile
                </Link>
              </Button>
              {app.candidate?.resumeUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={app.candidate.resumeUrl} target="_blank" rel="noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> Resume
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 z-10 w-full lg:w-auto">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Stage</span>
            <Badge className={`px-4 py-1.5 text-base font-bold rounded-full border-0 ${STAGE_COLORS[app.stage]}`}>
              {STAGE_LABELS[app.stage]}
            </Badge>
          </div>

          {nextStages.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end w-full">
              {nextStages.map(s => (
                <Dialog key={s} open={stageOpen && selectedNextStage === s} onOpenChange={(val) => { setStageOpen(val); if(val) setSelectedNextStage(s); }}>
                  <DialogTrigger asChild>
                    <Button 
                      variant={s === 'rejected' ? 'outline' : 'default'} 
                      className={s === 'rejected' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'shadow-sm'}
                    >
                      {s === 'rejected' ? 'Reject' : `Advance to ${STAGE_LABELS[s]}`}
                      {s !== 'rejected' && <ChevronRight className="ml-1 h-4 w-4" />}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Stage</DialogTitle>
                      <DialogDescription>
                        Moving candidate to <strong>{STAGE_LABELS[s]}</strong>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Add a comment (Optional)</label>
                        <Textarea 
                          value={stageComment} 
                          onChange={(e) => setStageComment(e.target.value)} 
                          placeholder="Reason for advancing or rejecting..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setStageOpen(false)}>Cancel</Button>
                      <Button onClick={handleUpdateStage} disabled={updateStage.isPending} className={s === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}>
                        {updateStage.isPending ? 'Saving...' : 'Confirm'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* AI Analysis */}
          {!analysisLoading && analysis && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
              <CardHeader className="pb-3 border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg"><Zap className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg">AI Hiring Recommendation</CardTitle>
                    <CardDescription>Based on parsed resume vs job requirements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                  <div className={`flex flex-col items-center justify-center w-28 h-28 rounded-full border-8 ${getMatchScoreColor(analysis.matchScore)} bg-white dark:bg-zinc-900 shadow-md shrink-0`}>
                    <span className="text-3xl font-black">{analysis.matchScore}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">Match</span>
                  </div>
                  <div className="space-y-3">
                    <p className="text-gray-900 dark:text-white font-medium text-lg leading-snug">
                      {analysis.hiringRecommendation}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                      {analysis.recruiterSummary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/10">
                  <div>
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center text-sm"><CheckCircle2 className="h-4 w-4 mr-2" /> Top Strengths</h4>
                    <ul className="space-y-2">
                      {analysis.strengths.slice(0, 4).map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="text-green-500 mr-2 mt-0.5">•</span> <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-3 flex items-center text-sm"><AlertCircle className="h-4 w-4 mr-2" /> Key Weaknesses / Gaps</h4>
                    <ul className="space-y-2">
                      {analysis.weaknesses.slice(0, 4).map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <span className="text-orange-500 mr-2 mt-0.5">•</span> <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {app.coverLetter && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300 italic">
                  "{app.coverLetter}"
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recruiter Notes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recruiter Notes</CardTitle>
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {notes.map(note => (
                  <div key={note.id} className="p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{note.authorName}</span>
                      <span className="text-xs text-gray-500">{formatRelative(note.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{note.content}</p>
                  </div>
                ))}
                {notes.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No notes yet.</div>}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 pt-0">
              <Textarea 
                placeholder="Add an internal note about this candidate..." 
                value={newNote} 
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none h-10 min-h-[40px] py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <Button onClick={handleAddNote} disabled={addNote.isPending || !newNote.trim()}>Add</Button>
            </CardFooter>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage History</CardTitle>
            </CardHeader>
            <CardContent>
              {history && history.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-gray-100 dark:border-zinc-800 space-y-6 ml-2">
                  {history.map((item, idx) => (
                    <div key={item.id} className="relative">
                      <div className="absolute -left-[31px] bg-primary w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900"></div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Moved to <span className="text-primary">{STAGE_LABELS[item.newStage]}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.changedBy} • {formatRelative(item.changedAt)}</p>
                      {item.comment && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-zinc-900 p-2 rounded-md border border-gray-100 dark:border-zinc-800 italic">
                          "{item.comment}"
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="relative">
                    <div className="absolute -left-[31px] bg-gray-300 dark:bg-zinc-700 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900"></div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Applied</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(app.createdAt)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No history available.</div>
              )}
            </CardContent>
          </Card>
          
          <Button className="w-full" variant="outline" asChild>
            <Link href="/admin/interviews/new">Schedule Interview</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
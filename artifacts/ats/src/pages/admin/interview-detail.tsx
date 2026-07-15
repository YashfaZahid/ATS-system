import React, { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useGetInterview, useUpdateInterview, useSubmitInterviewFeedback } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, MapPin, Video, Phone, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQueryClient } from '@tanstack/react-query';
import { getGetInterviewQueryKey } from '@workspace/api-client-react';

export default function AdminInterviewDetail() {
  const [, params] = useRoute('/admin/interviews/:id');
  const id = params?.id || '';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: interview, isLoading } = useGetInterview(id, { query: { enabled: !!id } });
  const updateInterview = useUpdateInterview();
  const submitFeedback = useSubmitInterviewFeedback();

  const [feedback, setFeedback] = useState({
    technicalRating: 3,
    communicationRating: 3,
    problemSolvingRating: 3,
    cultureFitRating: 3,
    comments: '',
    recommendation: 'hire'
  });

  const [status, setStatus] = useState<string>('');

  React.useEffect(() => {
    if (interview) {
      setStatus(interview.status);
    }
  }, [interview]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await updateInterview.mutateAsync({
        id,
        data: { status: newStatus as any }
      });
      setStatus(newStatus);
      queryClient.invalidateQueries({ queryKey: getGetInterviewQueryKey(id) });
      toast({ title: `Status updated to ${newStatus}` });
    } catch (e: any) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.comments) {
      toast({ title: "Validation Error", description: "Comments are required", variant: "destructive" });
      return;
    }
    
    try {
      await submitFeedback.mutateAsync({
        id,
        data: feedback as any
      });
      queryClient.invalidateQueries({ queryKey: getGetInterviewQueryKey(id) });
      toast({ title: "Feedback submitted successfully" });
      
      // Auto-complete interview if feedback submitted and it wasn't already completed
      if (interview?.status !== 'completed') {
        handleStatusUpdate('completed');
      }
    } catch (e: any) {
      toast({ title: "Failed to submit feedback", description: e.message, variant: "destructive" });
    }
  };

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in_person': return <MapPin className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rescheduled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const RatingStars = ({ value, onChange, label }: { value: number, onChange?: (val: number) => void, label: string }) => {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={!onChange}
              onClick={() => onChange && onChange(star)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                star <= value 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {star}
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-8 text-center">Loading interview...</div>;
  if (!interview) return <div className="p-8 text-center text-red-500">Interview not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/admin/interviews" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to interviews
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-gray-100 dark:border-zinc-800">
                <Avatar className="h-24 w-24 border-2 border-gray-100 dark:border-zinc-800">
                  <AvatarImage src={interview.candidate?.avatarUrl || ''} />
                  <AvatarFallback className="text-xl">{interview.candidate?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{interview.candidate?.name}</h2>
                  <Link href={`/admin/applications/${interview.applicationId}`} className="text-sm text-primary hover:underline">
                    {interview.job?.title}
                  </Link>
                </div>
              </div>
              
              <div className="space-y-4 pt-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <Select value={status} onValueChange={handleStatusUpdate}>
                    <SelectTrigger className={`w-[130px] h-8 text-xs font-semibold ${getStatusColor(status)} border-0`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center"><Calendar className="h-4 w-4 mr-2" /> Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(interview.scheduledAt)}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center"><Clock className="h-4 w-4 mr-2" /> Time</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDateTime(interview.scheduledAt).split(' ').slice(3).join(' ')} ({interview.durationMinutes}m)
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center capitalize"><div className="mr-2">{getMeetingIcon(interview.meetingType)}</div> {interview.meetingType.replace('_', ' ')}</span>
                  {interview.meetingLink ? (
                    <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline truncate max-w-[150px]">Link</a>
                  ) : (
                    <span className="text-gray-400">No link</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center"><User className="h-4 w-4 mr-2" /> Interviewer</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]">{interview.interviewerName}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {interview.feedback ? (
            <Card className="border-green-100 dark:border-green-900/30">
              <CardHeader className="bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                  <CardTitle className="text-green-800 dark:text-green-400">Interview Feedback Submitted</CardTitle>
                </div>
                <CardDescription>By {interview.feedback.submittedBy} on {formatDate(interview.feedback.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-lg border border-gray-100 dark:border-zinc-800">
                  <span className="font-semibold text-gray-900 dark:text-white">Overall Recommendation</span>
                  <Badge className={`px-4 py-1 text-sm ${
                    interview.feedback.recommendation.includes('strong_hire') ? 'bg-green-600' :
                    interview.feedback.recommendation === 'hire' ? 'bg-green-500' :
                    interview.feedback.recommendation === 'no_hire' ? 'bg-orange-500' : 'bg-red-600'
                  }`}>
                    {interview.feedback.recommendation.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RatingStars label="Technical Skills" value={interview.feedback.technicalRating} />
                  <RatingStars label="Communication" value={interview.feedback.communicationRating} />
                  <RatingStars label="Problem Solving" value={interview.feedback.problemSolvingRating} />
                  <RatingStars label="Culture Fit" value={interview.feedback.cultureFitRating} />
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Detailed Comments</h4>
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm leading-relaxed">
                    {interview.feedback.comments}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Submit Feedback</CardTitle>
                <CardDescription>Evaluate the candidate's performance in the interview.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFeedbackSubmit} className="space-y-8">
                  <div className="space-y-6">
                    <RatingStars 
                      label="Technical Skills" 
                      value={feedback.technicalRating} 
                      onChange={(val) => setFeedback(f => ({ ...f, technicalRating: val }))} 
                    />
                    <RatingStars 
                      label="Communication" 
                      value={feedback.communicationRating} 
                      onChange={(val) => setFeedback(f => ({ ...f, communicationRating: val }))} 
                    />
                    <RatingStars 
                      label="Problem Solving" 
                      value={feedback.problemSolvingRating} 
                      onChange={(val) => setFeedback(f => ({ ...f, problemSolvingRating: val }))} 
                    />
                    <RatingStars 
                      label="Culture Fit" 
                      value={feedback.cultureFitRating} 
                      onChange={(val) => setFeedback(f => ({ ...f, cultureFitRating: val }))} 
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Recommendation</label>
                    <Select 
                      value={feedback.recommendation} 
                      onValueChange={(val) => setFeedback(f => ({ ...f, recommendation: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strong_hire">Strong Hire</SelectItem>
                        <SelectItem value="hire">Hire</SelectItem>
                        <SelectItem value="no_hire">No Hire</SelectItem>
                        <SelectItem value="strong_no_hire">Strong No Hire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Detailed Comments *</label>
                    <Textarea 
                      value={feedback.comments}
                      onChange={(e) => setFeedback(f => ({ ...f, comments: e.target.value }))}
                      rows={6}
                      placeholder="Provide specific examples and justification for your ratings..."
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitFeedback.isPending} className="px-8">
                      {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
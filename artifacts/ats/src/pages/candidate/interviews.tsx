import React from 'react';
import { useListInterviews } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, Phone, MapPin, User, FileText } from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils/format';
import { Link } from 'wouter';

export default function Interviews() {
  const { data: upcoming, isLoading: upcomingLoading } = useListInterviews({ upcoming: true });
  const { data: past, isLoading: pastLoading } = useListInterviews({ upcoming: false });

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

  const InterviewCard = ({ interview }: { interview: any }) => (
    <Card className="border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover-elevate transition-all">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center justify-center w-24 h-24 bg-primary/10 text-primary rounded-xl shrink-0">
            <span className="text-sm font-semibold uppercase tracking-wider">{formatDate(interview.scheduledAt).split(' ')[0]}</span>
            <span className="text-3xl font-black">{formatDate(interview.scheduledAt).split(' ')[1].replace(',', '')}</span>
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{interview.job?.title}</h3>
                <Link href={`/applications/${interview.applicationId}`} className="text-sm text-primary hover:underline flex items-center mt-1">
                  <FileText className="h-3 w-3 mr-1" /> View Application
                </Link>
              </div>
              <Badge className={`px-2.5 py-0.5 border-0 ${getStatusColor(interview.status)} capitalize`}>
                {interview.status}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-400" />
                {formatDateTime(interview.scheduledAt).split(' ').slice(3).join(' ')} ({interview.durationMinutes} min)
              </div>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                {interview.interviewerName}
              </div>
              <div className="flex items-center capitalize">
                <div className="mr-2 text-gray-400">{getMeetingIcon(interview.meetingType)}</div>
                {interview.meetingType.replace('_', ' ')}
              </div>
            </div>
            
            {interview.meetingLink && interview.status === 'scheduled' && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <a 
                  href={interview.meetingLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto"
                >
                  <Video className="mr-2 h-4 w-4" /> Join Meeting Link
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interviews</h1>
        <p className="text-gray-500 text-lg">Manage your upcoming and past interview schedules.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-primary" /> Upcoming Interviews
        </h2>
        
        {upcomingLoading ? (
          <div className="h-40 bg-white dark:bg-zinc-900 rounded-xl animate-pulse"></div>
        ) : upcoming && upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map(interview => <InterviewCard key={interview.id} interview={interview} />)}
          </div>
        ) : (
          <Card className="bg-gray-50 dark:bg-zinc-900/50 border-dashed border-gray-300 dark:border-zinc-800 shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No upcoming interviews scheduled</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6 pt-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center opacity-80">
          <Clock className="mr-2 h-5 w-5" /> Past Interviews
        </h2>
        
        {pastLoading ? (
          <div className="h-40 bg-white dark:bg-zinc-900 rounded-xl animate-pulse"></div>
        ) : past && past.length > 0 ? (
          <div className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
            {past.map(interview => <InterviewCard key={interview.id} interview={interview} />)}
          </div>
        ) : (
          <p className="text-gray-500 text-sm pl-7">No past interviews.</p>
        )}
      </div>
    </div>
  );
}
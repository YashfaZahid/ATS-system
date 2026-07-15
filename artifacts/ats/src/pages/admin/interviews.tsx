import React, { useState } from 'react';
import { useListInterviews } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useLocation } from 'wouter';
import { Calendar, Clock, Video, Phone, MapPin, User, Plus, Search, ChevronRight } from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/utils/format';
import { Input } from '@/components/ui/input';

export default function AdminInterviews() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState('upcoming');
  const [search, setSearch] = useState('');

  const { data: upcomingData, isLoading: upcomingLoading } = useListInterviews({ upcoming: true });
  const { data: pastData, isLoading: pastLoading } = useListInterviews({ upcoming: false });

  const upcoming = upcomingData || [];
  const past = pastData || [];

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

  const filterInterviews = (list: any[]) => {
    if (!search) return list;
    const lowerSearch = search.toLowerCase();
    return list.filter(i => 
      i.candidate?.name.toLowerCase().includes(lowerSearch) || 
      i.job?.title.toLowerCase().includes(lowerSearch) ||
      i.interviewerName.toLowerCase().includes(lowerSearch)
    );
  };

  const InterviewList = ({ interviews, loading, emptyMessage }: { interviews: any[], loading: boolean, emptyMessage: string }) => {
    if (loading) return <div className="p-8 text-center text-gray-500">Loading interviews...</div>;
    const filtered = filterInterviews(interviews);
    
    if (filtered.length === 0) return <div className="p-12 text-center text-gray-500 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-gray-300 dark:border-zinc-800">{emptyMessage}</div>;

    return (
      <div className="grid gap-4">
        {filtered.map((interview) => (
          <Card key={interview.id} className="hover-elevate cursor-pointer transition-all border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 group" onClick={() => setLocation(`/admin/interviews/${interview.id}`)}>
            <CardContent className="p-5 flex flex-col md:flex-row gap-6 items-center">
              <div className="flex flex-col items-center justify-center w-20 h-20 bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-lg shrink-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{formatDate(interview.scheduledAt).split(' ')[0]}</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatDate(interview.scheduledAt).split(' ')[1].replace(',', '')}</span>
              </div>
              
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <div className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                    {interview.candidate?.name}
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-0.5">
                    {interview.job?.title}
                  </div>
                </div>
                
                <div className="md:col-span-5 grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center truncate">
                    <Clock className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                    <span className="truncate">{formatDateTime(interview.scheduledAt).split(' ').slice(3).join(' ')}</span>
                  </div>
                  <div className="flex items-center truncate">
                    <User className="h-4 w-4 mr-2 text-gray-400 shrink-0" />
                    <span className="truncate">{interview.interviewerName}</span>
                  </div>
                  <div className="flex items-center capitalize truncate">
                    <div className="mr-2 text-gray-400 shrink-0">{getMeetingIcon(interview.meetingType)}</div>
                    <span className="truncate">{interview.meetingType.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <div className="md:col-span-3 flex justify-between md:justify-end items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-zinc-800 w-full">
                  <Badge className={`px-2.5 py-0.5 border-0 capitalize ${getStatusColor(interview.status)}`}>
                    {interview.status}
                  </Badge>
                  <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interviews</h1>
          <p className="text-gray-500 mt-1">Schedule and manage candidate interviews</p>
        </div>
        <Button asChild>
          <Link href="/admin/interviews/new">
            <Plus className="mr-2 h-4 w-4" /> Schedule Interview
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-end mb-2">
        <Tabs value={tab} onValueChange={setTab} className="w-full md:w-auto">
          <TabsList className="grid w-full md:w-[300px] grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search interviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="mt-6">
        {tab === 'upcoming' ? (
          <InterviewList 
            interviews={upcoming} 
            loading={upcomingLoading} 
            emptyMessage={search ? "No upcoming interviews match your search." : "No upcoming interviews scheduled."} 
          />
        ) : (
          <InterviewList 
            interviews={past} 
            loading={pastLoading} 
            emptyMessage={search ? "No past interviews match your search." : "No past interviews found."} 
          />
        )}
      </div>
    </div>
  );
}
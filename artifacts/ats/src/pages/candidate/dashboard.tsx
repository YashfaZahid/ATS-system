import React from 'react';
import { useAuth } from '@/lib/auth';
import { useListApplications, useListInterviews, useListJobs, useListNotifications } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Briefcase, Calendar, Clock, ArrowRight, CheckCircle2, FileText, Bell } from 'lucide-react';
import { STAGE_COLORS, STAGE_LABELS, formatDate, formatRelative } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

export default function CandidateDashboard() {
  const { profile } = useAuth();
  
  const { data: applicationsData, isLoading: appsLoading } = useListApplications({ limit: 5 });
  const { data: interviewsData, isLoading: interviewsLoading } = useListInterviews({ upcoming: true });
  const { data: jobsData, isLoading: jobsLoading } = useListJobs({ limit: 3 });
  const { data: notificationsData } = useListNotifications({ unreadOnly: true });

  const applications = applicationsData?.applications || [];
  const interviews = interviewsData || [];
  const jobs = jobsData?.jobs || [];
  const notifications = notificationsData || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {profile?.name?.split(' ')[0]}</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your applications.</p>
        </div>
        <Button asChild>
          <Link href="/jobs">
            <Briefcase className="mr-2 h-4 w-4" /> Browse Open Roles
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Applications</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{applicationsData?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interviews.length}</div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Notifications</CardTitle>
            <Bell className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Track your job application status</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/applications">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {appsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse"></div>)}
                </div>
              ) : applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-primary/30 transition-colors bg-white dark:bg-zinc-900/50">
                      <div className="flex flex-col">
                        <Link href={`/applications/${app.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors">
                          {app.job?.title}
                        </Link>
                        <span className="text-sm text-gray-500">{app.job?.company || 'Company'} • Applied {formatRelative(app.createdAt)}</span>
                      </div>
                      <Badge variant="outline" className={`px-2.5 py-0.5 rounded-full text-xs font-medium border-0 ${STAGE_COLORS[app.stage]}`}>
                        {STAGE_LABELS[app.stage]}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 mb-4">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No applications yet</h3>
                  <p className="text-gray-500 mt-1 mb-4">Find your next role and apply today.</p>
                  <Button asChild><Link href="/jobs">Browse Jobs</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Jobs</CardTitle>
              <CardDescription>Based on your profile</CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse"></div>)}
                </div>
              ) : jobs.length > 0 ? (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-start justify-between p-4 border border-gray-100 dark:border-zinc-800 rounded-lg hover:border-primary/30 transition-colors bg-white dark:bg-zinc-900/50">
                      <div>
                        <Link href={`/jobs/${job.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors block">
                          {job.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span>{job.department}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/jobs/${job.id}`}><ArrowRight className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">No open jobs right now.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Upcoming Interviews</CardTitle>
                <CardDescription>Your scheduled meetings</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/interviews">View Calendar</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {interviewsLoading ? (
                <div className="space-y-4">
                  {[1].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-zinc-800 rounded-md animate-pulse"></div>)}
                </div>
              ) : interviews.length > 0 ? (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div key={interview.id} className="flex gap-4 p-4 border border-primary/20 bg-primary/5 rounded-lg">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-white dark:bg-zinc-900 rounded-md shadow-sm border border-gray-100 dark:border-zinc-800 shrink-0">
                        <span className="text-xs font-medium text-primary uppercase">{formatDate(interview.scheduledAt).split(' ')[0]}</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">{formatDate(interview.scheduledAt).split(' ')[1].replace(',', '')}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{interview.job?.title || 'Interview'}</h4>
                        <div className="flex items-center text-sm text-gray-500 mt-1 gap-4">
                          <span className="flex items-center"><Clock className="h-3 w-3 mr-1" /> {formatDate(interview.scheduledAt).split(' ')[2]}</span>
                          <span className="flex items-center capitalize"><Calendar className="h-3 w-3 mr-1" /> {interview.meetingType.replace('_', ' ')}</span>
                        </div>
                        {interview.meetingLink && (
                          <div className="mt-2">
                            <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                              Join Meeting
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">You're all caught up!</h3>
                  <p className="text-sm text-gray-500 mt-1">No upcoming interviews scheduled.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((note) => (
                    <div key={note.id} className="flex gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 last:border-0 last:pb-0">
                      <div className="mt-0.5"><Bell className="h-4 w-4 text-primary" /></div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">{note.title}</h5>
                        <p className="text-xs text-gray-500 mt-0.5">{note.message}</p>
                        <span className="text-[10px] text-gray-400 block mt-1">{formatRelative(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">No new notifications.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
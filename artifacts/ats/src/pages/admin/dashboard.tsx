import React from 'react';
import { useGetAdminStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, Users, FileText, Calendar, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats();

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading dashboard...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Failed to load statistics.</div>;

  const chartData = stats.applicationsByStage.map(s => ({
    name: s.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: s.count,
    stage: s.stage
  }));

  const stageColors: Record<string, string> = {
    applied: '#3b82f6',
    screening: '#eab308',
    shortlisted: '#a855f7',
    technical_interview: '#f97316',
    hr_interview: '#6366f1',
    offer: '#14b8a6',
    hired: '#22c55e',
    rejected: '#ef4444'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Overview</h1>
        <p className="text-gray-500 text-lg">Here's what's happening in your hiring pipeline today.</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-elevate transition-all border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.openJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">Out of {stats.totalJobs} total jobs</p>
          </CardContent>
        </Card>
        
        <Card className="hover-elevate transition-all border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Candidates</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground mt-1">In your talent pool</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Applications</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeApplications}</div>
            <p className="text-xs text-green-500 mt-1 flex items-center font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> +{stats.recentApplicationsThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Interviews</CardTitle>
            <Calendar className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.upcomingInterviews}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled next 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-sm border border-gray-200 dark:border-zinc-800">
          <CardHeader>
            <CardTitle>Pipeline Snapshot</CardTitle>
            <CardDescription>Current distribution of active applications by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} angle={-25} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#888' }} />
                  <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={stageColors[entry.stage] || '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border border-gray-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Hiring Outcomes</CardTitle>
              <CardDescription>Historical success metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Hires</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.hires}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Offers Extended</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.offers}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                    <XCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rejections</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.rejections}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-lg text-primary mb-2">AI Match Accuracy</h3>
              <div className="text-4xl font-black text-gray-900 dark:text-white mb-2">{stats.averageMatchScore ? Math.round(stats.averageMatchScore) : '--'}%</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average alignment score across all active candidates</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
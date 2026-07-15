import React, { useState } from 'react';
import { useListApplications, useUpdateApplicationStage, useListApplicationNotes, useAddApplicationNote, useGetApplicationAnalysis } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, useLocation } from 'wouter';
import { Search, Building, Clock, ChevronRight, Zap, CheckCircle2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { STAGE_COLORS, STAGE_LABELS, formatDate, getMatchScoreColor } from '@/lib/utils/format';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminApplications() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [stage, setStage] = useState<string>('all');
  const [, setLocation] = useLocation();
  
  // Note: ListApplicationsParams doesn't natively have a generic search 'q'. 
  // It has jobId, candidateId, stage. If we wanted search by name, we'd need it in the API.
  // We'll use stage filtering here.
  const { data, isLoading } = useListApplications({
    stage: stage !== 'all' ? stage : undefined,
    limit: 100
  });
  
  const applications = data?.applications || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-gray-500 mt-1">Review and manage candidates through the hiring pipeline</p>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex gap-4 w-full sm:w-auto">
            {/* The API doesn't support 'q' for applications, so we'll just show the stage filter */}
            <Select value={stage} onValueChange={setStage}>
              <SelectTrigger className="w-[200px] bg-gray-50 dark:bg-zinc-950 border-transparent">
                <SelectValue placeholder="Filter by Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {data?.total || 0} Applications
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Job Role</th>
                <th className="px-6 py-4 font-medium">Stage</th>
                <th className="px-6 py-4 font-medium">Applied</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading applications...</td></tr>
              ) : applications.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No applications found.</td></tr>
              ) : (
                applications.map(app => (
                  <tr key={app.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer" onClick={() => setLocation(`/admin/applications/${app.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-gray-100 dark:border-zinc-800">
                          <AvatarImage src={app.candidate?.avatarUrl || ''} />
                          <AvatarFallback>{app.candidate?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-gray-900 dark:text-white">{app.candidate?.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{app.job?.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{app.job?.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border-0 ${STAGE_COLORS[app.stage]}`}>
                        {STAGE_LABELS[app.stage]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <Link href={`/admin/applications/${app.id}`}>
                          Review <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
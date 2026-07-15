import React, { useState } from 'react';
import { useListJobs, useDeleteJob, useSetJobStatus } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { Plus, Search, MoreHorizontal, Briefcase, MapPin, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';
import { getListJobsQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminJobs() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const { data, isLoading } = useListJobs({ q: debouncedSearch || undefined, limit: 100 });
  const jobs = data?.jobs || [];
  
  const deleteJob = useDeleteJob();
  const setJobStatus = useSetJobStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, currentStatus: string) => {
    try {
      await setJobStatus.mutateAsync({
        id,
        data: { status: currentStatus === 'open' ? 'closed' : 'open' }
      });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      toast({ title: `Job ${currentStatus === 'open' ? 'closed' : 'opened'} successfully` });
    } catch (e: any) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteJob.mutateAsync({ id: deleteId });
      queryClient.invalidateQueries({ queryKey: getListJobsQueryKey() });
      toast({ title: "Job deleted successfully" });
    } catch (e: any) {
      toast({ title: "Failed to delete job", description: e.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Jobs</h1>
          <p className="text-gray-500 mt-1">Manage job postings and tracking</p>
        </div>
        <Button asChild>
          <Link href="/admin/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> Create Job
          </Link>
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-3 font-medium">Job Title</th>
                <th className="px-6 py-3 font-medium">Department</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium text-right">Applications</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading jobs...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No jobs found.</td></tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{job.title}</div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <MapPin className="h-3 w-3 mr-1" /> {job.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-700 dark:text-gray-300">
                        <Briefcase className="h-3 w-3 mr-1.5 text-gray-400" /> {job.department}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`border-0 ${job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {job.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-600 dark:text-gray-400">
                      {job.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {job.applicationsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/jobs/${job.id}/edit`} className="cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(job.id, job.status)} className="cursor-pointer">
                            {job.status === 'open' ? <><PowerOff className="mr-2 h-4 w-4 text-orange-500" /> Close Job</> : <><Power className="mr-2 h-4 w-4 text-green-500" /> Open Job</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteId(job.id)} className="text-red-600 cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this job posting. All associated applications will remain but will show an unknown job.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
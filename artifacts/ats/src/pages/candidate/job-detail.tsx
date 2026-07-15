import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetJob, useCreateApplication, useGetMe } from '@workspace/api-client-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Briefcase, Clock, Building, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getListApplicationsQueryKey } from '@workspace/api-client-react';

export default function JobDetail() {
  const [, params] = useRoute('/jobs/:id');
  const id = params?.id || '';
  
  const { data: job, isLoading } = useGetJob(id, { query: { enabled: !!id } });
  const { data: profile } = useGetMe();
  const createApplication = useCreateApplication();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [coverLetter, setCoverLetter] = useState('');
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    try {
      await createApplication.mutateAsync({
        data: {
          jobId: id,
          coverLetter: coverLetter || undefined
        }
      });
      toast({
        title: "Application submitted",
        description: "We've successfully received your application.",
      });
      setApplied(true);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
    } catch (error: any) {
      toast({
        title: "Failed to apply",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center text-red-500">Job not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Link href="/jobs" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs
      </Link>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-gray-100 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Briefcase className="w-64 h-64" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">{job.title}</h1>
            
            <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600 dark:text-gray-300">
              <span className="flex items-center px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full"><Building className="mr-2 h-4 w-4" /> {job.department}</span>
              <span className="flex items-center px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full"><MapPin className="mr-2 h-4 w-4" /> {job.location}</span>
              <span className="flex items-center px-3 py-1 bg-gray-100 dark:bg-zinc-800 rounded-full capitalize"><Clock className="mr-2 h-4 w-4" /> {job.type.replace('_', ' ')}</span>
            </div>
          </div>
          
          <div className="shrink-0 flex flex-col items-center sm:items-end w-full sm:w-auto">
            {applied ? (
              <div className="flex items-center text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg font-medium">
                <CheckCircle2 className="mr-2 h-5 w-5" /> Applied
              </div>
            ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full sm:w-auto font-bold text-md px-8 shadow-md">Apply Now</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Apply for {job.title}</DialogTitle>
                    <DialogDescription>
                      Review your details and submit your application.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="bg-gray-50 dark:bg-zinc-900 p-4 rounded-lg space-y-2 text-sm border border-gray-100 dark:border-zinc-800">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Applicant:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{profile?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{profile?.email}</span>
                      </div>
                      {!profile?.resumeUrl && (
                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                          <strong>Note:</strong> You don't have a resume uploaded. Please <Link href="/profile" className="underline font-bold">go to your profile</Link> to add one before applying.
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
                      <Textarea 
                        id="coverLetter" 
                        placeholder="Tell us why you're a great fit for this role..." 
                        rows={6}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleApply} disabled={createApplication.isPending || !profile?.resumeUrl}>
                      {createApplication.isPending ? "Submitting..." : "Submit Application"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
              <CardTitle className="text-xl">About the Role</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">
                {job.description}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
              <CardTitle className="text-xl">Requirements</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">
                {job.requirements}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
              <CardTitle className="text-xl">Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-line text-gray-700 dark:text-gray-300 leading-relaxed">
                {job.responsibilities}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border border-primary/20 bg-primary/5 shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Key Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="px-3 py-1 bg-white dark:bg-zinc-900 border border-primary/20">
                    {skill}
                  </Badge>
                ))}
                {job.skills.length === 0 && <span className="text-sm text-gray-500">Not specified</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="text-gray-500 mb-1">Posted On</div>
                <div className="font-medium text-gray-900 dark:text-white">{(new Date(job.createdAt)).toLocaleDateString()}</div>
              </div>
              {job.salaryMin && job.salaryMax && (
                <div>
                  <div className="text-gray-500 mb-1">Salary Range</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                  </div>
                </div>
              )}
              <div>
                <div className="text-gray-500 mb-1">Job ID</div>
                <div className="font-mono text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">
                  {job.id.substring(0, 8)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
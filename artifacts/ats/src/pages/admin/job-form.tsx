import React, { useState, useEffect } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useCreateJob, useUpdateJob, useGetJob, JobInput, JobUpdate } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function JobForm() {
  const [match, params] = useRoute('/admin/jobs/:id/edit');
  const isEdit = match;
  const id = params?.id || '';
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: job, isLoading } = useGetJob(id, { query: { enabled: isEdit && !!id } });
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();

  const [formData, setFormData] = useState<Partial<JobInput>>({
    title: '',
    department: '',
    location: '',
    type: 'full_time',
    description: '',
    requirements: '',
    responsibilities: '',
    salaryMin: null,
    salaryMax: null,
    skills: []
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (isEdit && job) {
      setFormData({
        title: job.title,
        department: job.department,
        location: job.location,
        type: job.type as any,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        skills: job.skills || []
      });
    }
  }, [isEdit, job]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value ? Number(value) : null }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !(formData.skills || []).includes(skillInput.trim())) {
      setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: (prev.skills || []).filter(s => s !== skill) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateJob.mutateAsync({ id, data: formData as JobUpdate });
        toast({ title: 'Job updated successfully' });
      } else {
        await createJob.mutateAsync({ data: formData as JobInput });
        toast({ title: 'Job created successfully' });
      }
      setLocation('/admin/jobs');
    } catch (error: any) {
      toast({ title: 'Failed to save job', description: error.message, variant: 'destructive' });
    }
  };

  if (isEdit && isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/jobs"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Job' : 'Create Job Posting'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Input id="department" name="department" value={formData.department} onChange={handleChange} required placeholder="e.g. Engineering" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleChange} required placeholder="e.g. Remote, San Francisco" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Employment Type *</Label>
                <Select value={formData.type} onValueChange={(val) => handleSelectChange('type', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Minimum Salary (Optional)</Label>
                <Input id="salaryMin" name="salaryMin" type="number" value={formData.salaryMin || ''} onChange={handleNumberChange} placeholder="e.g. 80000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Maximum Salary (Optional)</Label>
                <Input id="salaryMax" name="salaryMax" type="number" value={formData.salaryMax || ''} onChange={handleNumberChange} placeholder="e.g. 120000" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="description">Overview *</Label>
              <Textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={5} placeholder="Describe the role and the company..." />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities *</Label>
              <Textarea id="responsibilities" name="responsibilities" value={formData.responsibilities} onChange={handleChange} required rows={5} placeholder="What will they do day-to-day?" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements *</Label>
              <Textarea id="requirements" name="requirements" value={formData.requirements} onChange={handleChange} required rows={5} placeholder="What qualifications are needed?" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skills & Keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input 
                  placeholder="Type a skill and press Add or Enter..." 
                  value={skillInput} 
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
              </div>
              <Button type="button" onClick={addSkill} variant="secondary">
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
            
            {formData.skills && formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-zinc-900 rounded-md border border-gray-100 dark:border-zinc-800">
                {formData.skills.map(skill => (
                  <span key={skill} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="ml-2 text-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/jobs">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createJob.isPending || updateJob.isPending}>
            {isEdit ? 'Update Job' : 'Publish Job'}
          </Button>
        </div>
      </form>
    </div>
  );
}
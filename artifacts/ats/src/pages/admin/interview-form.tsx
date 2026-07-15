import React, { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useScheduleInterview, useListApplications, useGetMe, InterviewInput } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function ScheduleInterview() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: profile } = useGetMe();
  const scheduleInterview = useScheduleInterview();

  // In a real app we'd search applications or pass application ID via query param
  // For simplicity, we fetch recent applications to pick from
  const { data: appsData } = useListApplications({ limit: 50 });
  const applications = appsData?.applications || [];
  
  // Only show active applications (not rejected/hired)
  const activeApplications = applications.filter(a => a.stage !== 'rejected' && a.stage !== 'hired');

  const [formData, setFormData] = useState<Partial<InterviewInput>>({
    applicationId: '',
    interviewerName: profile?.name || '',
    interviewerEmail: profile?.email || '',
    scheduledAt: '',
    durationMinutes: 45,
    meetingType: 'video',
    meetingLink: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId || !formData.scheduledAt) {
      toast({ title: "Validation Error", description: "Application and date/time are required", variant: "destructive" });
      return;
    }

    try {
      // Need ISO string for scheduledAt. The datetime-local input returns "YYYY-MM-DDThh:mm"
      const isoDate = new Date(formData.scheduledAt).toISOString();

      await scheduleInterview.mutateAsync({
        data: {
          ...formData,
          scheduledAt: isoDate,
          durationMinutes: Number(formData.durationMinutes)
        } as InterviewInput
      });
      
      toast({ title: "Interview scheduled successfully" });
      setLocation('/admin/interviews');
    } catch (error: any) {
      toast({ title: "Failed to schedule", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/interviews"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Schedule Interview</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="applicationId">Select Candidate / Application *</Label>
              <Select value={formData.applicationId} onValueChange={(val) => handleSelectChange('applicationId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an active application" />
                </SelectTrigger>
                <SelectContent>
                  {activeApplications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.candidate?.name} - {app.job?.title}
                    </SelectItem>
                  ))}
                  {activeApplications.length === 0 && (
                    <SelectItem value="none" disabled>No active applications found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interviewerName">Interviewer Name *</Label>
                <Input id="interviewerName" name="interviewerName" value={formData.interviewerName} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interviewerEmail">Interviewer Email *</Label>
                <Input id="interviewerEmail" name="interviewerEmail" type="email" value={formData.interviewerEmail} onChange={handleChange} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Date & Time *</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" value={formData.scheduledAt} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                <Select value={String(formData.durationMinutes)} onValueChange={(val) => handleSelectChange('durationMinutes', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meetingType">Meeting Type *</Label>
                <Select value={formData.meetingType} onValueChange={(val) => handleSelectChange('meetingType', val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link / Location</Label>
                <Input id="meetingLink" name="meetingLink" value={formData.meetingLink || ''} onChange={handleChange} placeholder="Zoom/Meet link or address" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Candidate (Optional)</Label>
              <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} placeholder="Preparation instructions..." />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/interviews">Cancel</Link>
              </Button>
              <Button type="submit" disabled={scheduleInterview.isPending}>
                {scheduleInterview.isPending ? 'Scheduling...' : 'Schedule Interview'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
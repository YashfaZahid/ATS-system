import React, { useEffect, useState, useRef } from 'react';
import { useGetCandidate, useUpdateCandidate, useUploadResume } from '@workspace/api-client-react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { FileUp, FileText, CheckCircle2, Loader2, Linkedin, Github, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQueryClient } from '@tanstack/react-query';
import { getGetCandidateQueryKey } from '@workspace/api-client-react';

export default function Profile() {
  const { profile } = useAuth();
  const userId = profile?.id || '';
  
  // Actually candidate ID = profile.id in this schema based on common setup, or we need to find it.
  // The API allows getting candidate by ID. Let's assume candidateId = profile.id.
  const { data: candidate, isLoading } = useGetCandidate(userId, { query: { enabled: !!userId } });
  const updateCandidate = useUpdateCandidate();
  const uploadResume = useUploadResume();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    headline: '',
    summary: '',
    location: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: ''
  });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || '',
        phone: candidate.phone || '',
        headline: candidate.headline || '',
        summary: candidate.summary || '',
        location: candidate.location || '',
        linkedinUrl: candidate.linkedinUrl || '',
        githubUrl: candidate.githubUrl || '',
        portfolioUrl: candidate.portfolioUrl || ''
      });
    } else if (profile) {
      setFormData(f => ({ ...f, name: profile.name }));
    }
  }, [candidate, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await updateCandidate.mutateAsync({
        id: userId,
        data: formData
      });
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: getGetCandidateQueryKey(userId) });
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Resume must be under 5MB", variant: "destructive" });
      return;
    }
    
    // Check type PDF or DOCX
    if (file.type !== 'application/pdf' && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      toast({ title: "Invalid file type", description: "Only PDF or DOCX allowed", variant: "destructive" });
      return;
    }

    const candidateId = candidate?.id || userId;
    setUploading(true);
    try {
      // 1. Read file as base64 for Gemini document understanding
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data URL prefix (e.g. "data:application/pdf;base64,")
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 2. Upload to Supabase Storage
      const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = `${userId}/${safeFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // 4. Call backend to parse + save (send base64 so Gemini can read the binary)
      await uploadResume.mutateAsync({
        id: candidateId,
        data: {
          fileName: file.name,
          fileUrl: publicUrl,
          fileSize: file.size,
          mimeType: file.type,
          fileContent: base64Content,
        }
      });

      toast({
        title: "Resume uploaded successfully",
        description: "We've parsed your resume, updated your skills, and indexed it for matching.",
      });
      queryClient.invalidateQueries({ queryKey: getGetCandidateQueryKey(userId) });
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 text-lg">Manage your personal details and resume.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          {/* Avatar / Resume Upload Card */}
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <Avatar className="h-24 w-24 border-4 border-white dark:border-zinc-900 shadow-md">
                <AvatarImage src={profile?.avatarUrl || ''} />
                <AvatarFallback className="text-2xl">{profile?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{profile?.name}</h3>
                <p className="text-sm text-gray-500">{profile?.email}</p>
              </div>
              
              <div className="w-full h-px bg-gray-100 dark:bg-zinc-800 my-2"></div>
              
              <div className="w-full text-left">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Resume</Label>
                {candidate?.resumeUrl ? (
                  <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg flex items-center justify-between border border-green-200 dark:border-green-900">
                    <div className="flex items-center truncate mr-2">
                      <FileText className="h-4 w-4 mr-2 shrink-0" />
                      <span className="text-sm truncate font-medium">{candidate.resumeFileName || 'Resume'}</span>
                    </div>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  </div>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-3 rounded-lg border border-orange-200 dark:border-orange-900 text-sm text-center">
                    No resume uploaded
                  </div>
                )}
                
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                <Button 
                  variant="outline" 
                  className="w-full mt-3" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><FileUp className="mr-2 h-4 w-4" /> {candidate?.resumeUrl ? 'Update Resume' : 'Upload Resume'}</>}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">PDF or DOCX up to 5MB</p>
              </div>
            </CardContent>
          </Card>

          {candidate?.skills && candidate.skills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Extracted Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map(skill => (
                    <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your contact details and headline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" value={formData.location} onChange={handleChange} placeholder="San Francisco, CA" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input id="headline" name="headline" value={formData.headline} onChange={handleChange} placeholder="Senior Frontend Engineer" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Professional Summary</Label>
                <Textarea 
                  id="summary" 
                  name="summary" 
                  value={formData.summary} 
                  onChange={handleChange} 
                  placeholder="A brief overview of your experience and goals..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
              <CardDescription>Connect your online presence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Linkedin className="h-5 w-5 text-gray-400" />
                <Input name="linkedinUrl" value={formData.linkedinUrl} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
              </div>
              <div className="flex items-center space-x-3">
                <Github className="h-5 w-5 text-gray-400" />
                <Input name="githubUrl" value={formData.githubUrl} onChange={handleChange} placeholder="https://github.com/username" />
              </div>
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <Input name="portfolioUrl" value={formData.portfolioUrl} onChange={handleChange} placeholder="https://yourwebsite.com" />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateCandidate.isPending} className="px-8 font-bold shadow-sm">
              {updateCandidate.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
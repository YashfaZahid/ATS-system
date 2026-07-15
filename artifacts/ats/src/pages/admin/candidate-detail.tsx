import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useGetCandidate, useListApplications } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, MapPin, Phone, Linkedin, Github, Globe, FileText, Download, Building, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { STAGE_COLORS, STAGE_LABELS, formatDate } from '@/lib/utils/format';

export default function AdminCandidateProfile() {
  const [, params] = useRoute('/admin/candidates/:id');
  const id = params?.id || '';

  const { data: candidate, isLoading } = useGetCandidate(id, { query: { enabled: !!id } });
  const { data: appsData, isLoading: appsLoading } = useListApplications({ candidateId: id }, { query: { enabled: !!id } });

  if (isLoading) return <div className="p-8 text-center">Loading candidate profile...</div>;
  if (!candidate) return <div className="p-8 text-center text-red-500">Candidate not found.</div>;

  const applications = appsData?.applications || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <Link href="/admin/candidates" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to candidates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-4 border-4 border-white dark:border-zinc-900 shadow-lg">
                <AvatarImage src={candidate.avatarUrl || ''} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">{candidate.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{candidate.name}</h2>
              <p className="text-primary font-medium mt-1">{candidate.headline || 'No headline provided'}</p>
              
              <div className="w-full flex flex-col gap-3 mt-6 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" /> <a href={`mailto:${candidate.email}`} className="hover:text-primary">{candidate.email}</a>
                </div>
                {candidate.phone && (
                  <div className="flex items-center justify-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" /> <span>{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" /> <span>{candidate.location}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 mt-6">
                {candidate.linkedinUrl && (
                  <a href={candidate.linkedinUrl} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-primary/20 hover:text-primary transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {candidate.githubUrl && (
                  <a href={candidate.githubUrl} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-primary/20 hover:text-primary transition-colors">
                    <Github className="h-5 w-5" />
                  </a>
                )}
                {candidate.portfolioUrl && (
                  <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-primary/20 hover:text-primary transition-colors">
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {candidate.resumeUrl && (
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <FileText className="h-10 w-10 text-primary mb-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Resume Attached</h3>
                  <p className="text-xs text-gray-500 mb-4">{candidate.resumeFileName || 'resume.pdf'}</p>
                  <Button className="w-full" asChild>
                    <a href={candidate.resumeUrl} target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" /> View Resume
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-zinc-800">
              <CardTitle className="text-base">Top Skills</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {candidate.skills.length > 0 ? candidate.skills.map(skill => (
                  <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                )) : <span className="text-gray-500 text-sm">No skills listed</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Applications & Parsed Resume details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-gray-100 dark:border-zinc-800 flex flex-row items-center justify-between pb-4">
              <CardTitle>Applications ({applications.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {appsLoading ? (
                <div className="p-6 text-center text-gray-500">Loading...</div>
              ) : applications.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {applications.map(app => (
                    <div key={app.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div>
                        <Link href={`/admin/applications/${app.id}`} className="text-lg font-bold text-gray-900 dark:text-white hover:text-primary transition-colors flex items-center group">
                          {app.job?.title} <ExternalLink className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <div className="flex items-center text-sm text-gray-500 mt-2 gap-4">
                          <span className="flex items-center"><Building className="mr-1.5 h-3.5 w-3.5" /> {app.job?.department}</span>
                          <span>Applied {formatDate(app.createdAt)}</span>
                        </div>
                      </div>
                      <Badge className={`px-3 py-1 rounded-full text-xs font-semibold border-0 ${STAGE_COLORS[app.stage]}`}>
                        {STAGE_LABELS[app.stage]}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500">No applications found for this candidate.</div>
              )}
            </CardContent>
          </Card>

          {candidate.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professional Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {candidate.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Render Parsed Resume Data if available */}
          {candidate.parsedResume && (
            <>
              {candidate.parsedResume.experience && candidate.parsedResume.experience.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Experience from Resume</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {candidate.parsedResume.experience.map((exp: any, i) => (
                      <div key={i} className="relative pl-6 border-l-2 border-gray-200 dark:border-zinc-800">
                        <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary ring-4 ring-white dark:ring-zinc-950"></div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{exp.title}</h4>
                        <div className="text-primary font-medium text-sm mt-0.5">{exp.company}</div>
                        {(exp.startDate || exp.endDate) && (
                          <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
                            {exp.startDate} - {exp.endDate || 'Present'}
                          </div>
                        )}
                        {exp.description && (
                          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {candidate.parsedResume.education && candidate.parsedResume.education.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Education</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {candidate.parsedResume.education.map((edu: any, i) => (
                      <div key={i}>
                        <h4 className="font-bold text-gray-900 dark:text-white">{edu.institution}</h4>
                        <div className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                          {edu.degree} {edu.field && `in ${edu.field}`}
                        </div>
                        {(edu.startDate || edu.endDate) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {edu.startDate} - {edu.endDate}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useListCandidates } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useLocation } from 'wouter';
import { Search, MapPin, Mail, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function AdminCandidates() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [, setLocation] = useLocation();
  
  const { data, isLoading } = useListCandidates({ q: debouncedSearch || undefined, limit: 100 });
  const candidates = data?.candidates || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Candidates</h1>
          <p className="text-gray-500 mt-1">Manage talent pool and profiles</p>
        </div>
        <Button onClick={() => setLocation('/admin/candidates/compare')} variant="secondary">
          Compare Candidates
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-50 dark:bg-zinc-950 border-transparent focus-visible:bg-white"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {data?.total || 0} Candidates
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-medium">Candidate</th>
                <th className="px-6 py-4 font-medium">Experience</th>
                <th className="px-6 py-4 font-medium">Top Skills</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading candidates...</td></tr>
              ) : candidates.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No candidates found.</td></tr>
              ) : (
                candidates.map(candidate => (
                  <tr key={candidate.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer" onClick={() => setLocation(`/admin/candidates/${candidate.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-gray-100 dark:border-zinc-800">
                          <AvatarImage src={candidate.avatarUrl || ''} />
                          <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center">
                            {candidate.name}
                            {candidate.resumeUrl && <FileText className="h-3.5 w-3.5 ml-2 text-primary" title="Resume uploaded" />}
                          </div>
                          <div className="flex items-center text-xs text-gray-500 mt-1 gap-3">
                            <span className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {candidate.email}</span>
                            {candidate.location && <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {candidate.location}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">{candidate.headline || 'No headline'}</div>
                      <div className="text-xs text-gray-500 mt-1">{candidate.yearsOfExperience !== null && candidate.yearsOfExperience !== undefined ? `${candidate.yearsOfExperience} years exp.` : 'Exp. unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[250px]">
                        {candidate.skills.slice(0, 3).map(skill => (
                          <span key={skill} className="px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-50 dark:bg-zinc-900 text-gray-400 rounded text-xs">
                            +{candidate.skills.length - 3}
                          </span>
                        )}
                        {candidate.skills.length === 0 && <span className="text-gray-400 text-xs">No skills listed</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                        <Link href={`/admin/candidates/${candidate.id}`}>
                          <ArrowRight className="h-4 w-4" />
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
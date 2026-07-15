import React, { useState } from 'react';
import { useListJobs } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'wouter';
import { Search, MapPin, Briefcase, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function JobsBrowser() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [department, setDepartment] = useState<string>('all');
  const [type, setType] = useState<string>('all');

  const { data, isLoading } = useListJobs({
    q: debouncedSearch || undefined,
    department: department !== 'all' ? department : undefined,
    type: type !== 'all' ? type : undefined,
    status: 'open',
    limit: 50
  });

  const jobs = data?.jobs || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Open Roles</h1>
        <p className="text-gray-500 text-lg">Find the perfect position for your skills and career goals.</p>
      </div>

      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs by title or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-gray-50 dark:bg-zinc-950 border-transparent focus-visible:bg-white"
              />
            </div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-full md:w-[200px] bg-gray-50 dark:bg-zinc-950 border-transparent">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full md:w-[200px] bg-gray-50 dark:bg-zinc-950 border-transparent">
                <SelectValue placeholder="Job Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white dark:bg-zinc-900 rounded-xl animate-pulse"></div>)}
        </div>
      ) : jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="hover-elevate cursor-pointer transition-all border border-gray-200 dark:border-zinc-800 hover:border-primary/50 group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                        <Badge variant="secondary" className="md:hidden capitalize">
                          {job.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center"><Briefcase className="mr-1.5 h-4 w-4" /> {job.department}</span>
                        <span className="flex items-center"><MapPin className="mr-1.5 h-4 w-4" /> {job.location}</span>
                        <span className="flex items-center"><Clock className="mr-1.5 h-4 w-4" /> Posted {(new Date(job.createdAt)).toLocaleDateString()}</span>
                      </div>
                      
                      {job.skills && job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-zinc-800">
                          {job.skills.slice(0, 5).map(skill => (
                            <span key={skill} className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-xs rounded-md">
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="px-2 py-1 bg-gray-50 dark:bg-zinc-900 text-gray-500 text-xs rounded-md">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-gray-100 dark:border-zinc-800">
                      <Badge variant="secondary" className="hidden md:inline-flex capitalize">
                        {job.type.replace('_', ' ')}
                      </Badge>
                      <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">No jobs found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search filters.</p>
          <Button variant="outline" className="mt-6" onClick={() => { setSearch(''); setDepartment('all'); setType('all'); }}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
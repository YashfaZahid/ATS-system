import React from 'react';
import { useListApplications } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { FileText, Building, Calendar, ArrowRight } from 'lucide-react';
import { STAGE_COLORS, STAGE_LABELS, formatRelative } from '@/lib/utils/format';

export default function Applications() {
  const { data, isLoading } = useListApplications({ limit: 50 });
  const applications = data?.applications || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Applications</h1>
        <p className="text-gray-500 text-lg">Track the status of all your job applications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white dark:bg-zinc-900 rounded-xl animate-pulse"></div>)}
        </div>
      ) : applications.length > 0 ? (
        <div className="grid gap-4">
          {applications.map((app) => (
            <Link key={app.id} href={`/applications/${app.id}`}>
              <Card className="hover-elevate cursor-pointer transition-all border border-gray-200 dark:border-zinc-800 hover:border-primary/50 group">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                          {app.job?.title}
                        </h3>
                        <Badge variant="outline" className={`md:hidden px-3 py-1 rounded-full text-xs font-semibold border-0 ${STAGE_COLORS[app.stage]}`}>
                          {STAGE_LABELS[app.stage]}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center"><Building className="mr-1.5 h-4 w-4" /> {app.job?.department}</span>
                        <span className="flex items-center"><Calendar className="mr-1.5 h-4 w-4" /> Applied {formatRelative(app.createdAt)}</span>
                        <span className="flex items-center text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 capitalize">
                          {app.job?.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0">
                      <Badge variant="outline" className={`hidden md:inline-flex px-3 py-1 rounded-full text-sm font-semibold border-0 ${STAGE_COLORS[app.stage]}`}>
                        {STAGE_LABELS[app.stage]}
                      </Badge>
                      <div className="text-primary font-medium text-sm flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">No applications yet</h3>
          <p className="text-gray-500 mt-2">You haven't applied to any roles yet.</p>
          <div className="mt-6">
            <Link href="/jobs" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4">
              Browse Open Jobs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
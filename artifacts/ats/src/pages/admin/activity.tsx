import React, { useState } from 'react';
import { useListActivityLogs } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Briefcase, FileText, Calendar, Settings, Activity as ActivityIcon } from 'lucide-react';
import { formatDateTime, formatRelative } from '@/lib/utils/format';

export default function ActivityLog() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListActivityLogs({ page, limit: 50 });
  const logs = data?.logs || [];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'job': return <Briefcase className="h-4 w-4" />;
      case 'application': return <FileText className="h-4 w-4" />;
      case 'candidate': return <User className="h-4 w-4" />;
      case 'interview': return <Calendar className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      default: return <ActivityIcon className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('add')) return 'bg-green-100 text-green-800';
    if (action.includes('update') || action.includes('edit')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete') || action.includes('remove')) return 'bg-red-100 text-red-800';
    if (action.includes('status') || action.includes('stage')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
        <p className="text-gray-500 text-lg">System-wide audit trail of actions</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-zinc-900/50">
              <tr>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Entity</th>
                <th className="px-6 py-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading activity...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No activity logs found.</td></tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{formatDateTime(log.createdAt)}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{formatRelative(log.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center font-medium">
                        <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" /> {log.userName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`px-2 py-0.5 rounded border-0 capitalize font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-600 dark:text-gray-300 capitalize font-medium">
                        <span className="mr-1.5 text-gray-400">{getEntityIcon(log.entityType)}</span> {log.entityType}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{log.entityId.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {log.details ? (
                        <div className="text-xs bg-gray-50 dark:bg-zinc-900 p-2 rounded overflow-hidden text-ellipsis max-w-xs">
                          {Object.entries(log.details).map(([k, v]) => (
                            <span key={k} className="mr-3 inline-block">
                              <span className="font-semibold text-gray-500">{k}:</span> {String(v)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No details</span>
                      )}
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
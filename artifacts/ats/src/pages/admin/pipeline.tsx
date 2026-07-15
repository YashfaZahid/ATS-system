import React from 'react';
import { useGetPipelineStats } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { STAGE_COLORS, STAGE_LABELS } from '@/lib/utils/format';
import { ArrowDown } from 'lucide-react';

export default function Pipeline() {
  const { data: stats, isLoading } = useGetPipelineStats();

  if (isLoading) return <div className="p-8 text-center">Loading pipeline data...</div>;
  if (!stats) return <div className="p-8 text-center text-red-500">Failed to load pipeline stats.</div>;

  const chartData = stats.stages.map(s => ({
    name: STAGE_LABELS[s.stage] || s.stage,
    count: s.count,
    stage: s.stage
  }));

  const extractColorFromClass = (className: string) => {
    // A bit hacky, but mapping stage keys to actual hex codes for the chart
    const colors: Record<string, string> = {
      applied: '#3b82f6',
      screening: '#eab308',
      shortlisted: '#a855f7',
      technical_interview: '#f97316',
      hr_interview: '#6366f1',
      offer: '#14b8a6',
      hired: '#22c55e',
      rejected: '#ef4444'
    };
    return colors[className] || '#cbd5e1';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hiring Funnel</h1>
        <p className="text-gray-500 text-lg">Analyze application conversion rates across stages.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Candidates in Pipeline</CardTitle>
            <CardDescription>Current volume of active applications per stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} angle={-35} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={extractColorFromClass(entry.stage)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Rates</CardTitle>
            <CardDescription>Pass-through rates between stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {stats.conversionRates.map((rate, i) => (
                <div key={i} className="relative pb-6 last:pb-0">
                  {i !== stats.conversionRates.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-gray-100 dark:bg-zinc-800"></div>
                  )}
                  
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 ${getConversionColorClass(rate.rate)} bg-white dark:bg-zinc-950 font-bold shadow-sm z-10`}>
                      {Math.round(rate.rate)}%
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Pass rate from</div>
                      <div className="font-semibold text-gray-900 dark:text-white flex flex-wrap items-center gap-1.5">
                        <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">{STAGE_LABELS[rate.from] || rate.from}</span>
                        <ArrowDown className="h-3 w-3 text-gray-400" />
                        <span className="text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">{STAGE_LABELS[rate.to] || rate.to}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.conversionRates.length === 0 && (
                <div className="text-center py-8 text-gray-500">Not enough data to calculate conversions.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getConversionColorClass(rate: number) {
  if (rate >= 70) return 'border-green-200 text-green-700 dark:border-green-900/50 dark:text-green-500';
  if (rate >= 40) return 'border-yellow-200 text-yellow-700 dark:border-yellow-900/50 dark:text-yellow-500';
  if (rate > 0) return 'border-orange-200 text-orange-700 dark:border-orange-900/50 dark:text-orange-500';
  return 'border-gray-200 text-gray-500 dark:border-gray-800';
}
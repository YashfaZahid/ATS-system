import React, { useState } from 'react';
import { useListAdminUsers, useCreateAdminUser, AdminUserInput } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getListAdminUsersQueryKey } from '@workspace/api-client-react';
import { UserPlus, Shield, Mail, Key } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AdminSettings() {
  const { data: users, isLoading } = useListAdminUsers();
  const createAdmin = useCreateAdminUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<AdminUserInput>({
    name: '',
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdmin.mutateAsync({ data: formData });
      toast({ title: 'Admin user created successfully' });
      setOpen(false);
      setFormData({ name: '', email: '', password: '' });
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
    } catch (error: any) {
      toast({ title: 'Failed to create admin', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 text-lg">Manage system access and configuration.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center"><Shield className="h-5 w-5 mr-2 text-primary" /> Admin Users</CardTitle>
            <CardDescription className="mt-1">Manage personnel with access to the ATS backend.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" /> Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Admin User</DialogTitle>
                <DialogDescription>
                  This user will have full access to manage jobs, candidates, and applications.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password</Label>
                  <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={6} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createAdmin.isPending}>
                    {createAdmin.isPending ? 'Creating...' : 'Create Admin'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading users...</div>
          ) : users && users.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {users.map((user) => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{user.name}</h4>
                      <div className="flex items-center text-sm text-gray-500 mt-0.5">
                        <Mail className="h-3 w-3 mr-1" /> {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-400 hidden sm:block">
                      ID: <span className="font-mono">{user.id.substring(0, 8)}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" disabled={users.length === 1}>
                      Revoke Access
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">No admin users found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
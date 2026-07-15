import React, { useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSubmitted(true);
      toast({
        title: "Reset link sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-xl overflow-hidden border border-gray-100 dark:border-zinc-800">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">ATS<span className="text-primary">Pro</span></span>
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-2">Reset password</h2>
          
          {submitted ? (
            <div className="text-center space-y-6">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm">
                We've sent a password reset link to <strong>{email}</strong>
              </div>
              <Link href="/login" className="inline-flex items-center text-primary hover:underline font-medium">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">Enter your email and we'll send you a link to reset your password</p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
                
                <Button type="submit" className="w-full font-semibold h-11 text-md" disabled={loading}>
                  {loading ? "Sending..." : "Send reset link"}
                </Button>
              </form>
              
              <div className="mt-8 text-center text-sm">
                <Link href="/login" className="inline-flex items-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
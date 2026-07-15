import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { queryClient } from './lib/queryClient';
import { AuthProvider, ProtectedRoute, AdminRoute } from './lib/auth';
import { AppLayout } from './components/layout';

import Login from './pages/auth/login';
import Register from './pages/auth/register';
import ForgotPassword from './pages/auth/forgot-password';

import CandidateDashboard from './pages/candidate/dashboard';
import CandidateJobs from './pages/candidate/jobs';
import CandidateJobDetail from './pages/candidate/job-detail';
import CandidateApplications from './pages/candidate/applications';
import CandidateApplicationDetail from './pages/candidate/application-detail';
import CandidateInterviews from './pages/candidate/interviews';
import CandidateProfile from './pages/candidate/profile';

import AdminDashboard from './pages/admin/dashboard';
import AdminJobs from './pages/admin/jobs';
import AdminJobForm from './pages/admin/job-form';
import AdminCandidates from './pages/admin/candidates';
import AdminCandidateDetail from './pages/admin/candidate-detail';
import AdminCompare from './pages/admin/compare';
import AdminApplications from './pages/admin/applications';
import AdminApplicationDetail from './pages/admin/application-detail';
import AdminInterviews from './pages/admin/interviews';
import AdminInterviewForm from './pages/admin/interview-form';
import AdminInterviewDetail from './pages/admin/interview-detail';
import AdminPipeline from './pages/admin/pipeline';
import AdminActivity from './pages/admin/activity';
import AdminSettings from './pages/admin/settings';

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      <Route path="/">
        {() => (
          <ProtectedRoute component={() => {
            // we let the ProtectedRoute ensure user is logged in,
            // then we'll redirect in a useEffect inside a wrapper or just use the layout.
            // A simpler approach: a small redirect component based on role.
            return <RoleRedirect />;
          }} />
        )}
      </Route>

      <Route path="/dashboard"><ProtectedRoute component={() => <AppLayout><CandidateDashboard /></AppLayout>} /></Route>
      <Route path="/jobs"><ProtectedRoute component={() => <AppLayout><CandidateJobs /></AppLayout>} /></Route>
      <Route path="/jobs/:id"><ProtectedRoute component={() => <AppLayout><CandidateJobDetail /></AppLayout>} /></Route>
      <Route path="/applications"><ProtectedRoute component={() => <AppLayout><CandidateApplications /></AppLayout>} /></Route>
      <Route path="/applications/:id"><ProtectedRoute component={() => <AppLayout><CandidateApplicationDetail /></AppLayout>} /></Route>
      <Route path="/interviews"><ProtectedRoute component={() => <AppLayout><CandidateInterviews /></AppLayout>} /></Route>
      <Route path="/profile"><ProtectedRoute component={() => <AppLayout><CandidateProfile /></AppLayout>} /></Route>

      <Route path="/admin"><AdminRoute component={() => <AppLayout><AdminDashboard /></AppLayout>} /></Route>
      <Route path="/admin/jobs"><AdminRoute component={() => <AppLayout><AdminJobs /></AppLayout>} /></Route>
      <Route path="/admin/jobs/new"><AdminRoute component={() => <AppLayout><AdminJobForm /></AppLayout>} /></Route>
      <Route path="/admin/jobs/:id/edit"><AdminRoute component={() => <AppLayout><AdminJobForm /></AppLayout>} /></Route>
      <Route path="/admin/candidates"><AdminRoute component={() => <AppLayout><AdminCandidates /></AppLayout>} /></Route>
      <Route path="/admin/candidates/compare"><AdminRoute component={() => <AppLayout><AdminCompare /></AppLayout>} /></Route>
      <Route path="/admin/candidates/:id"><AdminRoute component={() => <AppLayout><AdminCandidateDetail /></AppLayout>} /></Route>
      <Route path="/admin/applications"><AdminRoute component={() => <AppLayout><AdminApplications /></AppLayout>} /></Route>
      <Route path="/admin/applications/:id"><AdminRoute component={() => <AppLayout><AdminApplicationDetail /></AppLayout>} /></Route>
      <Route path="/admin/interviews"><AdminRoute component={() => <AppLayout><AdminInterviews /></AppLayout>} /></Route>
      <Route path="/admin/interviews/new"><AdminRoute component={() => <AppLayout><AdminInterviewForm /></AppLayout>} /></Route>
      <Route path="/admin/interviews/:id"><AdminRoute component={() => <AppLayout><AdminInterviewDetail /></AppLayout>} /></Route>
      <Route path="/admin/pipeline"><AdminRoute component={() => <AppLayout><AdminPipeline /></AppLayout>} /></Route>
      <Route path="/admin/activity"><AdminRoute component={() => <AppLayout><AdminActivity /></AppLayout>} /></Route>
      <Route path="/admin/settings"><AdminRoute component={() => <AppLayout><AdminSettings /></AppLayout>} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

import { useLocation } from 'wouter';
import { useAuth } from './lib/auth';
import { useEffect } from 'react';

function RoleRedirect() {
  const { role } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (role === 'admin') setLocation('/admin');
    else setLocation('/dashboard');
  }, [role, setLocation]);

  return <div className="h-screen w-full flex items-center justify-center">Redirecting...</div>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

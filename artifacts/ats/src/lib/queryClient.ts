import { QueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { auth } from './firebase';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setAuthTokenGetter(async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
});

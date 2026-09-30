import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import LoginPage from '../app/(auth)/login/page';
import { usePathname } from './room-auth-test-services';
function Root() { const path = usePathname(); return path === '/login' ? <LoginPage /> : <ProtectedRoute><div>Room</div></ProtectedRoute>; }
sessionStorage.removeItem('thaasbai-room-return');
createRoot(document.getElementById('test-root')!).render(<Root />);

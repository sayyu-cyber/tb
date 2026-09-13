import React from 'react';
import { createRoot } from 'react-dom/client';
import FriendsPage from '../app/(main)/friends/page';
createRoot(document.getElementById('test-root')!).render(<FriendsPage/>);

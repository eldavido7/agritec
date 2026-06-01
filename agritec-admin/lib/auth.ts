export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'viewer';
  avatar?: string;
};

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'admin@agritec.com': {
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@agritec.com',
      name: 'Admin User',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  },
  'manager@agritec.com': {
    password: 'manager123',
    user: {
      id: '2',
      email: 'manager@agritec.com',
      name: 'Manager User',
      role: 'manager',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager',
    },
  },
};

export function login(email: string, password: string): { success: boolean; user?: User; error?: string } {
  const userData = DEMO_USERS[email];
  
  if (!userData) {
    return { success: false, error: 'User not found' };
  }
  
  if (userData.password !== password) {
    return { success: false, error: 'Invalid password' };
  }
  
  return { success: true, user: userData.user };
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('agritec_user');
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  const user = localStorage.getItem('agritec_user');
  return user ? JSON.parse(user) : null;
}

export function setCurrentUser(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agritec_user', JSON.stringify(user));
  }
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('agritec_user');
}

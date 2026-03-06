import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BACKEND_URL } from '@/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Users, UserPlus, Shield, Trash2, Key, Edit, 
  CheckCircle, XCircle, ShoppingCart, AlertCircle 
} from 'lucide-react';

const PROCUREMENT_DIRECTORS = ['yogesh.ostwal@nucleovir.com', 'sunil.k@nucleovir.com'];

export default function UserManagement() {
  const { user } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'Employee' });
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (user?.role === 'SuperAdmin') {
      fetchUsers();
      fetchRoles();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users`, { credentials: 'include' });
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/roles`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.roles);
      }
    } catch (error) {
      console.error('Failed to fetch roles');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        toast.success('User created successfully');
        setCreateDialogOpen(false);
        setNewUser({ email: '', name: '', password: '', role: 'Employee' });
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create user');
      }
    } catch (error) {
      toast.error('Error creating user');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser.email}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        toast.success('Role updated successfully');
        setEditDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update role');
      }
    } catch (error) {
      toast.error('Error updating role');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser.email}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword })
      });
      
      if (response.ok) {
        toast.success('Password reset successfully');
        setResetPasswordDialogOpen(false);
        setNewPassword('');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Error resetting password');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${selectedUser.email}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast.success('User deleted successfully');
        setDeleteDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete user');
      }
    } catch (error) {
      toast.error('Error deleting user');
    }
  };

  const handleToggleDirector = async (userEmail, currentStatus) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userEmail}/director`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_director: !currentStatus })
      });
      
      if (response.ok) {
        toast.success(currentStatus ? 'Removed from directors' : 'Added as director');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to update director status');
      }
    } catch (error) {
      toast.error('Error updating director status');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'SuperAdmin': return 'bg-purple-600 text-white';
      case 'Admin': return 'bg-blue-600 text-white';
      case 'CA': return 'bg-emerald-600 text-white';
      case 'HR': return 'bg-orange-500 text-white';
      case 'Accountant': return 'bg-amber-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (user?.role !== 'SuperAdmin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-slate-400">
              Only SuperAdmin can access User Management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-slate-400">Manage user roles and permissions</p>
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-gradient-to-r from-[#FF3D33] to-[#215F9A] text-white"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-[#215F9A]">{users.length}</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Total Users</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{users.filter(u => u.role === 'SuperAdmin').length}</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Super Admins</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{users.filter(u => u.role === 'Admin').length}</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Admins</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-800">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{users.filter(u => u.is_director).length}</div>
            <div className="text-sm text-gray-600 dark:text-slate-400">Directors</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-gray-600 dark:text-slate-400 font-medium">Access</th>
                    <th className="text-right py-3 px-4 text-gray-600 dark:text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">{u.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600 dark:text-slate-400">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getRoleBadgeColor(u.role)}>{u.role}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 flex-wrap">
                          {u.is_director && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Director
                            </Badge>
                          )}
                          {u.has_procurement_access && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Procurement
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedUser(u); setNewRole(u.role); setEditDialogOpen(true); }}
                            className="border-gray-300 dark:border-slate-600"
                            disabled={u.email === user?.email}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedUser(u); setResetPasswordDialogOpen(true); }}
                            className="border-gray-300 dark:border-slate-600"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true); }}
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                            disabled={u.email === user?.email}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Email *</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@nucleovir.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Full Name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Password *</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min 8 characters"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">Role</label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} className="bg-[#215F9A] text-white">Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Edit User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white">{selectedUser?.name}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">{selectedUser?.email}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">New Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateRole} className="bg-[#215F9A] text-white">Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white">{selectedUser?.name}</div>
              <div className="text-sm text-gray-600 dark:text-slate-400">{selectedUser?.email}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordDialogOpen(false); setNewPassword(''); }}>Cancel</Button>
            <Button onClick={handleResetPassword} className="bg-amber-600 text-white">Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-red-600">Delete User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-slate-400">
              Are you sure you want to delete <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
            </p>
            <p className="text-red-600 text-sm mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleDeleteUser} variant="destructive">Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

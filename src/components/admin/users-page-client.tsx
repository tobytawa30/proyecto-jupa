'use client';

import { useEffect, useState } from 'react';
import { Edit, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateDDMMYYYY } from '@/lib/utils';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
  createdAt: string;
}

interface UserFormState {
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
  password: string;
}

interface PaginationData {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

const ALL_ROLES = 'ALL_ROLES';

const INITIAL_FORM: UserFormState = {
  name: '',
  email: '',
  role: 'EDITOR',
  password: '',
};

const DEFAULT_PAGINATION: PaginationData = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
};

export function UsersPageClient() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ADMIN' | 'EDITOR' | ''>('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormState>(INITIAL_FORM);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (roleFilter) params.set('role', roleFilter);
      params.set('page', page.toString());
      params.set('pageSize', '10');

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar la lista de usuarios');
      }

      setUsers(data.users || []);
      setPagination(data.pagination || DEFAULT_PAGINATION);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios');
      setUsers([]);
      setPagination(DEFAULT_PAGINATION);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, roleFilter, page]);

  const resetForm = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setError('');
    setInfo('');
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
  };

  const openEditForm = (user: AppUser) => {
    setError('');
    setInfo('');
    setEditingId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsSaving(true);

    try {
      const isEdit = Boolean(editingId);
      const endpoint = isEdit ? `/api/admin/users/${editingId}` : '/api/admin/users';
      const method = isEdit ? 'PUT' : 'POST';

      const payload: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      };

      if (!isEdit || formData.password.trim()) {
        payload.password = formData.password;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo guardar el usuario');
      }

      await fetchUsers();
      setInfo(isEdit ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`¿Eliminar al usuario ${user.name}?`)) {
      return;
    }

    setError('');
    setInfo('');

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo eliminar el usuario');
      }

      setInfo('Usuario eliminado correctamente');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600">Administra cuentas de administradores y editores</p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {info && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {info}
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@jupa.org"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'ADMIN' | 'EDITOR') => setFormData((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="EDITOR">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder={editingId ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'}
                    required={!editingId}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : editingId ? 'Actualizar Usuario' : 'Crear Usuario'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={isSaving}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Usuarios
          </CardTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <Input
              placeholder="Buscar por nombre o email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={roleFilter || ALL_ROLES}
              onValueChange={(value) => {
                setRoleFilter(value === ALL_ROLES ? '' : (value as 'ADMIN' | 'EDITOR'));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>Todos los roles</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-10 text-center text-gray-500">No hay usuarios que coincidan con la búsqueda</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Rol</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Creado</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                      <td className="px-4 py-3 text-slate-700">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {user.role === 'ADMIN' ? 'Administrador' : 'Editor'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDateDDMMYYYY(user.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(user)}
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

          {!isLoading && users.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Mostrando {(pagination.page - 1) * pagination.pageSize + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPreviousPage}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-600">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => prev + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

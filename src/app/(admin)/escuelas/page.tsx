'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit } from 'lucide-react';

interface School {
  id: string;
  name: string;
  code: string;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/schools');
      const data = await res.json();
      setSchools(data);
    } catch (err) {
      console.error('Error fetching schools:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingId ? `/api/admin/schools/${editingId}` : '/api/admin/schools';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchSchools();
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', code: '' });
      }
    } catch (err) {
      console.error('Error saving school:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (school: School) => {
    setEditingId(school.id);
    setFormData({ name: school.name, code: school.code });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta escuela?')) return;

    try {
      await fetch(`/api/admin/schools/${id}`, { method: 'DELETE' });
      fetchSchools();
    } catch (err) {
      console.error('Error deleting school:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Escuelas</h1>
          <p className="text-gray-600">Gestiona las escuelas participantes</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', code: '' }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Escuela
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Escuela' : 'Nueva Escuela'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Escuela Primaria José Martí"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="EPMJ-001"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {schools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No hay escuelas registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <Card key={school.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{school.name}</h3>
                    <p className="text-sm text-gray-500">Código: {school.code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(school)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(school.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

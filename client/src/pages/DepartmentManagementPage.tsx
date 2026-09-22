import React, { useEffect, useState } from 'react';
import { Building2, Edit2, Plus, Trash2, Users } from 'lucide-react';
import { Modal } from '../components/Modal';
import { api } from '../services/api';

interface Department {
  id: number;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  staff_count: number;
}

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: 1, name: 'IT Support', description: 'Computers, Wi-Fi, networks, software, and laboratory systems', status: 'ACTIVE', staff_count: 1 },
  { id: 2, name: 'Electrical', description: 'Power lines, generators, lights, switches, and wiring', status: 'ACTIVE', staff_count: 1 },
  { id: 3, name: 'Maintenance', description: 'Plumbing, carpentry, masonry, painting, and structural repairs', status: 'ACTIVE', staff_count: 1 },
  { id: 4, name: 'Security', description: 'Campus guards, gate management, CCTV, and safety hazards', status: 'ACTIVE', staff_count: 1 },
  { id: 5, name: 'Housekeeping', description: 'Cleaning, sanitation, waste disposal, and hygiene', status: 'ACTIVE', staff_count: 1 },
  { id: 6, name: 'Transport', description: 'Buses, parking, vehicles, and shuttle services', status: 'ACTIVE', staff_count: 0 },
  { id: 7, name: 'Hostel', description: 'Dormitory amenities, room furniture, and hostel facilities', status: 'ACTIVE', staff_count: 0 },
  { id: 8, name: 'Administration', description: 'Academic records, billing, documentation, and office services', status: 'ACTIVE', staff_count: 0 },
];

export const DepartmentManagementPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await api.get<{ departments: Department[] }>('/departments');
      if (res.departments && res.departments.length > 0) {
        setDepartments(res.departments);
      }
    } catch (err) {
      console.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setIsOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditId(dept.id);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/departments/${editId}`, { name, description, status: 'ACTIVE' });
      } else {
        await api.post('/departments', { name, description });
      }
      setIsOpen(false);
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete/disable this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Department Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create and organize functional service departments and assigned staff count.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-slate-500">Loading departments...</div>
        ) : (
          departments.map((d) => (
            <div
              key={d.id}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    {d.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {d.staff_count} Staff
                  </span>
                </div>
                {d.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {d.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  d.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {d.status}
                </span>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenEdit(d)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Edit Department' : 'Add Department'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IT Support, Electrical"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Scope of work..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-xs"
            >
              {editId ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

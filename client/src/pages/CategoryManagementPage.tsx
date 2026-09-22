import React, { useEffect, useState } from 'react';
import { Clock, Edit2, FileSpreadsheet, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../components/Modal';
import { api } from '../services/api';

interface Category {
  id: number;
  name: string;
  description?: string;
  default_sla: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Internet / Network', description: 'Wi-Fi connectivity, LAN ports, and router outages', default_sla: 12, status: 'ACTIVE' },
  { id: 2, name: 'Electrical', description: 'Short circuits, power trips, broken lights, and socket issues', default_sla: 12, status: 'ACTIVE' },
  { id: 3, name: 'Plumbing', description: 'Water leaks, clogged drains, tap repairs, and tank overflow', default_sla: 24, status: 'ACTIVE' },
  { id: 4, name: 'Infrastructure', description: 'Cracked walls, broken furniture, doors, windows, and ceiling', default_sla: 48, status: 'ACTIVE' },
  { id: 5, name: 'Cleaning & Sanitation', description: 'Unclean washrooms, garbage accumulation, and pest control', default_sla: 24, status: 'ACTIVE' },
  { id: 6, name: 'Security & Safety', description: 'Unauthorized entry, missing equipment, broken gates, hazards', default_sla: 4, status: 'ACTIVE' },
  { id: 7, name: 'Canteen / Food', description: 'Food quality, hygiene in mess, drinking water dispensers', default_sla: 12, status: 'ACTIVE' },
  { id: 8, name: 'Transportation', description: 'Bus delays, parking space blockage, shuttle service issues', default_sla: 24, status: 'ACTIVE' },
  { id: 9, name: 'Hostel / Accommodation', description: 'Bed allotment, hot water availability, quiet hours compliance', default_sla: 24, status: 'ACTIVE' },
  { id: 10, name: 'Academic & Administration', description: 'Classroom projectors, fee receipts, certificate issuance', default_sla: 48, status: 'ACTIVE' },
];

export const CategoryManagementPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultSla, setDefaultSla] = useState(24);

  const fetchCategories = async () => {
    try {
      const res = await api.get<{ categories: Category[] }>('/categories');
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditId(null);
    setName('');
    setDescription('');
    setDefaultSla(24);
    setIsOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setDefaultSla(cat.default_sla);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/categories/${editId}`, {
          name,
          description,
          default_sla: defaultSla,
          status: 'ACTIVE',
        });
      } else {
        await api.post('/categories', {
          name,
          description,
          default_sla: defaultSla,
        });
      }
      setIsOpen(false);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete/disable this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Category & SLA Configuration
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define complaint categories and set target Service Level Agreement (SLA) resolution hours.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading categories...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-3.5 pl-6">Category Name</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Default SLA Target</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 pl-6 font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {c.description || '-'}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                        <Clock className="w-3.5 h-3.5" />
                        {c.default_sla} hours
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit Category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editId ? 'Edit Category' : 'Add New Category'}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electrical, Internet / Network"
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
              placeholder="Brief scope of issues handled..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target SLA Duration (in Hours)
            </label>
            <input
              type="number"
              required
              min={1}
              max={720}
              value={defaultSla}
              onChange={(e) => setDefaultSla(Number(e.target.value))}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-mono font-bold"
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
              {editId ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

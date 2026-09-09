'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Edit2, Loader2, Search, Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Field, IrrigationMethod, WaterSource } from '@/types';
import Link from 'next/link';
import { getStateNames, getDistrictsByState } from '@/data/indiaLocations';

const SOIL_TYPES = ['Clay Loam', 'Sandy', 'Silty', 'Black Soil', 'Red Soil', 'Loamy', 'Clay', 'Sandy Loam'];
const IRRIGATION_METHODS: IrrigationMethod[] = ['DRIP', 'SPRINKLER', 'FLOOD', 'FURROW', 'SUBSURFACE', 'RAIN_FED'];
const WATER_SOURCES: WaterSource[] = ['BOREWELL', 'CANAL', 'RIVER', 'POND', 'RAINWATER', 'MUNICIPALITY'];

interface FieldForm {
  name: string; area: string; areaUnit: string; state: string; district: string;
  village: string; location: string; latitude: string; longitude: string;
  soilType: string; irrigationMethod: string; waterSource: string; description: string;
}

const emptyForm: FieldForm = {
  name: '', area: '', areaUnit: 'acres', state: '', district: '', village: '',
  location: '', latitude: '', longitude: '', soilType: '', irrigationMethod: '',
  waterSource: '', description: '',
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

export default function FieldsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editField, setEditField] = useState<Field | null>(null);
  const [form, setForm] = useState<FieldForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fields', page, search],
    queryFn: async () => {
      const res = await api.get('/fields', { params: { page, limit: 12, search: search || undefined } });
      return res.data as { data: Field[]; meta: { total: number; totalPages: number } };
    },
  });

  const fields = data?.data ?? [];
  const meta = data?.meta;

  const set = (k: keyof FieldForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const buildPayload = () => ({
    name: form.name, area: parseFloat(form.area), areaUnit: form.areaUnit,
    state: form.state || undefined, district: form.district || undefined,
    village: form.village || undefined, location: form.location || undefined,
    latitude: form.latitude ? parseFloat(form.latitude) : undefined,
    longitude: form.longitude ? parseFloat(form.longitude) : undefined,
    soilType: form.soilType || undefined, irrigationMethod: form.irrigationMethod || undefined,
    waterSource: form.waterSource || undefined, description: form.description || undefined,
  });

  const createMutation = useMutation({
    mutationFn: (payload: object) => api.post('/fields', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fields'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Field created!'); closeModal(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create field'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) => api.put(`/fields/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fields'] }); toast.success('Field updated!'); closeModal(); },
    onError: () => toast.error('Failed to update field'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/fields/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fields'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Field deleted'); },
    onError: () => toast.error('Failed to delete field'),
  });

  const openCreate = () => { setEditField(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (f: Field) => {
    setEditField(f);
    setForm({ name: f.name, area: String(f.area), areaUnit: f.areaUnit ?? 'acres', state: f.state ?? '', district: f.district ?? '', village: f.village ?? '', location: f.location ?? '', latitude: f.latitude ? String(f.latitude) : '', longitude: f.longitude ? String(f.longitude) : '', soilType: f.soilType ?? '', irrigationMethod: f.irrigationMethod ?? '', waterSource: f.waterSource ?? '', description: f.description ?? '' });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditField(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.area) return toast.error('Name and area are required');
    if (editField) updateMutation.mutate({ id: editField.id, payload: buildPayload() });
    else createMutation.mutate(buildPayload());
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Fields</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your farm fields · {meta?.total ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
              placeholder="Search fields..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Field</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <Card><p className="text-center text-red-500 py-10">Failed to load fields. Please try again.</p></Card>
      ) : fields.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((field) => (
              <Card key={field.id} className="hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{field.name}</h3>
                      <p className="text-xs text-gray-500">{field.area} {field.areaUnit}</p>
                    </div>
                  </div>
                  <StatusBadge status={field.status} />
                </div>

                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                  {field.state && <p>📍 {[field.village, field.district, field.state].filter(Boolean).join(', ')}</p>}
                  {field.soilType && <p>🌍 Soil: {field.soilType}</p>}
                  {field.irrigationMethod && <p>💧 Irrigation: {field.irrigationMethod.replace('_', ' ')}</p>}
                  {field.waterSource && <p>🚰 Water: {field.waterSource.replace('_', ' ')}</p>}
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="bg-green-50 dark:bg-green-900/20 text-green-700 px-2 py-0.5 rounded-full">🌾 {field._count?.crops ?? 0} crops</span>
                    <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 px-2 py-0.5 rounded-full">📡 {field._count?.sensors ?? 0} sensors</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <Link href={`/dashboard/fields/${field.id}`} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                    <Eye className="w-3 h-3" /> View
                  </Link>
                  <button onClick={() => openEdit(field)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => { if (confirm('Delete this field and all its data?')) deleteMutation.mutate(field.id); }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium ml-auto">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-500">Page {page} of {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6">
              <MapPin className="w-10 h-10 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Fields Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">Register your first farm field to start managing irrigation.</p>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Register New Field</Button>
          </div>
        </Card>
      )}

      <Modal open={showModal} title={editField ? 'Edit Field' : 'Register New Field'} onClose={closeModal} maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Field Name *</label>
              <input className={inputCls} placeholder="e.g. North Paddy Field" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className={labelCls}>Area *</label>
              <input type="number" step="0.1" min="0.1" className={inputCls} placeholder="e.g. 5.5" value={form.area} onChange={set('area')} required />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select className={inputCls} value={form.areaUnit} onChange={set('areaUnit')}>
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
                <option value="bigha">Bigha</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>State</label>
              <select
                className={inputCls}
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value, district: '' }))}>
                <option value="">Select state</option>
                {getStateNames().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>District / City</label>
              <select
                className={inputCls}
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                disabled={!form.state}>
                <option value="">{form.state ? 'Select district' : 'Select state first'}</option>
                {getDistrictsByState(form.state).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              {form.district && (
                <p className="text-xs text-green-600 mt-1">✅ Weather will be fetched for: {form.district}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Village</label>
              <input className={inputCls} placeholder="e.g. Narsampet" value={form.village} onChange={set('village')} />
            </div>
            <div>
              <label className={labelCls}>Soil Type</label>
              <select className={inputCls} value={form.soilType} onChange={set('soilType')}>
                <option value="">Select soil type</option>
                {SOIL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Irrigation Method</label>
              <select className={inputCls} value={form.irrigationMethod} onChange={set('irrigationMethod')}>
                <option value="">Select method</option>
                {IRRIGATION_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Water Source</label>
              <select className={inputCls} value={form.waterSource} onChange={set('waterSource')}>
                <option value="">Select source</option>
                {WATER_SOURCES.map(w => <option key={w} value={w}>{w.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>GPS Latitude</label>
              <input type="number" step="any" min="-90" max="90" className={inputCls} placeholder="e.g. 17.9784" value={form.latitude} onChange={set('latitude')} />
            </div>
            <div>
              <label className={labelCls}>GPS Longitude</label>
              <input type="number" step="any" min="-180" max="180" className={inputCls} placeholder="e.g. 79.5941" value={form.longitude} onChange={set('longitude')} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea rows={2} className={inputCls} placeholder="Optional notes about this field..." value={form.description} onChange={set('description')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isBusy} className="flex-1">
              {isBusy ? <span className="flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : editField ? 'Update Field' : 'Create Field'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

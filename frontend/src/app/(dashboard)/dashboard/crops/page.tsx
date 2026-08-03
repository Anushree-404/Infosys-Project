'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Leaf, Plus, Trash2, Edit2, Loader2, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Crop, Field, GrowthStage, CropStatus } from '@/types';

const GROWTH_STAGES: GrowthStage[] = ['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'FRUITING', 'MATURITY', 'HARVESTING'];
const CROP_STATUSES: CropStatus[] = ['PLANNED', 'GROWING', 'HARVESTED', 'FAILED'];

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface CropForm {
  fieldId: string; name: string; variety: string; growthStage: string;
  plantingDate: string; expectedHarvestDate: string; expectedWaterReq: string;
  currentStatus: string; notes: string;
}

const emptyForm: CropForm = {
  fieldId: '', name: '', variety: '', growthStage: 'SEEDLING',
  plantingDate: '', expectedHarvestDate: '', expectedWaterReq: '',
  currentStatus: 'GROWING', notes: '',
};

export default function CropsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editCrop, setEditCrop] = useState<Crop | null>(null);
  const [form, setForm] = useState<CropForm>(emptyForm);
  const [selectedField, setSelectedField] = useState<string>('all');

  const { data: fieldsData } = useQuery({
    queryKey: ['fields-list'],
    queryFn: async () => {
      const res = await api.get('/fields', { params: { limit: 100 } });
      return res.data.data as Field[];
    },
  });
  const fields = fieldsData ?? [];

  const { data: crops, isLoading, isError } = useQuery({
    queryKey: ['crops', selectedField],
    queryFn: async () => {
      if (selectedField === 'all') {
        const results = await Promise.all(
          fields.map(f => api.get(`/fields/${f.id}/crops`).then(r => r.data.data as Crop[]).catch(() => []))
        );
        return results.flat();
      }
      const res = await api.get(`/fields/${selectedField}/crops`);
      return res.data.data as Crop[];
    },
    enabled: fields.length > 0,
  });

  const set = (k: keyof CropForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: (payload: { fieldId: string; data: object }) =>
      api.post(`/fields/${payload.fieldId}/crops`, payload.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crops'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Crop added!'); closeModal(); },
    onError: (err: unknown) => toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add crop'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/crops/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crops'] }); toast.success('Crop updated!'); closeModal(); },
    onError: () => toast.error('Failed to update crop'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/crops/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crops'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Crop removed'); },
    onError: () => toast.error('Failed to delete crop'),
  });

  const openCreate = () => {
    setEditCrop(null);
    setForm({ ...emptyForm, fieldId: selectedField !== 'all' ? selectedField : fields[0]?.id ?? '' });
    setShowModal(true);
  };

  const openEdit = (c: Crop) => {
    setEditCrop(c);
    setForm({
      fieldId: c.fieldId, name: c.name, variety: c.variety ?? '', growthStage: c.growthStage,
      plantingDate: c.plantingDate ? c.plantingDate.split('T')[0] : '',
      expectedHarvestDate: c.expectedHarvestDate ? c.expectedHarvestDate.split('T')[0] : '',
      expectedWaterReq: c.expectedWaterReq ? String(c.expectedWaterReq) : '',
      currentStatus: c.currentStatus, notes: c.notes ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditCrop(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.fieldId) return toast.error('Crop name and field are required');
    const payload = {
      name: form.name, variety: form.variety || undefined, growthStage: form.growthStage,
      plantingDate: form.plantingDate || undefined, expectedHarvestDate: form.expectedHarvestDate || undefined,
      expectedWaterReq: form.expectedWaterReq ? parseFloat(form.expectedWaterReq) : undefined,
      currentStatus: form.currentStatus, notes: form.notes || undefined,
    };
    if (editCrop) updateMutation.mutate({ id: editCrop.id, data: payload });
    else createMutation.mutate({ fieldId: form.fieldId, data: payload });
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const displayCrops = crops ?? [];

  const growthStageColor: Record<string, string> = {
    SEEDLING: 'bg-yellow-100 text-yellow-700', VEGETATIVE: 'bg-green-100 text-green-700',
    FLOWERING: 'bg-pink-100 text-pink-700', FRUITING: 'bg-orange-100 text-orange-700',
    MATURITY: 'bg-amber-100 text-amber-700', HARVESTING: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Crop Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track crops across your fields · {displayCrops.length} total</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              value={selectedField} onChange={e => setSelectedField(e.target.value)}>
              <option value="all">All Fields</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate} disabled={fields.length === 0}>
            Add Crop
          </Button>
        </div>
      </div>

      {fields.length === 0 && (
        <Card><p className="text-center text-gray-500 py-8">You need to create a field first before adding crops.</p></Card>
      )}

      {isLoading && fields.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <Card><p className="text-center text-red-500 py-10">Failed to load crops.</p></Card>
      ) : displayCrops.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayCrops.map((crop) => (
            <Card key={crop.id} className="hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
                    <Leaf className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{crop.name}</h3>
                    {crop.variety && <p className="text-xs text-gray-500">{crop.variety}</p>}
                  </div>
                </div>
                <StatusBadge status={crop.currentStatus} />
              </div>

              <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${growthStageColor[crop.growthStage] ?? 'bg-gray-100 text-gray-600'}`}>
                    {crop.growthStage}
                  </span>
                </div>
                {crop.plantingDate && <p>🌱 Planted: {new Date(crop.plantingDate).toLocaleDateString()}</p>}
                {crop.expectedHarvestDate && <p>🌾 Harvest: {new Date(crop.expectedHarvestDate).toLocaleDateString()}</p>}
                {crop.expectedWaterReq && <p>💧 Water req: {crop.expectedWaterReq} L/day</p>}
                {crop.notes && <p className="text-xs text-gray-400 italic">{crop.notes}</p>}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => openEdit(crop)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => { if (confirm('Remove this crop?')) deleteMutation.mutate(crop.id); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium ml-auto">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : fields.length > 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6">
              <Leaf className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Crops Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">Add crops to your fields to track growth stages and water requirements.</p>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add First Crop</Button>
          </div>
        </Card>
      ) : null}

      <Modal open={showModal} title={editCrop ? 'Edit Crop' : 'Add Crop'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editCrop && (
            <div>
              <label className={labelCls}>Field *</label>
              <select className={inputCls} value={form.fieldId} onChange={set('fieldId')} required>
                <option value="">Select field</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Crop Name *</label>
              <input className={inputCls} placeholder="e.g. Rice, Wheat, Cotton" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className={labelCls}>Variety</label>
              <input className={inputCls} placeholder="e.g. Sona Masuri" value={form.variety} onChange={set('variety')} />
            </div>
            <div>
              <label className={labelCls}>Growth Stage</label>
              <select className={inputCls} value={form.growthStage} onChange={set('growthStage')}>
                {GROWTH_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.currentStatus} onChange={set('currentStatus')}>
                {CROP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Water Req (L/day)</label>
              <input type="number" step="0.1" min="0" className={inputCls} placeholder="e.g. 50" value={form.expectedWaterReq} onChange={set('expectedWaterReq')} />
            </div>
            <div>
              <label className={labelCls}>Planting Date</label>
              <input type="date" className={inputCls} value={form.plantingDate} onChange={set('plantingDate')} />
            </div>
            <div>
              <label className={labelCls}>Expected Harvest</label>
              <input type="date" className={inputCls} value={form.expectedHarvestDate} onChange={set('expectedHarvestDate')} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} className={inputCls} placeholder="Any notes about this crop..." value={form.notes} onChange={set('notes')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isBusy} className="flex-1">
              {isBusy ? <span className="flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span> : editCrop ? 'Update' : 'Add Crop'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

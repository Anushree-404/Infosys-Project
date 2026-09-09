'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Plus, Trash2, Edit2, Loader2, Activity, ChevronDown, Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import toast from 'react-hot-toast';
import type { Sensor, Field } from '@/types';
import Link from 'next/link';

// ── Farmer-friendly sensor type options ──────────────────────
const SENSOR_TYPE_OPTIONS = [
  { value: 'SOIL_MOISTURE', label: '💧 Soil Moisture Sensor', desc: 'Checks how wet/dry the soil is' },
  { value: 'TEMPERATURE',   label: '🌡️ Temperature Sensor',   desc: 'Measures air or soil temperature' },
  { value: 'HUMIDITY',      label: '💨 Air Humidity Sensor',  desc: 'Measures moisture level in air' },
  { value: 'RAINFALL',      label: '🌧️ Rainfall Sensor',      desc: 'Tracks how much rain has fallen' },
  { value: 'WATER_LEVEL',   label: '📊 Water Level Sensor',   desc: 'Checks water level in tank or pond' },
  { value: 'PH_SENSOR',     label: '⚗️ Soil pH Sensor',       desc: 'Measures if soil is acidic or alkaline' },
  { value: 'NPK_SENSOR',    label: '🧪 Soil Nutrients Sensor', desc: 'Measures nitrogen, phosphorus, potassium' },
  { value: 'FLOW_METER',    label: '🔄 Water Flow Sensor',    desc: 'Measures how much water flows in pipes' },
];

const LOCATION_OPTIONS = [
  'North corner of field',
  'South corner of field',
  'Centre of field',
  'Near water inlet',
  'Near water outlet',
  'Under crop shade',
  'Open area',
];

const sensorTypeIcon: Record<string, string> = {
  SOIL_MOISTURE: '💧', TEMPERATURE: '🌡️', HUMIDITY: '💨',
  RAINFALL: '🌧️', FLOW_METER: '🔄', PH_SENSOR: '⚗️', NPK_SENSOR: '🧪', WATER_LEVEL: '📊',
};

const getFriendlyTypeName = (type: string): string => {
  const found = SENSOR_TYPE_OPTIONS.find(o => o.value === type);
  return found ? found.label : type.replace(/_/g, ' ');
};

const getPowerLabel = (level?: number | null) => {
  if (level == null) return { text: 'Unknown', color: 'text-gray-400' };
  if (level > 60) return { text: `🔋 Good (${level}%)`, color: 'text-green-500' };
  if (level > 30) return { text: `🪫 Low (${level}%)`, color: 'text-yellow-500' };
  return { text: `⚠️ Critical (${level}%)`, color: 'text-red-500' };
};

const getStatusLabel = (status: string) => {
  const map: Record<string, { text: string; color: string }> = {
    ACTIVE:      { text: '✅ Sending Data',       color: 'bg-green-100 text-green-700' },
    INACTIVE:    { text: '⚠️ Not Sending Data',   color: 'bg-yellow-100 text-yellow-700' },
    FAULTY:      { text: '❌ Device Problem',      color: 'bg-red-100 text-red-700' },
    MAINTENANCE: { text: '🔧 Under Maintenance',  color: 'bg-blue-100 text-blue-700' },
  };
  return map[status] ?? { text: status, color: 'bg-gray-100 text-gray-600' };
};

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

// Only farmer-visible fields in the form
interface SensorForm {
  fieldId: string;
  name: string;
  type: string;
  location: string;
  installationDate: string;
}

const emptyForm: SensorForm = {
  fieldId: '', name: '', type: 'SOIL_MOISTURE', location: '', installationDate: '',
};

// Auto-generate a serial number (technician doesn't need to enter this)
const generateSerial = (type: string) =>
  `${type.slice(0, 3)}-${Date.now().toString().slice(-6)}`;

export default function SensorsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editSensor, setEditSensor] = useState<Sensor | null>(null);
  const [form, setForm] = useState<SensorForm>(emptyForm);
  const [selectedField, setSelectedField] = useState<string>('all');
  const [ingestingSensor, setIngestingSensor] = useState<string | null>(null);

  const { data: fieldsData } = useQuery({
    queryKey: ['fields-list'],
    queryFn: async () => {
      const res = await api.get('/fields', { params: { limit: 100 } });
      return res.data.data as Field[];
    },
  });
  const fields = fieldsData ?? [];

  const { data: sensors, isLoading, isError } = useQuery({
    queryKey: ['sensors', selectedField],
    queryFn: async () => {
      const params = selectedField !== 'all' ? { fieldId: selectedField } : {};
      const res = await api.get('/sensors', { params });
      return res.data.data as Sensor[];
    },
  });

  const set = (k: keyof SensorForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: object }) =>
      api.post(`/sensors/fields/${fieldId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sensor added to your field!');
      closeModal();
    },
    onError: (err: unknown) =>
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add sensor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/sensors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      toast.success('Sensor details updated!');
      closeModal();
    },
    onError: () => toast.error('Failed to update sensor'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sensors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sensor removed');
    },
    onError: () => toast.error('Failed to remove sensor'),
  });

  const ingestTest = async (sensor: Sensor) => {
    setIngestingSensor(sensor.id);
    try {
      const res = await api.post(`/sensors/fields/${sensor.fieldId}/test-data`);
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Backend returns null for duplicates (within 30s), still a success
      const count = res.data?.data?.length ?? 0;
      if (count > 0) {
        toast.success('✅ Test reading added successfully!');
      } else {
        toast.success('Reading recorded (duplicate skipped — wait 30 seconds to add another)');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not add test reading. Make sure the sensor is Active.');
    } finally {
      setIngestingSensor(null);
    }
  };

  const openCreate = () => {
    setEditSensor(null);
    setForm({ ...emptyForm, fieldId: selectedField !== 'all' ? selectedField : fields[0]?.id ?? '' });
    setShowModal(true);
  };

  const openEdit = (s: Sensor) => {
    setEditSensor(s);
    setForm({
      fieldId: s.fieldId,
      name: s.name,
      type: s.type,
      location: s.location ?? '',
      installationDate: s.installationDate ? s.installationDate.split('T')[0] : '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditSensor(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.fieldId) return toast.error('Please fill in all required fields');

    const payload = {
      name: form.name,
      type: form.type,
      location: form.location || undefined,
      installationDate: form.installationDate || undefined,
      // Auto-generate serial number so farmer doesn't need to enter it
      ...(!editSensor ? { serialNumber: generateSerial(form.type) } : {}),
    };

    if (editSensor) {
      updateMutation.mutate({ id: editSensor.id, data: payload });
    } else {
      createMutation.mutate({ fieldId: form.fieldId, data: payload });
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const displaySensors = sensors ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Sensors</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor devices placed in your fields · {displaySensors.length} sensors
          </p>
        </div>
        <div className="flex gap-2">
          {fields.length > 1 && (
            <div className="relative">
              <select
                className="pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                value={selectedField} onChange={e => setSelectedField(e.target.value)}>
                <option value="all">All Fields</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate} disabled={fields.length === 0}>
            Add Sensor
          </Button>
        </div>
      </div>

      {fields.length === 0 && (
        <Card>
          <p className="text-center text-gray-500 py-8">
            Please <Link href="/dashboard/fields" className="text-primary-600 underline font-medium">create a field</Link> first before adding sensors.
          </p>
        </Card>
      )}

      {/* Sensor cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <Card><p className="text-center text-red-500 py-10">Failed to load sensors.</p></Card>
      ) : displaySensors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySensors.map((sensor) => {
            const statusInfo = getStatusLabel(sensor.status);
            return (
              <Card key={sensor.id} className="hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0 text-2xl">
                      {sensorTypeIcon[sensor.type] ?? '📡'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{sensor.name}</h3>
                      <p className="text-xs text-gray-500">{getFriendlyTypeName(sensor.type)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm mb-4 flex-1">
                  {sensor.field && (
                    <p className="text-gray-600 dark:text-gray-400">🌾 Field: <strong>{sensor.field.name}</strong></p>
                  )}
                  {sensor.location && (
                    <p className="text-gray-600 dark:text-gray-400">📍 Placed at: {sensor.location}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {sensor.lastReading
                      ? `Last reading: ${new Date(sensor.lastReading).toLocaleString()}`
                      : 'No readings yet — press "Test Reading"'}
                  </p>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex-wrap">
                  <Link href={`/dashboard/sensors/${sensor.id}`}
                    className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                    <Eye className="w-3 h-3" /> View Data
                  </Link>
                  <button onClick={() => ingestTest(sensor)} disabled={ingestingSensor === sensor.id}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-50">
                    {ingestingSensor === sensor.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                    Test Reading
                  </button>
                  <button onClick={() => openEdit(sensor)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => { if (confirm('Remove this sensor from your field?')) deleteMutation.mutate(sensor.id); }}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium ml-auto">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : fields.length > 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6">
              <Radio className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Sensors Yet</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Add a sensor device to your field to start monitoring soil moisture, temperature, and rainfall automatically.
            </p>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add First Sensor</Button>
          </div>
        </Card>
      ) : null}

      {/* Add / Edit Modal — farmer friendly */}
      <Modal open={showModal} title={editSensor ? 'Edit Sensor Details' : 'Add Sensor to Field'} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Field selection — only when creating */}
          {!editSensor && (
            <div>
              <label className={labelCls}>Which field is this sensor in? *</label>
              <select className={inputCls} value={form.fieldId} onChange={set('fieldId')} required>
                <option value="">Select your field</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {/* Sensor name */}
          <div>
            <label className={labelCls}>Give this sensor a name *</label>
            <input
              className={inputCls}
              placeholder="e.g. Main field moisture sensor, Corner temperature device"
              value={form.name}
              onChange={set('name')}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Use a name you'll easily remember</p>
          </div>

          {/* What does it measure */}
          <div>
            <label className={labelCls}>What does this device measure? *</label>
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {SENSOR_TYPE_OPTIONS.map(opt => (
                <label key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    form.type === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-primary-300'
                  }`}>
                  <input type="radio" name="sensorType" value={opt.value}
                    checked={form.type === opt.value}
                    onChange={set('type')}
                    className="mt-0.5 accent-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Where in the field */}
          <div>
            <label className={labelCls}>Where in the field is it placed?</label>
            <select className={inputCls} value={form.location}
              onChange={set('location')}>
              <option value="">Select location (optional)</option>
              {LOCATION_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input
              className={`${inputCls} mt-2`}
              placeholder="Or type your own: e.g. Near the mango trees"
              value={form.location}
              onChange={set('location')}
            />
          </div>

          {/* Installation date */}
          <div>
            <label className={labelCls}>When was it installed?</label>
            <input type="date" className={inputCls} value={form.installationDate} onChange={set('installationDate')} />
            <p className="text-xs text-gray-400 mt-1">Optional — helps track device age</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isBusy} className="flex-1">
              {isBusy
                ? <span className="flex items-center gap-2 justify-center"><Loader2 className="w-4 h-4 animate-spin" />Saving...</span>
                : editSensor ? 'Save Changes' : 'Add Sensor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

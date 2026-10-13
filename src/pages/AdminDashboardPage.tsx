import React, { useState, useEffect } from 'react';
import { Appointment, AdminMetrics, Doctor } from '../types/index.ts';
import { adminApi, doctorApi } from '../services/api.ts';
import { RefreshCw, Search, Plus, Loader2, AlertCircle, Check, X, ShieldCheck, Building2, IndianRupee } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('General Medicine');
  const [newDoctorExp, setNewDoctorExp] = useState(8);
  const [newDoctorFee, setNewDoctorFee] = useState(800);
  const [newDoctorBio, setNewDoctorBio] = useState('');
  const [newDoctorLocation, setNewDoctorLocation] = useState('CareFlow Clinic, Indiranagar, Bengaluru');
  const [submittingDoctor, setSubmittingDoctor] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, apptsRes, docsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.listAppointments({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search.trim() || undefined,
        }),
        doctorApi.list(),
      ]);

      setMetrics(statsRes.stats);
      setAppointments(apptsRes.appointments);
      setDoctors(docsRes.doctors);
    } catch (err: any) {
      setError(err.message || 'Failed to load clinic administrator records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAdminData();
  };

  const handleStatusChange = async (id: number, newStatus: 'booked' | 'completed' | 'cancelled' | 'no_show') => {
    setUpdatingId(id);
    setActionNotice(null);
    try {
      await adminApi.updateStatus(id, newStatus);
      setActionNotice(`Appointment status transitioned to '${newStatus}'.`);
      await loadAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleDoctor = async (doctorId: number, currentActive: boolean) => {
    try {
      await adminApi.toggleDoctor(doctorId, !currentActive);
      setActionNotice(`Physician ${!currentActive ? 'activated' : 'deactivated'}.`);
      await loadAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDoctor(true);
    setError(null);
    try {
      await adminApi.createDoctor({
        name: newDoctorName,
        specialty: newDoctorSpecialty,
        experienceYears: Number(newDoctorExp),
        consultationFee: Number(newDoctorFee),
        bio: newDoctorBio,
        location: newDoctorLocation,
        avatarUrl: '/src/assets/images/dr_vikram_rao_1791877161244.jpg',
      });
      setShowAddDoctorModal(false);
      setActionNotice('New doctor added to OPD schedule roster.');
      setNewDoctorName('');
      setNewDoctorBio('');
      await loadAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to add physician');
    } finally {
      setSubmittingDoctor(false);
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Title Bar */}
      <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs text-emerald-800 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Hospital Administration</span> <span aria-hidden="true" className="text-emerald-300">·</span> <span>Medical Director Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950 font-serif tracking-tight">
            Hospital OPD Operations Ledger
          </h1>
          <p className="text-xs text-emerald-900/60 mt-1">
            Real-time outpatient consultation flow, doctor room allocation, and transactional status lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAdminData}
            className="p-2 text-emerald-800/60 hover:text-emerald-950 hover:bg-emerald-50 rounded-xl transition border border-transparent hover:border-[#E8E4DA]"
            title="Refresh clinical data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-900' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddDoctorModal(true)}
            className="py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Specialist
          </button>
        </div>
      </div>

      {/* Action Notice */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-950 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">Today's OPD Visits</span>
            <span className="text-2xl font-bold text-emerald-950 font-mono block mt-1">{metrics.todayAppointments}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">Total Consultations</span>
            <span className="text-2xl font-bold text-emerald-950 font-mono block mt-1">{metrics.totalAppointments}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">Active Specialists</span>
            <span className="text-2xl font-bold text-emerald-950 font-mono block mt-1">{metrics.activeDoctors}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-xs">
            <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">Registered Patients</span>
            <span className="text-2xl font-bold text-emerald-950 font-mono block mt-1">{metrics.totalPatients}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E8E4DA] p-4 shadow-xs col-span-2 lg:col-span-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">Slot Release Rate</span>
            <span className="text-2xl font-bold text-emerald-950 font-mono block mt-1">{metrics.cancellationRatePercent}%</span>
          </div>
        </div>
      )}

      {/* Master Appointments Table */}
      <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-emerald-950 font-serif">OPD Consultation Tokens Ledger</h2>
            <p className="text-xs text-emerald-900/60">Live status machine: Booked → Completed / No-Show / Liberated</p>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-emerald-700/60 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient / token..."
                className="pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-[#E5E1D7] rounded-xl text-xs text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800"
              />
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-[#FAF9F5] border border-[#E5E1D7] rounded-xl text-xs font-semibold text-emerald-950 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="booked">Booked (Active)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-emerald-800/60 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-800" />
            <span className="text-xs">Querying appointment records...</span>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center text-xs text-emerald-900/60 border border-dashed border-[#E8E4DA] rounded-2xl">
            No appointment records found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F5] text-emerald-900/70 uppercase tracking-wider font-semibold border-b border-[#E8E4DA] text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Token Ref</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Consultant</th>
                  <th className="py-2.5 px-3">Date & Slot</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">State Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE1]">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-[#FBFBF8] transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-950 tabular-nums">
                      {appt.booking_reference}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-emerald-950">{appt.patient_name}</div>
                      <div className="text-[11px] text-emerald-900/50">{appt.patient_email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-emerald-950">{appt.doctor_name}</div>
                      <div className="text-[11px] text-emerald-900/60">{appt.doctor_specialty}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <div className="font-medium text-emerald-950">{appt.appointment_date}</div>
                      <div className="text-[11px] text-emerald-900/60">{formatTimeDisplay(appt.start_time)}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs font-bold ${
                        appt.status === 'booked'
                          ? 'text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'
                          : appt.status === 'completed'
                          ? 'text-emerald-950 bg-emerald-100/60 px-2 py-0.5 rounded'
                          : appt.status === 'cancelled'
                          ? 'text-gray-400 line-through'
                          : 'text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {appt.status === 'booked' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            disabled={updatingId === appt.id}
                            onClick={() => handleStatusChange(appt.id, 'completed')}
                            className="px-2 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                            title="Complete consultation"
                          >
                            Complete
                          </button>
                          <button
                            disabled={updatingId === appt.id}
                            onClick={() => handleStatusChange(appt.id, 'no_show')}
                            className="px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                            title="Mark no-show"
                          >
                            No-Show
                          </button>
                          <button
                            disabled={updatingId === appt.id}
                            onClick={() => handleStatusChange(appt.id, 'cancelled')}
                            className="px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                            title="Cancel and liberate slot"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-900/40 font-medium italic">
                          Locked terminal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Physician Roster Management */}
      <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-emerald-950 font-serif">Hospital Specialist Roster</h2>
          <p className="text-xs text-emerald-900/60">Toggle active OPD booking availability per physician</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctors.map((doc) => (
            <div key={doc.id} className="p-3.5 bg-[#FAF9F5] border border-[#E8E4DA] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={doc.avatar_url || '/src/assets/images/dr_vikram_rao_1791877161244.jpg'}
                  alt={doc.name}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover border border-[#E2DDD2] shrink-0"
                />
                <div className="min-w-0 text-xs">
                  <h4 className="font-bold text-emerald-950 truncate font-serif">{doc.name}</h4>
                  <p className="text-emerald-900/60">{doc.specialty} · ₹{Number(doc.consultation_fee).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <button
                onClick={() => handleToggleDoctor(doc.id, doc.is_active)}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition border ${
                  doc.is_active
                    ? 'text-emerald-900 bg-emerald-100/60 border-emerald-300 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300'
                    : 'text-gray-500 bg-gray-100 border-gray-300 hover:bg-emerald-100 hover:text-emerald-900'
                }`}
              >
                {doc.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Physician Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-3xl max-w-md w-full p-6 border border-[#E8E4DA] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-3">
              <h3 className="font-bold text-emerald-950 text-base font-serif">Add Doctor to OPD Roster</h3>
              <button onClick={() => setShowAddDoctorModal(false)} className="text-emerald-800/60 hover:text-emerald-950">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-emerald-950 mb-1">Doctor Name & Qualifications</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Dr. Kavitha Menon, MBBS, MD"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-950 mb-1">Specialty</label>
                  <select
                    value={newDoctorSpecialty}
                    onChange={(e) => setNewDoctorSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="General Medicine">General Medicine</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-emerald-950 mb-1">Fee in INR (₹)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={newDoctorFee}
                    onChange={(e) => setNewDoctorFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-emerald-950 mb-1">Clinical Wing / Hospital Branch</label>
                <input
                  type="text"
                  value={newDoctorLocation}
                  onChange={(e) => setNewDoctorLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-950 mb-1">Clinical Bio & Background</label>
                <textarea
                  rows={2}
                  value={newDoctorBio}
                  onChange={(e) => setNewDoctorBio(e.target.value)}
                  placeholder="Specialization, fellowships, teaching hospital..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-emerald-950 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="py-2 px-3 font-semibold text-emerald-900/60 hover:text-emerald-950"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDoctor}
                  className="py-2 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-bold rounded-xl transition"
                >
                  {submittingDoctor ? 'Creating...' : 'Add to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

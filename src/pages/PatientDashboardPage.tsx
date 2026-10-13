import React, { useState, useEffect } from 'react';
import { Appointment } from '../types/index.ts';
import { appointmentApi } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Calendar, Clock, AlertTriangle, RefreshCw, Loader2, ArrowRight, ShieldCheck, Ticket, QrCode } from 'lucide-react';

interface PatientDashboardPageProps {
  onFindDoctors: () => void;
}

export const PatientDashboardPage: React.FC<PatientDashboardPageProps> = ({ onFindDoctors }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'upcoming' | 'history'>('upcoming');
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentApi.listMine();
      setAppointments(data.appointments);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancelModalAppt) return;
    setCancellingId(cancelModalAppt.id);
    setStatusMessage(null);
    try {
      await appointmentApi.cancel(cancelModalAppt.id);
      setStatusMessage(`OPD Token #${cancelModalAppt.booking_reference} has been cancelled and slot released.`);
      setCancelModalAppt(null);
      await fetchAppointments();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'booked' && a.appointment_date >= todayStr
  );

  const historyAppointments = appointments.filter(
    (a) => a.status !== 'booked' || a.appointment_date < todayStr
  );

  const displayedList = filterTab === 'upcoming' ? upcomingAppointments : historyAppointments;

  const renderStatus = (status: string) => {
    switch (status) {
      case 'booked':
        return <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Confirmed OPD Token</span>;
      case 'completed':
        return <span className="text-xs font-semibold text-emerald-950 bg-emerald-100/60 px-2 py-0.5 rounded-md">Completed Consultation</span>;
      case 'cancelled':
        return <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md line-through">Slot Liberated</span>;
      default:
        return <span className="text-xs font-semibold text-emerald-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-[#E8E4DA] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="text-xs text-emerald-800 font-semibold mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Patient Account</span> <span aria-hidden="true" className="text-emerald-300">·</span> <span>{user?.email}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-950 font-serif tracking-tight">
            My Consultations & Digital OPD Passes
          </h1>
          <p className="text-xs text-emerald-900/60 mt-1">
            Display your confirmed OPD token pass at hospital reception for zero-wait registration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAppointments}
            className="p-2 text-emerald-800/60 hover:text-emerald-950 hover:bg-emerald-50 rounded-xl transition border border-transparent hover:border-[#E8E4DA]"
            title="Refresh appointments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-900' : ''}`} />
          </button>
          <button
            onClick={onFindDoctors}
            className="py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            Book OPD Slot
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <span>{statusMessage}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-950 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E4DA] pb-3">
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filterTab === 'upcoming'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-emerald-900/70 hover:text-emerald-950 hover:bg-emerald-100/50'
          }`}
        >
          Active Passes ({upcomingAppointments.length})
        </button>

        <button
          onClick={() => setFilterTab('history')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filterTab === 'history'
              ? 'bg-emerald-900 text-white shadow-xs'
              : 'text-emerald-900/70 hover:text-emerald-950 hover:bg-emerald-100/50'
          }`}
        >
          Past & Cancelled ({historyAppointments.length})
        </button>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="py-16 text-center text-emerald-800/60 flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-800" />
          <span className="text-xs font-medium">Retrieving OPD tokens...</span>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-[#E8E4DA] p-12 text-center space-y-3">
          <Ticket className="w-8 h-8 text-emerald-800/40 mx-auto" />
          <h3 className="text-base font-bold text-emerald-950 font-serif">
            No {filterTab === 'upcoming' ? 'Active' : 'Past'} OPD Passes
          </h3>
          <p className="text-xs text-emerald-900/60 max-w-sm mx-auto">
            {filterTab === 'upcoming'
              ? "You do not have any active appointments scheduled. Reserve an available OPD slot with our specialists."
              : 'Past consultations and cancelled token records will appear here.'}
          </p>
          {filterTab === 'upcoming' && (
            <button
              onClick={onFindDoctors}
              className="py-2 px-4 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 shadow-xs"
            >
              Browse Specialists
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map((appt) => (
            <article
              key={appt.id}
              className="bg-white rounded-2xl border border-[#E8E4DA] p-5 shadow-xs hover:border-emerald-800/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-emerald-50 border border-emerald-100 shrink-0">
                  <img
                    src={appt.doctor_avatar || '/src/assets/images/dr_ananya_sharma_1791877160992.jpg'}
                    alt={appt.doctor_name || 'Doctor'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1 min-w-0 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderStatus(appt.status)}
                    <span className="font-mono text-emerald-900 font-bold bg-[#F8F7F2] px-2 py-0.5 rounded border border-[#E8E4DA]">
                      Token: {appt.booking_reference}
                    </span>
                  </div>

                  <h3 className="font-bold text-emerald-950 text-base font-serif truncate">
                    {appt.doctor_name}
                  </h3>

                  <p className="text-emerald-900/70">
                    {appt.doctor_specialty} <span aria-hidden="true" className="text-emerald-300">·</span> {appt.clinic_location || 'CareFlow Outpatient Pavilion'}
                  </p>
                  
                  {appt.reason && (
                    <p className="text-emerald-900/50 italic mt-0.5 line-clamp-1">
                      "{appt.reason}"
                    </p>
                  )}
                </div>
              </div>

              {/* Date & Action */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#F0ECE1] gap-2.5">
                <div className="text-left sm:text-right text-xs">
                  <div className="font-bold text-emerald-950 font-mono text-sm">
                    {appt.appointment_date}
                  </div>
                  <div className="text-emerald-900/70 font-mono">
                    {formatTimeDisplay(appt.start_time)} – {formatTimeDisplay(appt.end_time)}
                  </div>
                </div>

                {appt.status === 'booked' && (
                  <button
                    onClick={() => setCancelModalAppt(appt)}
                    className="py-1 px-3 text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                  >
                    Release Slot
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Cancellation Dialog */}
      {cancelModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-xs">
          <div className="bg-[#FCFBF8] rounded-3xl max-w-sm w-full p-6 border border-[#E8E4DA] shadow-2xl space-y-4">
            <div className="space-y-1">
              <h3 className="font-bold text-emerald-950 text-base font-serif">Release OPD Slot Token?</h3>
              <p className="text-xs text-emerald-950/70 leading-relaxed">
                Cancelling OPD token #{cancelModalAppt.booking_reference} with <strong>{cancelModalAppt.doctor_name}</strong> will
                immediately release this slot for other waiting patients.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCancelModalAppt(null)}
                disabled={cancellingId !== null}
                className="flex-1 py-2 text-xs font-bold text-emerald-900/70 hover:text-emerald-950 transition"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancellingId !== null}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {cancellingId !== null ? 'Releasing...' : 'Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

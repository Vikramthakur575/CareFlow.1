import React, { useState, useEffect } from 'react';
import { Doctor, TimeSlot, Appointment } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { doctorApi, appointmentApi } from '../services/api.ts';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, Loader2, ArrowRight, Printer, Building2, QrCode, MessageSquare, ShieldCheck } from 'lucide-react';

interface BookingModalProps {
  doctor: Doctor;
  onClose: () => void;
  onBookingSuccess: (appointment: Appointment) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  doctor,
  onClose,
  onBookingSuccess,
  onOpenAuth,
}) => {
  const { user, quickDemoLogin } = useAuth();

  const getDefaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(getDefaultDate());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('General OPD Consultation');
  const [abhaId, setAbhaId] = useState<string>('');
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [timeOfDayFilter, setTimeOfDayFilter] = useState<'all' | 'morning' | 'evening'>('all');

  useEffect(() => {
    let isMounted = true;
    async function fetchSlots() {
      if (!selectedDate) return;
      setLoadingSlots(true);
      setErrorMessage(null);
      setSelectedSlot(null);

      try {
        const data = await doctorApi.getSlots(doctor.id, selectedDate);
        if (isMounted) {
          setSlots(data.slots);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to fetch doctor OPD hours for this date.');
          setSlots([]);
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [doctor.id, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setErrorMessage('Please select an available OPD time slot.');
      return;
    }

    if (!user) {
      setErrorMessage('Patient login required. Please sign in or use 1-click Demo Patient.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const fullReason = abhaId ? `${reason} (ABHA: ${abhaId})` : reason;
      const res = await appointmentApi.create({
        doctorId: doctor.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        reason: fullReason,
      });

      setConfirmedAppointment(res.appointment);
      onBookingSuccess(res.appointment);
    } catch (err: any) {
      setErrorMessage(err.message || 'Slot reservation conflict. This OPD slot was just reserved by another patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeDisplay = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const filteredSlots = slots.filter((s) => {
    if (timeOfDayFilter === 'all') return true;
    const h = parseInt(s.startTime.split(':')[0], 10);
    if (timeOfDayFilter === 'morning') return h < 13;
    if (timeOfDayFilter === 'evening') return h >= 13;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-emerald-950/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FCFBF8] rounded-3xl max-w-lg w-full border border-[#E8E4DA] shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#F7F5EE] border-b border-[#E8E4DA] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={doctor.avatar_url || '/src/assets/images/dr_ananya_sharma_1791877160992.jpg'}
              alt={doctor.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-2xl object-cover border border-[#E2DDD2]"
            />
            <div>
              <h2 className="font-bold text-emerald-950 text-sm font-serif">{doctor.name}</h2>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold">
                <span>{doctor.specialty}</span>
                <span aria-hidden="true" className="text-emerald-300">·</span>
                <span className="tabular-nums font-mono">₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-800/60 hover:text-emerald-950 hover:bg-emerald-100/60 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmed State View - Digital OPD Slip */}
        {confirmedAppointment ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-emerald-950 font-serif">OPD Consultation Confirmed</h3>
              <p className="text-xs text-emerald-900/60">
                Your hospital visit token is booked with zero counter delay.
              </p>
            </div>

            {/* Indian Digital OPD Token Slip */}
            <div className="p-4 bg-white rounded-2xl border border-[#E5E1D7] text-left space-y-3 text-xs shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">OPD Token Number</span>
                  <span className="font-mono font-bold text-emerald-950 text-base tabular-nums">{confirmedAppointment.booking_reference}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-800/60 tracking-wider block">OPD Cabin</span>
                  <span className="font-bold text-emerald-900">Room 04 · Specialist Wing</span>
                </div>
              </div>

              <div className="space-y-1.5 py-1 border-b border-[#F0ECE1]">
                <div className="flex justify-between">
                  <span className="text-emerald-900/60">Senior Consultant:</span>
                  <span className="font-bold text-emerald-950">{doctor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900/60">Hospital Branch:</span>
                  <span className="font-medium text-emerald-900 truncate max-w-[240px]">{doctor.location}</span>
                </div>
              </div>

              <div className="space-y-1.5 py-1 border-b border-[#F0ECE1]">
                <div className="flex justify-between">
                  <span className="text-emerald-900/60">Appointment Date:</span>
                  <span className="font-bold text-emerald-950 tabular-nums">{confirmedAppointment.appointment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-900/60">Consultation Slot:</span>
                  <span className="font-mono font-bold text-emerald-950 tabular-nums">
                    {formatTimeDisplay(confirmedAppointment.start_time)} – {formatTimeDisplay(confirmedAppointment.end_time)}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px]">
                <span className="text-emerald-900/60">Consultation Fee:</span>
                <span className="font-bold text-emerald-950 font-mono text-xs">₹{Number(doctor.consultation_fee).toLocaleString('en-IN')} (Pay at Desk / UPI)</span>
              </div>

              {sendWhatsApp && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-[11px] text-emerald-900">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>WhatsApp digital entry pass & barcode dispatched to patient mobile number.</span>
                </div>
              )}

              <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 leading-tight">
                <strong>Hospital Guideline:</strong> Please report at the OPD nursing station 15 minutes prior for vitals check (BP, Pulse, Temperature).
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-emerald-900 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition"
              >
                Close & View In My Consultations
              </button>
            </div>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Notice / Conflict Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Booking Conflict</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div>
              <label className="block text-xs font-bold text-emerald-950 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Consultation Calendar Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E1D7] rounded-xl text-xs sm:text-sm font-medium text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
              />
            </div>

            {/* Time Slot Selection with Morning/Evening OPD Segmentation */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-700" />
                  Select OPD Slot
                </span>
                {slots.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('all')}
                      className={`px-2 py-0.5 rounded-lg transition ${timeOfDayFilter === 'all' ? 'bg-emerald-900 font-bold text-white' : 'text-emerald-800/70 hover:bg-emerald-100/50'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('morning')}
                      className={`px-2 py-0.5 rounded-lg transition ${timeOfDayFilter === 'morning' ? 'bg-emerald-900 font-bold text-white' : 'text-emerald-800/70 hover:bg-emerald-100/50'}`}
                    >
                      Morning OPD (9–1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeOfDayFilter('evening')}
                      className={`px-2 py-0.5 rounded-lg transition ${timeOfDayFilter === 'evening' ? 'bg-emerald-900 font-bold text-white' : 'text-emerald-800/70 hover:bg-emerald-100/50'}`}
                    >
                      Evening OPD (4:30–7:30)
                    </button>
                  </div>
                )}
              </div>

              {loadingSlots ? (
                <div className="py-8 flex flex-col items-center justify-center text-emerald-800/60 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-800" />
                  <span className="text-xs">Querying doctor OPD schedule ledger...</span>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="p-4 bg-white border border-dashed border-[#E5E1D7] rounded-xl text-center text-xs text-emerald-900/60">
                  Doctor is not scheduled on this calendar day. Please select another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1.5 bg-white border border-[#E5E1D7] rounded-xl">
                  {filteredSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`py-2 px-1.5 rounded-lg text-xs font-mono tabular-nums text-center transition flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-900 text-white font-bold ring-1 ring-emerald-950 shadow-xs'
                            : slot.isAvailable
                            ? 'bg-[#F9F8F5] hover:bg-emerald-50 text-emerald-950 border border-[#E8E4DA]'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 line-through opacity-60'
                        }`}
                      >
                        <span>{formatTimeDisplay(slot.startTime)}</span>
                        {!slot.isAvailable && (
                          <span className="text-[9px] uppercase tracking-normal no-underline font-sans font-semibold mt-0.5">
                            {slot.unavailableReason === 'booked' ? 'Reserved' : 'Past'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visit Reason & ABHA Health ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  Reason for Consultation
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Blood pressure check, skin allergy..."
                  className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-xs text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  ABHA Health ID (Optional)
                </label>
                <input
                  type="text"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="14-digit ABHA or mobile"
                  className="w-full px-3 py-2 bg-white border border-[#E5E1D7] rounded-xl text-xs text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-800 transition"
                />
              </div>
            </div>

            {/* WhatsApp notification check */}
            <div className="flex items-center gap-2 text-xs text-emerald-900">
              <input
                type="checkbox"
                id="waCheck"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 text-emerald-800 rounded accent-emerald-800 cursor-pointer"
              />
              <label htmlFor="waCheck" className="cursor-pointer font-medium">
                Send confirmed OPD digital pass & directions via WhatsApp
              </label>
            </div>

            {/* Auth Gate Banner (If not logged in) */}
            {!user && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl space-y-2">
                <p className="text-xs text-emerald-900 font-semibold">
                  Patient account required to reserve OPD slot.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => quickDemoLogin('patient')}
                    className="flex-1 py-1.5 px-2 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Demo Patient (Priya)
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="py-1.5 px-3 bg-white hover:bg-emerald-100/40 border border-[#E5E1D7] text-emerald-950 rounded-lg text-xs font-medium transition"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-3 border-t border-[#F0ECE1] flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-emerald-800/60 font-semibold uppercase">OPD Consultation Fee</span>
                <span className="text-base font-bold text-emerald-950 font-mono">
                  ₹{Number(doctor.consultation_fee).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 text-xs font-semibold text-emerald-900/70 hover:text-emerald-950 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="py-2 px-4 bg-emerald-900 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Locking Slot...
                    </>
                  ) : (
                    <>
                      Confirm OPD Booking
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

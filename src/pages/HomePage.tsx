import React, { useState, useEffect } from 'react';
import { Doctor } from '../types/index.ts';
import { doctorApi } from '../services/api.ts';
import { DoctorCard } from '../components/DoctorCard.tsx';
import { Search, RefreshCw, AlertCircle, Building2, MapPin, CheckCircle2, ShieldCheck, HeartPulse, Clock, Sparkles } from 'lucide-react';

interface HomePageProps {
  onBookDoctor: (doctor: Doctor) => void;
  onSelectDoctor: (doctor: Doctor) => void;
}

const SPECIALTIES = [
  'All',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'General Medicine',
];

const CITIES = ['All Cities', 'Bengaluru', 'Delhi NCR', 'Mumbai'];

export const HomePage: React.FC<HomePageProps> = ({ onBookDoctor, onSelectDoctor }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorApi.list({
        search: search.trim() || undefined,
        specialty: selectedSpecialty,
      });
      
      let filtered = data.doctors;
      if (selectedCity !== 'All Cities') {
        filtered = filtered.filter((d) =>
          d.location?.toLowerCase().includes(selectedCity.toLowerCase().split(' ')[0])
        );
      }
      setDoctors(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to load doctors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialty, selectedCity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Warm Editorial Clinical Hero Section */}
      <section className="relative overflow-hidden bg-white rounded-3xl border border-[#E8E4DA] p-8 sm:p-12 shadow-xs space-y-8">
        
        {/* Subtle decorative watermark/glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-72 h-72 bg-amber-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-800">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 font-bold">
              Ayushman Bharat & NABH Compliant
            </span>
            <span aria-hidden="true" className="text-emerald-300">·</span>
            <span className="flex items-center gap-1 text-emerald-700">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              OPD Timings: 09:00 – 13:00 & 16:30 – 19:30
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-emerald-950 font-serif leading-[1.18]" style={{ textWrap: 'balance' }}>
            Book confirmed OPD consultations with India’s leading specialists.
          </h1>

          <p className="text-sm sm:text-base text-emerald-950/70 leading-relaxed max-w-2xl">
            Consult senior faculty and surgeons from Apollo, Manipal, Max, Cloudnine, and Fortis.
            Get instant digital tokens with zero counter wait-time, backed by transactional concurrency locks.
          </p>
        </div>

        {/* Hospital Quality Highlights */}
        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#F0ECE1] text-xs">
          <div className="space-y-1">
            <span className="text-emerald-800/60 font-semibold uppercase text-[10px] tracking-wider block">Specialist Network</span>
            <span className="text-sm font-bold text-emerald-950 font-serif">MBBS, MD, MS, DM Consultants</span>
            <p className="text-emerald-900/60 text-[11px] leading-normal">AIIMS, CMC Vellore, NIMHANS, and PGIMER alumni doctors.</p>
          </div>

          <div className="space-y-1">
            <span className="text-emerald-800/60 font-semibold uppercase text-[10px] tracking-wider block">OPD Pass & Token</span>
            <span className="text-sm font-bold text-emerald-950 font-serif">Instant WhatsApp & SMS Pass</span>
            <p className="text-emerald-900/60 text-[11px] leading-normal">Digital token number to bypass queue at hospital reception.</p>
          </div>

          <div className="space-y-1">
            <span className="text-emerald-800/60 font-semibold uppercase text-[10px] tracking-wider block">Direct Consultation</span>
            <span className="text-sm font-bold text-emerald-950 font-serif">In-Clinic or Teleconsult</span>
            <p className="text-emerald-900/60 text-[11px] leading-normal">Pay ₹ consultation fee at OPD desk or via UPI QR code.</p>
          </div>
        </div>
      </section>

      {/* Directory Search & Segmented Filter Bar */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Functional Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-emerald-700/60 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, specialty, or hospital..."
              className="w-full pl-10 pr-24 py-2 bg-white border border-[#E5E1D7] rounded-xl text-xs sm:text-sm text-emerald-950 placeholder:text-emerald-900/40 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:border-emerald-800 shadow-2xs transition"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-3 bg-emerald-900 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition"
            >
              Search
            </button>
          </form>

          {/* City Filter & Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-emerald-900/70">
            <div className="flex items-center gap-1.5 bg-white border border-[#E5E1D7] rounded-xl px-2.5 py-1.5 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-transparent text-xs font-bold text-emerald-950 focus:outline-none cursor-pointer"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <span className="font-medium">
              <strong className="text-emerald-950 font-bold tabular-nums">{doctors.length}</strong> verified doctors
            </span>

            <button
              onClick={fetchDoctors}
              className="p-1.5 text-emerald-700/70 hover:text-emerald-950 hover:bg-white rounded-lg border border-transparent hover:border-[#E5E1D7] transition-all"
              title="Refresh directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Speciality Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {SPECIALTIES.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedSpecialty === spec
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'bg-white text-emerald-900/80 border border-[#E5E1D7] hover:bg-[#F3F0E6] hover:text-emerald-950'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </section>

      {/* Doctor Grid or States */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-emerald-900/70">
            Querying clinical availability ledger...
          </p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div className="space-y-1">
            <span className="font-bold">Error loading doctor directory</span>
            <p>{error}</p>
            <button
              onClick={fetchDoctors}
              className="text-xs font-semibold text-red-900 underline mt-1 block"
            >
              Retry
            </button>
          </div>
        </div>
      ) : doctors.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-[#E8E4DA] p-8 space-y-3">
          <Building2 className="w-8 h-8 text-emerald-700/40 mx-auto" />
          <h3 className="text-base font-bold text-emerald-950 font-serif">No specialists found</h3>
          <p className="text-xs text-emerald-900/60 max-w-sm mx-auto">
            No doctors matched your criteria for "{search || selectedSpecialty}". Try adjusting your city or specialty filter.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedSpecialty('All');
              setSelectedCity('All Cities');
            }}
            className="px-3.5 py-1.5 bg-emerald-900 text-white text-xs font-semibold rounded-xl hover:bg-emerald-800 transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onBook={onBookDoctor}
              onSelect={onSelectDoctor}
            />
          ))}
        </div>
      )}

      {/* Trust & Guarantee Banner */}
      <section className="bg-emerald-900 text-emerald-50 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1.5 max-w-xl text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>Zero-Wait OPD Desk Guarantee</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-serif">
            Arrive at the hospital with a confirmed digital OPD appointment token.
          </h3>
          <p className="text-xs text-emerald-200/80 leading-relaxed">
            Every booking reserves your exact time slot with atomic database locking. Show your digital token pass on your phone at reception for priority entry.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-emerald-950/80 border border-emerald-700/60 px-4 py-3 rounded-xl text-center">
            <span className="text-[10px] text-emerald-300/70 uppercase block font-medium">Standard Slot</span>
            <span className="text-base font-bold text-white font-mono">30 Minutes</span>
          </div>
          <div className="bg-emerald-950/80 border border-emerald-700/60 px-4 py-3 rounded-xl text-center">
            <span className="text-[10px] text-emerald-300/70 uppercase block font-medium">Payment Choice</span>
            <span className="text-base font-bold text-amber-300 font-mono">Cash / UPI</span>
          </div>
        </div>
      </section>

    </div>
  );
};

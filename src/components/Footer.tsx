import React from 'react';
import { Stethoscope, ShieldCheck, HeartHandshake, PhoneCall, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-emerald-950 text-emerald-100/70 text-xs border-t border-emerald-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">CareFlow India</span>
            </div>
            <p className="text-emerald-200/70 text-xs leading-relaxed">
              India's verified outpatient care network connecting patients with board-certified consultants across Bengaluru, Delhi NCR, and Mumbai.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-amber-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>NABH & ABHA Digital Health Standard</span>
            </div>
          </div>

          {/* Clinical Departments */}
          <div className="space-y-2.5">
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase">OPD Specialities</h4>
            <ul className="space-y-1.5 text-emerald-200/60 text-xs">
              <li>Cardiology & Preventative Health</li>
              <li>Dermatology & Clinical Trichology</li>
              <li>Pediatrics & Neonatal Care</li>
              <li>Orthopedics & Joint Replacement</li>
              <li>Neurology & Neuro-rehab</li>
              <li>General Medicine & Diabetology</li>
            </ul>
          </div>

          {/* Hospital Centres */}
          <div className="space-y-2.5">
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase">Metropolitan Hubs</h4>
            <ul className="space-y-1.5 text-emerald-200/60 text-xs">
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" /> Bengaluru (Bannerghatta, Indiranagar, Jayanagar)
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" /> Delhi NCR (Saket, Gurugram Sector 44)
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-emerald-400" /> Mumbai (Bandra West, Powai)
              </li>
            </ul>
          </div>

          {/* Emergency & Helpline */}
          <div className="space-y-2.5 bg-emerald-900/60 p-4 rounded-2xl border border-emerald-800/80">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
              <span>Emergency Clinical Triage</span>
            </div>
            <p className="text-emerald-200/80 text-[11px] leading-relaxed">
              For acute medical emergencies, call national emergency ambulance line directly:
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300 font-mono">
              <span>Dial 108 / 112 (India)</span>
            </div>
            <span className="block text-[10px] text-emerald-300/60">
              OPD Desk Assistance: +91 (080) 4567 8900
            </span>
          </div>

        </div>

        {/* Bottom copyright and disclosures */}
        <div className="pt-6 border-t border-emerald-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-emerald-300/50">
          <p>© {new Date().getFullYear()} CareFlow Healthcare Solutions Pvt Ltd. All doctor profiles verified via NMC / State Medical Councils.</p>
          <div className="flex items-center gap-4">
            <span>ABHA Digital Health Record Compatible</span>
            <span>·</span>
            <span>Zero Double-Booking Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

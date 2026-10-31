import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';

const currentYear = new Date().getFullYear();

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-100/50 via-slate-50/20 to-transparent pointer-events-none" />

      {/* Back to Home */}
      <div className="absolute top-5 left-5 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link to="/login" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:bg-indigo-700 transition-colors">
            <Layers className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
              SubFlow
            </span>
            <span className="text-xs text-slate-500 font-medium tracking-wide">
              Subscription Management
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          <Outlet />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          &copy; {currentYear} SubFlow Technologies. Enterprise Multi-Role Platform.
        </p>
      </div>
    </div>
  );
}

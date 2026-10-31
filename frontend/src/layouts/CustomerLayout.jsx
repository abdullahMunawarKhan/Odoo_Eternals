import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerSidebar } from '../features/customer/components/CustomerSidebar';
import { CustomerTopbar } from '../features/customer/components/CustomerTopbar';

export function CustomerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <CustomerSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <CustomerTopbar onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Layouts
import { AuthLayout } from '../layouts/AuthLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { StaffLayout } from '../layouts/StaffLayout';
import { CustomerLayout } from '../layouts/CustomerLayout';

// Route Guards
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

// Auth Features (Lazy loaded)
const LoginForm = lazy(() => import('../features/auth/LoginForm').then((m) => ({ default: m.LoginForm })));
const RegisterForm = lazy(() => import('../features/auth/RegisterForm').then((m) => ({ default: m.RegisterForm })));
const ForgotPasswordForm = lazy(() => import('../features/auth/ForgotPasswordForm').then((m) => ({ default: m.ForgotPasswordForm })));
const ResetPasswordForm = lazy(() => import('../features/auth/ResetPasswordForm').then((m) => ({ default: m.ResetPasswordForm })));

// Admin Pages (Lazy loaded)
const AdminOverview = lazy(() => import('../pages/admin/AdminOverview').then((m) => ({ default: m.AdminOverview })));
const AdminStaffPage = lazy(() => import('../pages/admin/AdminStaffPage').then((m) => ({ default: m.AdminStaffPage })));

// Staff Pages (Lazy loaded)
const StaffOverview = lazy(() => import('../features/staff/StaffOverview').then((m) => ({ default: m.StaffOverview })));
const StaffProfile = lazy(() => import('../features/staff/StaffProfile').then((m) => ({ default: m.StaffProfile })));

// Customer Pages (Lazy loaded)
const CustomerOverview = lazy(() => import('../features/customer/pages/CustomerOverview').then((m) => ({ default: m.CustomerOverview })));
const MySubscriptions = lazy(() => import('../features/customer/pages/MySubscriptions').then((m) => ({ default: m.MySubscriptions })));
const SubscriptionDetails = lazy(() => import('../features/customer/pages/SubscriptionDetails').then((m) => ({ default: m.SubscriptionDetails })));
const MyInvoices = lazy(() => import('../features/customer/pages/MyInvoices').then((m) => ({ default: m.MyInvoices })));
const InvoiceDetails = lazy(() => import('../features/customer/pages/InvoiceDetails').then((m) => ({ default: m.InvoiceDetails })));
const PaymentHistory = lazy(() => import('../features/customer/pages/PaymentHistory').then((m) => ({ default: m.PaymentHistory })));
const CustomerProfile = lazy(() => import('../features/customer/pages/CustomerProfile').then((m) => ({ default: m.CustomerProfile })));
const AccountSettings = lazy(() => import('../features/customer/pages/AccountSettings').then((m) => ({ default: m.AccountSettings })));

// Landing Page (Lazy loaded)
const Home = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })));

// UI Helpers
import { ComingSoon } from '../components/ui/ComingSoon';

function RouteLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2 p-6">
      <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
      <span className="text-xs text-slate-400 font-medium tracking-wide">Loading module...</span>
    </div>
  );
}

// Root redirect handler
function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'staff':
      return <Navigate to="/staff" replace />;
    case 'customer':
    default:
      return <Navigate to="/customer" replace />;
  }
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Root Route */}
        <Route path="/" element={<Home />} />

        {/* Public Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/signup" element={<RegisterForm />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
        </Route>

        {/* Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['admin']}>
                <AdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route
            path="products"
            element={
              <ComingSoon
                title="Products Catalog"
                description="Define subscription products, add-ons, feature entitlements, and metered usage components."
                features={[
                  'Multi-currency product pricing catalogs',
                  'Feature gating and entitlements management',
                  'Metered and usage-based billing units',
                  'Product versioning and lifecycle controls',
                ]}
                backPath="/admin"
              />
            }
          />
          <Route
            path="plans"
            element={
              <ComingSoon
                title="Subscription Plans"
                description="Design and manage pricing tiers, free trial durations, and recurring billing cycles."
                features={[
                  'Monthly, quarterly, and annual billing cadences',
                  'Configurable free trial periods with card capture',
                  'Tiered, volume, and per-seat pricing models',
                  'Grandfathered plans and migration rules',
                ]}
                backPath="/admin"
              />
            }
          />
          <Route
            path="subscriptions"
            element={
              <ComingSoon
                title="Subscription Operations"
                description="Monitor active subscriber lifecycles, upgrades, downgrades, cancellations, and churn."
                features={[
                  'Real-time MRR and ARR growth metrics',
                  'Pro-rated plan upgrade and downgrade engine',
                  'Automatic dunning and payment retry workflows',
                  'Cancellation surveys and churn mitigation',
                ]}
                backPath="/admin"
              />
            }
          />
          <Route
            path="invoices"
            element={
              <ComingSoon
                title="Invoicing & Billing History"
                description="Automated tax-compliant PDF invoice creation, payment status reconciliation, and refunds."
                features={[
                  'Automated monthly invoice distribution via email',
                  'Tax calculation (VAT, GST, Sales Tax)',
                  'Stripe & payment gateway transaction matching',
                  'Credit note issuance and refund logging',
                ]}
                backPath="/admin"
              />
            }
          />
          <Route
            path="settings"
            element={
              <ComingSoon
                title="Platform Settings"
                description="Manage organization preferences, payment gateway credentials, and system webhooks."
                features={[
                  'Stripe, PayPal, and payment gateway keys',
                  'Branded email notification templates',
                  'Custom domain setup with SSL provisioning',
                  'Audit logging and security access policies',
                ]}
                backPath="/admin"
              />
            }
          />
        </Route>

        {/* Staff Protected Routes */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['staff']}>
                <StaffLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<StaffOverview />} />
          <Route path="profile" element={<StaffProfile />} />
          <Route
            path="customers"
            element={
              <ComingSoon
                title="Customer Directory"
                description="Access customer accounts, assign account managers, and track customer satisfaction."
                features={[
                  'Searchable customer database with company details',
                  'Subscription plan inspection and history',
                  'Internal staff customer notes and activity logs',
                  'Support escalation and contact records',
                ]}
                backPath="/staff"
              />
            }
          />
          <Route
            path="quotations"
            element={
              <ComingSoon
                title="Quotations & Proposals"
                description="Draft custom enterprise pricing proposals and send quotations for customer signoff."
                features={[
                  'Custom enterprise quotation builder',
                  'Volume discounting and one-off setup fees',
                  'E-signature and proposal approval tracking',
                  'One-click conversion to active subscription',
                ]}
                backPath="/staff"
              />
            }
          />
          <Route
            path="subscriptions"
            element={
              <ComingSoon
                title="Managed Subscriptions"
                description="Help customers adjust subscription plans, handle renewals, and pause services."
                features={[
                  'Assisted customer plan upgrades and renewals',
                  'Scheduled subscription pause and resume',
                  'Add-on activation and license allocation',
                  'Renewal notification alerts',
                ]}
                backPath="/staff"
              />
            }
          />
          <Route
            path="invoices"
            element={
              <ComingSoon
                title="Billing & Invoices"
                description="Review customer invoice statuses, process manual payments, and send reminders."
                features={[
                  'Customer invoice lookup and PDF download',
                  'Overdue payment reminder dispatch',
                  'Manual payment recording (wire / check)',
                  'Invoice discrepancy investigation',
                ]}
                backPath="/staff"
              />
            }
          />
        </Route>

        {/* Customer Protected Routes */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['customer']}>
                <CustomerLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<CustomerOverview />} />
          <Route path="overview" element={<Navigate to="/customer" replace />} />
          <Route path="subscriptions" element={<MySubscriptions />} />
          <Route path="subscriptions/:id" element={<SubscriptionDetails />} />
          <Route path="invoices" element={<MyInvoices />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="payments" element={<PaymentHistory />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>

        {/* Support /portal redirect aliases */}
        <Route path="/portal" element={<Navigate to="/customer" replace />} />
        <Route path="/portal/*" element={<Navigate to="/customer" replace />} />

        {/* 404 Catch-All */}
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-4">
                <h1 className="text-4xl font-extrabold text-slate-800">404</h1>
                <h2 className="text-lg font-semibold text-slate-700">Page Not Found</h2>
                <p className="text-sm text-slate-500">
                  The requested page does not exist or you may not have authorization to access it.
                </p>
                <div className="pt-2">
                  <RootRedirect />
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}

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
const AdminProductsPage = lazy(() => import('../pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })));
const AdminPlansPage = lazy(() => import('../pages/admin/AdminPlansPage').then((m) => ({ default: m.AdminPlansPage })));
const AdminTaxesPage = lazy(() => import('../pages/admin/AdminTaxesPage').then((m) => ({ default: m.AdminTaxesPage })));
const AdminDiscountsPage = lazy(() => import('../pages/admin/AdminDiscountsPage').then((m) => ({ default: m.AdminDiscountsPage })));
const AdminTemplatesPage = lazy(() => import('../pages/admin/AdminTemplatesPage').then((m) => ({ default: m.AdminTemplatesPage })));
const AdminSubscriptionsPage = lazy(() => import('../pages/admin/AdminSubscriptionsPage').then((m) => ({ default: m.AdminSubscriptionsPage })));
const AdminSubscriptionDetailPage = lazy(() => import('../pages/admin/AdminSubscriptionDetailPage').then((m) => ({ default: m.AdminSubscriptionDetailPage })));
const AdminInvoicesPage = lazy(() => import('../pages/admin/AdminInvoicesPage').then((m) => ({ default: m.AdminInvoicesPage })));
const AdminInvoiceDetailPage = lazy(() => import('../pages/admin/AdminInvoiceDetailPage').then((m) => ({ default: m.AdminInvoiceDetailPage })));
const AdminPaymentsPage = lazy(() => import('../pages/admin/AdminPaymentsPage').then((m) => ({ default: m.AdminPaymentsPage })));
// Staff Pages (Lazy loaded)
const StaffOverview = lazy(() => import('../features/staff/pages/StaffOverview').then((m) => ({ default: m.StaffOverview })));
const StaffProfile = lazy(() => import('../features/staff/pages/StaffProfile').then((m) => ({ default: m.StaffProfile })));
const StaffCustomers = lazy(() => import('../features/staff/pages/Customers').then((m) => ({ default: m.Customers })));
const StaffCustomerDetails = lazy(() => import('../features/staff/pages/CustomerDetails').then((m) => ({ default: m.CustomerDetails })));
const StaffQuotations = lazy(() => import('../features/staff/pages/Quotations').then((m) => ({ default: m.Quotations })));
const StaffCreateQuotation = lazy(() => import('../features/staff/pages/CreateQuotation').then((m) => ({ default: m.CreateQuotation })));
const StaffQuotationDetails = lazy(() => import('../features/staff/pages/QuotationDetails').then((m) => ({ default: m.QuotationDetails })));
const StaffSubscriptions = lazy(() => import('../features/staff/pages/Subscriptions').then((m) => ({ default: m.Subscriptions })));
const StaffCreateSubscription = lazy(() => import('../features/staff/pages/CreateSubscription').then((m) => ({ default: m.CreateSubscription })));
const StaffSubscriptionDetails = lazy(() => import('../features/staff/pages/SubscriptionDetails').then((m) => ({ default: m.SubscriptionDetails })));
const StaffInvoices = lazy(() => import('../features/staff/pages/Invoices').then((m) => ({ default: m.Invoices })));
const StaffInvoiceDetails = lazy(() => import('../features/staff/pages/InvoiceDetails').then((m) => ({ default: m.InvoiceDetails })));
const StaffPayments = lazy(() => import('../features/staff/pages/Payments').then((m) => ({ default: m.Payments })));
const StaffRecordPayment = lazy(() => import('../features/staff/pages/RecordPayment').then((m) => ({ default: m.RecordPayment })));

// Staff Pages (Lazy loaded)



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
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="taxes" element={<AdminTaxesPage />} />
          <Route path="discounts" element={<AdminDiscountsPage />} />
          <Route path="templates" element={<AdminTemplatesPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="subscriptions/:id" element={<AdminSubscriptionDetailPage />} />
          <Route path="invoices" element={<AdminInvoicesPage />} />
          <Route path="invoices/:id" element={<AdminInvoiceDetailPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
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

          {/* Customers */}
          <Route path="customers" element={<StaffCustomers />} />
          <Route path="customers/:id" element={<StaffCustomerDetails />} />

          {/* Quotations */}
          <Route path="quotations" element={<StaffQuotations />} />
          <Route path="quotations/new" element={<StaffCreateQuotation />} />
          <Route path="quotations/:id" element={<StaffQuotationDetails />} />

          {/* Subscriptions */}
          <Route path="subscriptions" element={<StaffSubscriptions />} />
          <Route path="subscriptions/new" element={<StaffCreateSubscription />} />
          <Route path="subscriptions/:id" element={<StaffSubscriptionDetails />} />

          {/* Invoices */}
          <Route path="invoices" element={<StaffInvoices />} />
          <Route path="invoices/:id" element={<StaffInvoiceDetails />} />

          {/* Payments */}
          <Route path="payments" element={<StaffPayments />} />
          <Route path="payments/new" element={<StaffRecordPayment />} />
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

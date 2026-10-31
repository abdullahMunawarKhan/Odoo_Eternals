import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Repeat,
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { customerService } from '../../../services/customerService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { formatShortDate, formatDate } from '../../../utils/formatters';
import { getSubscriptionStatusBadge } from '../components/SubscriptionTable';
import { getInvoiceStatusBadge } from '../components/InvoiceTable';

export function SubscriptionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Action confirmation modal
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    action: null, // 'pause' | 'resume' | 'close' | 'renew'
    title: '',
    description: '',
    confirmText: '',
    variant: 'primary',
  });
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.getSubscriptionById(id);
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription details:', err);
      setError(err.message || 'Unable to retrieve subscription details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [id]);

  const handleOpenActionModal = (actionType) => {
    switch (actionType) {
      case 'pause':
        setActionModal({
          isOpen: true,
          action: 'paused',
          title: 'Pause Subscription',
          description: 'Are you sure you want to pause this subscription? Scheduled billing cycles will be suspended until resumed.',
          confirmText: 'Pause Subscription',
          variant: 'warning',
        });
        break;
      case 'resume':
        setActionModal({
          isOpen: true,
          action: 'active',
          title: 'Resume Subscription',
          description: 'Are you sure you want to resume this subscription? Regular billing cycles will be reinstated.',
          confirmText: 'Resume Subscription',
          variant: 'primary',
        });
        break;
      case 'close':
        setActionModal({
          isOpen: true,
          action: 'closed',
          title: 'Cancel / Close Subscription',
          description: 'Are you sure you want to close this subscription? This will cancel future renewals and close the plan.',
          confirmText: 'Confirm Closure',
          variant: 'danger',
        });
        break;
      case 'renew':
        setActionModal({
          isOpen: true,
          action: 'active', // renewal triggers active term extension in transition_subscription
          title: 'Renew Subscription',
          description: 'Would you like to renew this subscription for another full term? Your expiry date will be extended.',
          confirmText: 'Renew Now',
          variant: 'primary',
        });
        break;
      default:
        break;
    }
  };

  const handleExecuteAction = async () => {
    if (!actionModal.action) return;
    setIsSubmittingAction(true);
    try {
      await customerService.transitionSubscription(id, actionModal.action);
      toast.success('Subscription status updated successfully.');
      setActionModal((prev) => ({ ...prev, isOpen: false }));
      await fetchSubscription();
    } catch (err) {
      console.error('Failed to transition subscription:', err);
      toast.error(err.message || 'Action could not be completed.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-20 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Subscription Not Found</h2>
        <p className="text-sm text-slate-500">{error || 'This subscription does not exist or you do not have permission to view it.'}</p>
        <Button variant="outline" onClick={() => navigate('/customer/subscriptions')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Subscriptions
        </Button>
      </div>
    );
  }

  const plan = subscription.plan || {};
  const statusInfo = getSubscriptionStatusBadge(subscription.status);
  const lines = subscription.subscription_lines || [];
  const relatedInvoices = subscription.relatedInvoices || [];

  // Check plan permissions
  const canPause = plan.pausable && subscription.status === 'active';
  const canResume = plan.pausable && subscription.status === 'paused';
  const canClose = plan.closable && (subscription.status === 'active' || subscription.status === 'paused');
  const canRenew = plan.renewable && subscription.status === 'active';

  return (
    <div className="space-y-6">
      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/customer/subscriptions')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {subscription.number}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Plan: <span className="font-semibold text-slate-700">{plan.name || 'Custom Plan'}</span>
            </p>
          </div>
        </div>

        {/* Customer Permitted Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {canResume && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenActionModal('resume')}
              leftIcon={<PlayCircle className="w-4 h-4" />}
            >
              Resume Plan
            </Button>
          )}

          {canPause && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenActionModal('pause')}
              leftIcon={<PauseCircle className="w-4 h-4" />}
            >
              Pause Plan
            </Button>
          )}

          {canRenew && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenActionModal('renew')}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Renew Plan
            </Button>
          )}

          {canClose && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleOpenActionModal('close')}
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Cancel Early
            </Button>
          )}
        </div>
      </div>

      {/* Plan Rules & Permissions Banner */}
      <Card className="bg-slate-50/70 border-slate-200">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-700">Plan Governance Features:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className={`flex items-center gap-1 ${plan.pausable ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Pausable: {plan.pausable ? 'Yes' : 'No'}
            </span>
            <span className={`flex items-center gap-1 ${plan.closable ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Early Closure: {plan.closable ? 'Permitted' : 'Locked'}
            </span>
            <span className={`flex items-center gap-1 ${plan.renewable ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Renewable: {plan.renewable ? 'Yes' : 'No'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary Grid: Dates & Terms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Start Date
          </div>
          <div className="font-semibold text-sm text-slate-900">
            {formatShortDate(subscription.start_date)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Expiry Date
          </div>
          <div className="font-semibold text-sm text-slate-900">
            {formatShortDate(subscription.expiry_date)}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-indigo-600" /> Next Billing Date
          </div>
          <div className="font-semibold text-sm text-slate-900">
            {subscription.next_billing_date ? formatShortDate(subscription.next_billing_date) : '—'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Payment Terms
          </div>
          <div className="font-semibold text-sm text-slate-900">
            {subscription.payment_term?.name || 'Immediate Payment'}
          </div>
        </Card>
      </div>

      {/* Associated Products & Variants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Items & Entitlements</CardTitle>
          <CardDescription>Product modules and line items provisioned under this subscription</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {lines.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Base recurring fee: ${Number(plan.price || 0).toFixed(2)} / {plan.billing_period || 'period'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant / Brand</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const prod = line.product || {};
                  const variant = line.variant;
                  const qty = line.quantity || 1;
                  const unitPrice = Number(line.unit_price || 0).toFixed(2);
                  const totalAmt = Number(line.amount || (qty * unitPrice)).toFixed(2);
                  const taxName = line.tax?.name || '—';

                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-medium text-slate-900">
                        {prod.name || 'Product Item'}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {variant ? `${variant.attribute_name || 'Brand'}: ${variant.value}` : 'Standard'}
                      </TableCell>
                      <TableCell>{qty}</TableCell>
                      <TableCell>${unitPrice}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{taxName}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">${totalAmt}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Related Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Related Invoices</CardTitle>
            <CardDescription>Billing statements generated for this subscription</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/customer/invoices')}
          >
            All Invoices
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {relatedInvoices.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              No invoices generated for this subscription yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedInvoices.map((inv) => {
                  const invBadge = getInvoiceStatusBadge(inv.status);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-semibold text-slate-900">{inv.number}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatShortDate(inv.issue_date)}</TableCell>
                      <TableCell className="text-xs text-slate-500">{formatShortDate(inv.due_date)}</TableCell>
                      <TableCell className="font-bold text-slate-900">${Number(inv.total || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${invBadge.bg}`}>
                          {invBadge.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/customer/invoices/${inv.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
        title={actionModal.title}
        description={actionModal.description}
      >
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
            disabled={isSubmittingAction}
          >
            Cancel
          </Button>
          <Button
            variant={actionModal.variant}
            isLoading={isSubmittingAction}
            onClick={handleExecuteAction}
          >
            {actionModal.confirmText}
          </Button>
        </div>
      </Modal>
    </div>
  );
}


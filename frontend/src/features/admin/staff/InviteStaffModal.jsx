import React, { useState } from 'react';
import { Mail, User, UserPlus, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '../../../services/staffService';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { validateEmail, validatePassword } from '../../../utils/validators';

// Creates a staff account through the admin-only `create-staff` Edge Function.
// The admin sets the first password; the same password rule is enforced server-side.
export function InviteStaffModal({ isOpen, onClose, onStaffInvited }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const check = validatePassword(password);
    if (!check.isValid) {
      setErrorMessage(`Password: ${check.errors.join('. ')}.`);
      return;
    }

    setIsLoading(true);

    try {
      await staffService.createStaff({
        email: email.trim(),
        fullName: fullName.trim(),
        password,
      });

      toast.success(`Staff account created for ${email.trim()}`);
      setFullName('');
      setEmail('');
      setPassword('');
      onStaffInvited?.();
      onClose();
    } catch (err) {
      console.error('Create staff error:', err);
      const msg = err.message || 'Failed to create the staff account.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Staff Member"
      description="Create a staff account. They can sign in straight away with the password you set."
    >
      {errorMessage && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Staff Full Name"
          placeholder="e.g. Alex Morgan"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        <Input
          label="Staff Email Address"
          type="email"
          placeholder="e.g. alex@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          required
        />

        <Input
          label="Temporary Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          helperText="At least 9 characters with an uppercase letter, a lowercase letter and a special character."
          required
        />

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Create Staff Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

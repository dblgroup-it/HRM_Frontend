import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  FullPageSpinner,
  EmptyState,
} from '@shared/components/ui';
import { formatDate } from '@shared/utils';
import { ROUTES } from '@app/router/paths';

import { useEmployee, useUpdateEmployee } from '../hooks/useEmployees';
import { useMyPermissions } from '@modules/rbac';
import { canAdministerEmployees } from '../access';
import { useAuth, authApi } from '@modules/auth';
import { toast } from 'sonner';
import { resolveApiFileUrl } from '@shared/api/fileUrl';
import { SignatureCropper } from '@modules/settings';
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge';

interface EditForm {
  name: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
}

export default function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const { data: employee, isLoading, isError, refetch } = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id);

  const [editing, setEditing] = useState(false);
  const { data: perms } = useMyPermissions();
  const { user: signedInUser } = useAuth();
  // Super user, CHRO, Head of Talent Acquisition or Corporate Recruiter. The
  // server refuses everyone else regardless; this stops the rest being shown a
  // button that only produces a 403.
  const canAdminister = canAdministerEmployees(perms);
  /** Is this my own record? Your own signature is always yours to manage. */
  const isOwnProfile =
    Boolean(signedInUser?.id) && signedInUser?.id === employee?.userId;
  /**
   * Seeing the signature and managing it are two different rights.
   *
   * The image is confidential to the person it belongs to — it is the mark
   * that signs their offer letters and joining forms, and a picture of it is
   * most of what is needed to forge one. So nobody, including HR and super
   * users, is shown a colleague's. The server enforces this and simply does
   * not send the URL for anybody else's record; these flags keep the page
   * from rendering an empty frame where an image used to be.
   *
   * Managing one is an ordinary HR act and is unchanged: administrators can
   * still upload, replace and clear, told only whether one is on file.
   */
  const canViewSignature = isOwnProfile;
  const canManageSignature = canAdminister || isOwnProfile;
  const hasSignature = Boolean(employee?.hasSignature);
  const [form, setForm] = useState<EditForm>({ name: '', email: '', phone: '', gender: '', dateOfBirth: '' });

  /**
   * The signature is part of the edit form, not a control that acts on its own.
   *
   * Picking an image stages it; nothing reaches the server until Save changes.
   * An upload that fired on selection would commit a change to someone else's
   * record while the rest of the form was still being typed, and Cancel would
   * not undo it.
   */
  const [pendingSignature, setPendingSignature] = useState<File | null>(null);
  const [clearSignature, setClearSignature] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Preview of a staged image, revoked when it is replaced or dropped.
  const pendingPreview = useMemo(
    () => (pendingSignature ? URL.createObjectURL(pendingSignature) : null),
    [pendingSignature],
  );
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  /** HR may not touch a signature its owner uploaded. */
  const signatureLocked =
    !isOwnProfile && Boolean(employee?.signatureSelfUploaded);

  function openEdit() {
    if (!employee) return;
    setForm({
      name: employee.name ?? '',
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      gender: employee.gender ?? '',
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : '',
    });
    setPendingSignature(null);
    setClearSignature(false);
    setCropFile(null);
    setEditing(true);
  }

  function handleChange(field: keyof EditForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    const dto: Record<string, string> = {};
    if (form.name.trim()) dto.name = form.name.trim();
    if (form.email.trim()) dto.email = form.email.trim();
    if (form.phone.trim()) dto.phone = form.phone.trim();
    if (form.gender) dto.gender = form.gender;
    if (form.dateOfBirth) dto.dateOfBirth = form.dateOfBirth;

    // The signature is a separate endpoint — it is an image upload, not a
    // column — so "Save changes" performs both and only closes the form when
    // both have succeeded. Details first: if the signature upload fails, the
    // typed corrections are already safe and the form stays open with the
    // staged image still there to retry.
    setSavingSignature(true);
    try {
      await updateEmployee.mutateAsync(dto);

      if (pendingSignature) {
        await authApi.uploadSignature(pendingSignature, employee?.userId);
      } else if (clearSignature) {
        await authApi.deleteSignature(employee?.userId);
      }

      setPendingSignature(null);
      setClearSignature(false);
      setEditing(false);
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save every change — nothing after the failure was applied.',
      );
    } finally {
      setSavingSignature(false);
    }
  }

  if (isLoading) return <FullPageSpinner label="Loading employee…" />;

  if (isError || !employee) {
    return (
      <EmptyState
        title="Employee not found"
        description="We couldn't find a record for this employee."
        action={
          <Link to={ROUTES.employees}>
            <Button variant="outline">Back to employees</Button>
          </Link>
        }
      />
    );
  }

  const contactItems = [
    { label: 'Email', value: employee.email, icon: Mail },
    { label: 'Phone', value: employee.phone, icon: Phone },
    { label: 'Unit', value: employee.location, icon: MapPin },
  ];

  const records = [
    { label: 'Employee Code', value: employee.employeeCode },
    { label: 'Department', value: employee.department },
    ...(employee.section ? [{ label: 'Section', value: employee.section }] : []),
    ...(employee.grade ? [{ label: 'Grade', value: employee.grade }] : []),
    ...(employee.category ? [{ label: 'Category', value: employee.category }] : []),
    ...(employee.gender ? [{ label: 'Gender', value: employee.gender }] : []),
    { label: 'Date Joined', value: formatDate(employee.joinedAt, 'dd MMMM yyyy') },
    ...(employee.dateOfBirth
      ? [{ label: 'Date of Birth', value: formatDate(employee.dateOfBirth, 'dd MMMM yyyy') }]
      : []),
    ...(employee.exitDate
      ? [{ label: 'Exit Date', value: formatDate(employee.exitDate, 'dd MMMM yyyy') }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Link
        to={ROUTES.employees}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to employees
      </Link>

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={employee.name} src={employee.avatarUrl} size="lg" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold text-slate-900">{employee.name}</h1>
              <EmployeeStatusBadge status={employee.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>
          {!editing && canAdminister && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit info
            </Button>
          )}
        </CardBody>
      </Card>

      {editing && canAdminister && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Edit personal information</CardTitle>
              <button
                onClick={() => setEditing(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">— select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Date of birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* E-signature — staged here, written by Save changes. */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                E-signature
              </label>

              {cropFile ? (
                <SignatureCropper
                  file={cropFile}
                  onCancel={() => setCropFile(null)}
                  onCropped={(cropped) => {
                    // Staged only — nothing is sent until Save changes.
                    setPendingSignature(cropped);
                    setClearSignature(false);
                    setCropFile(null);
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex aspect-[3/1] w-56 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {/* A staged image is one the administrator just chose
                        themselves, so it is theirs to look at. The one on
                        file is not — for anybody but its owner the frame
                        says that a signature exists without showing it. */}
                    {pendingPreview ? (
                      <img src={pendingPreview} alt="New signature" className="h-full w-full object-contain" />
                    ) : clearSignature || !hasSignature ? (
                      <span className="text-xs text-slate-400">No signature</span>
                    ) : canViewSignature && employee.signatureUrl ? (
                      <img
                        src={resolveApiFileUrl(employee.signatureUrl)}
                        alt="Your signature"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="flex flex-col items-center gap-1 px-3 text-center">
                        <ShieldCheck className="h-4 w-4 text-slate-300" />
                        <span className="text-xs font-medium text-slate-500">
                          Signature on file
                        </span>
                        <span className="text-[0.6875rem] leading-tight text-slate-400">
                          Hidden — only {employee.name.split(' ')[0]} can see it
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {signatureLocked ? (
                      <p className="max-w-xs rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        {employee.name.split(' ')[0]} uploaded this signature
                        themselves, so it cannot be changed here. Ask them to
                        replace it from their own profile.
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => signatureInputRef.current?.click()}
                          >
                            {hasSignature || pendingSignature
                              ? 'Choose new image'
                              : 'Choose image'}
                          </Button>
                          {(hasSignature || pendingSignature) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPendingSignature(null);
                                setClearSignature(hasSignature);
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className="max-w-xs text-xs text-slate-500">
                          PNG or JPEG, up to 2 MB. You will crop it to 3:1, and
                          it is applied when you press Save changes.
                        </p>
                        {(pendingSignature || clearSignature) && (
                          <p className="text-xs font-medium text-brand-700">
                            {pendingSignature
                              ? 'New signature ready — press Save changes to apply it.'
                              : 'Signature will be removed when you press Save changes.'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <input
                ref={signatureInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error('Image must be 2 MB or smaller');
                    } else {
                      setCropFile(file);
                    }
                  }
                  e.target.value = '';
                }}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={updateEmployee.isPending || savingSignature}
              >
                {updateEmployee.isPending || savingSignature
                  ? 'Saving…'
                  : 'Save changes'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {contactItems.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <d.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">{d.label}</p>
                  <p className="text-sm font-medium text-slate-700">{d.value}</p>
                </div>
              </div>
            ))}

            {/*
              E-signature — the image only on your own profile.

              Administrators get the section too, because they may need to add
              or replace one, but it tells them only whether a signature is on
              file. Everyone else does not see the section at all: a colleague
              has no reason to know, and "Not provided" on every other profile
              is noise that reads as something missing.
            */}
            {canManageSignature && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs text-slate-400">E-signature</p>
                {/* No `userId` on your own profile, so it posts to /users/me
                    — the one path that never depends on holding a role. */}
                {/* Read-only here. Administrators change it inside the edit
                    form, where it is applied by Save changes; the owner changes
                    their own from Settings. One place to edit, not two. */}
                {canViewSignature && employee.signatureUrl ? (
                  <div className="flex aspect-[3/1] w-full max-w-[16rem] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img
                      src={resolveApiFileUrl(employee.signatureUrl)}
                      alt="Your signature"
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : hasSignature ? (
                  <p className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                    On file — visible only to {employee.name.split(' ')[0]}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    {isOwnProfile
                      ? 'Not set — add one from Settings → Profile.'
                      : 'Not provided'}
                  </p>
                )}
              </div>
            )}

            {employee.manager && (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <User className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">Reports to</p>
                  {employee.managerId ? (
                    <Link
                      to={ROUTES.employeeDetail(employee.managerId)}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {employee.manager}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-slate-700">{employee.manager}</p>
                  )}
                  {employee.managerCode && (
                    <p className="text-xs text-slate-400">{employee.managerCode}</p>
                  )}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {records.map((r) => (
                <div key={r.label}>
                  <dt className="text-xs text-slate-400">{r.label}</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">{r.value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Pencil, Phone, User, X } from 'lucide-react';

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
  const { data: employee, isLoading, isError } = useEmployee(id);
  const updateEmployee = useUpdateEmployee(id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({ name: '', email: '', phone: '', gender: '', dateOfBirth: '' });

  function openEdit() {
    if (!employee) return;
    setForm({
      name: employee.name ?? '',
      email: employee.email ?? '',
      phone: employee.phone ?? '',
      gender: employee.gender ?? '',
      dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : '',
    });
    setEditing(true);
  }

  function handleChange(field: keyof EditForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    const dto: Record<string, string> = {};
    if (form.name.trim()) dto.name = form.name.trim();
    if (form.email.trim()) dto.email = form.email.trim();
    if (form.phone.trim()) dto.phone = form.phone.trim();
    if (form.gender) dto.gender = form.gender;
    if (form.dateOfBirth) dto.dateOfBirth = form.dateOfBirth;

    updateEmployee.mutate(dto, { onSuccess: () => setEditing(false) });
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
          {!editing && (
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit info
            </Button>
          )}
        </CardBody>
      </Card>

      {editing && (
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
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateEmployee.isPending}
              >
                {updateEmployee.isPending ? 'Saving…' : 'Save changes'}
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

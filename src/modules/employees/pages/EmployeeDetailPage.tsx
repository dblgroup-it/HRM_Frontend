import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Phone, User } from 'lucide-react';

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

import { useEmployee } from '../hooks/useEmployees';
import { EmployeeStatusBadge } from '../components/EmployeeStatusBadge';

export default function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const { data: employee, isLoading, isError } = useEmployee(id);

  if (isLoading) return <FullPageSpinner label="Loading employee…" />;

  if (isError || !employee) {
    return (
      <EmptyState
        title="Employee not found"
        description="We couldn’t find a record for this employee."
        action={
          <Link to={ROUTES.employees}>
            <Button variant="outline">Back to employees</Button>
          </Link>
        }
      />
    );
  }

  const details = [
    { label: 'Email', value: employee.email, icon: Mail },
    { label: 'Phone', value: employee.phone, icon: Phone },
    { label: 'Unit', value: employee.location, icon: MapPin },
  ];

  const records = [
    { label: 'Employee Code', value: employee.employeeCode },
    { label: 'Department', value: employee.department },
    ...(employee.section
      ? [{ label: 'Section', value: employee.section }]
      : []),
    ...(employee.grade ? [{ label: 'Grade', value: employee.grade }] : []),
    ...(employee.category
      ? [{ label: 'Category', value: employee.category }]
      : []),
    ...(employee.gender ? [{ label: 'Gender', value: employee.gender }] : []),
    {
      label: 'Date Joined',
      value: formatDate(employee.joinedAt, 'dd MMMM yyyy'),
    },
    ...(employee.dateOfBirth
      ? [
          {
            label: 'Date of Birth',
            value: formatDate(employee.dateOfBirth, 'dd MMMM yyyy'),
          },
        ]
      : []),
    ...(employee.exitDate
      ? [
          {
            label: 'Exit Date',
            value: formatDate(employee.exitDate, 'dd MMMM yyyy'),
          },
        ]
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
              <h1 className="text-xl font-semibold text-slate-900">
                {employee.name}
              </h1>
              <EmployeeStatusBadge status={employee.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {employee.jobTitle} · {employee.department}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <d.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">{d.label}</p>
                  <p className="text-sm font-medium text-slate-700">
                    {d.value}
                  </p>
                </div>
              </div>
            ))}

            {/* Line manager (top-level ReportingManager from ZingHR) */}
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
                    <p className="text-sm font-medium text-slate-700">
                      {employee.manager}
                    </p>
                  )}
                  {employee.managerCode && (
                    <p className="text-xs text-slate-400">
                      {employee.managerCode}
                    </p>
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
                  <dd className="mt-1 text-sm font-medium text-slate-800">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

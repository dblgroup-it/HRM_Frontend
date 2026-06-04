import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button, Input } from '@shared/components/ui';
import { useAuth } from '@modules/auth';

import { profileSchema, type ProfileFormValues } from '../schemas/profile.schema';

export function ProfileForm() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: '+880 1711 100100',
      jobTitle: user?.jobTitle ?? '',
    },
  });

  const onSubmit = handleSubmit(async () => {
    // Simulate a save round-trip.
    await new Promise((r) => setTimeout(r, 700));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
        <Input
          label="Job title"
          error={errors.jobTitle?.message}
          {...register('jobTitle')}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Save changes
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600">
            Profile updated successfully.
          </span>
        )}
      </div>
    </form>
  );
}

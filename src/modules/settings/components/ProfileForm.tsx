import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button, Input } from '@shared/components/ui';
import { useAuth } from '@modules/auth';
import { authApi } from '@modules/auth/api/auth.api';
import { useAuthStore } from '@modules/auth/store/auth.store';

import { profileSchema, type ProfileFormValues } from '../schemas/profile.schema';

export function ProfileForm() {
  const { user } = useAuth();
  const updateUser = useAuthStore((s) => s.updateUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await authApi.updateProfile(values);
      updateUser({ name: updated.name, email: updated.email, phone: updated.phone });
      toast.success('Profile updated');
    } catch {
      toast.error('Could not update profile');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {user?.jobTitle && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">Job title</p>
          <p className="text-sm text-slate-700">{user.jobTitle}</p>
          <p className="mt-0.5 text-xs text-slate-400">Synced from ZingHR — contact IT to update.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
      </div>

      <Button type="submit" isLoading={isSubmitting}>
        Save changes
      </Button>
    </form>
  );
}

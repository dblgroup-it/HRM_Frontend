import { useState } from 'react';
import { Send, Globe, CheckCircle2 } from 'lucide-react';

import {
  Badge,
  BusyOverlay,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
} from '@shared/components/ui';
import { cn } from '@shared/lib';
import { formatDate } from '@shared/utils';

import type { PreferredSource, Requisition } from '../types/requisition.types';
import { PREFERRED_SOURCE_LABEL, PREFERRED_SOURCES } from '../constants';
import { usePostRequisition } from '../hooks/useRequisitionActions';

export function PostingPanel({
  requisition,
  canContinue,
  onPosting,
}: {
  requisition: Requisition;
  canContinue: boolean;
  onPosting?: () => void;
}) {
  const [selected, setSelected] = useState<PreferredSource[]>(
    requisition.preferredSources.length
      ? requisition.preferredSources
      : ['job_advertisement']
  );
  const [closingDate, setClosingDate] = useState('');
  const post = usePostRequisition();

  const toggle = (source: PreferredSource) =>
    setSelected((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );

  if (requisition.posting) {
    const { sources, closingDate: closes, postedAt } = requisition.posting;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Posting · Step 4</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">
              Published on {formatDate(postedAt)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <Badge key={s} tone="brand">
                <Globe className="mr-1 h-3 w-3" />
                {PREFERRED_SOURCE_LABEL[s]}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Applications close on{' '}
            <span className="font-medium text-slate-700">
              {formatDate(closes)}
            </span>
            .
          </p>
        </CardBody>
      </Card>
    );
  }

  const canPost = canContinue && selected.length > 0 && closingDate !== '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Posting · Step 4</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Source of candidates
          </p>
          <div className="flex flex-wrap gap-2">
            {PREFERRED_SOURCES.map(({ value, label }) => {
              const active = selected.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!canContinue}
                  onClick={() => toggle(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    active
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Application closing date"
          type="date"
          disabled={!canContinue}
          value={closingDate}
          onChange={(e) => setClosingDate(e.target.value)}
        />

        {!canContinue && (
          <p className="text-sm text-slate-500">
            Corporate HR continues job posting after the role profile is ready.
          </p>
        )}

        {post.isError && (
          <p className="text-sm text-red-600">
            {(post.error as Error).message}
          </p>
        )}

        <Button
          disabled={!canPost}
          isLoading={post.isPending}
          leftIcon={<Send className="h-4 w-4" />}
          onClick={() => {
            onPosting?.();
            post.mutate({ id: requisition.id, sources: selected, closingDate });
          }}
        >
          Publish job posting
        </Button>
      </CardBody>
      <BusyOverlay show={post.isPending} label="Posting requisition…" />
    </Card>
  );
}

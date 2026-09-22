import { useState } from 'react';
import {
  Send,
  Globe,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

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
import { formatDate } from '@shared/utils';

import type { Requisition } from '../types/requisition.types';
import { preferredSourceLabel } from '../constants';
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
  const [closingDate, setClosingDate] = useState('');
  const post = usePostRequisition();

  if (requisition.posting) {
    const { sources, closingDate: closes, postedAt } = requisition.posting;
    /**
     * The link a candidate applies through.
     *
     * Shown to everyone who can see the requisition, not only to the
     * recruitment side: the unit's Factory HR is who people ask about a
     * vacancy in their factory, and they had no way to get at the link — it
     * lived inside the candidate pipeline, which is closed to them.
     */
    const applyLink = `${window.location.origin}/apply/${requisition.id}`;
    const copy = async () => {
      await navigator.clipboard.writeText(applyLink);
      toast.success('Job link copied — share it wherever you like');
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Posting · Step 5</CardTitle>
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
                {preferredSourceLabel(s)}
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

          <div className="rounded-xl border border-brand-200/70 bg-gradient-to-br from-brand-50/70 to-emerald-50/50 p-3.5">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
                <Share2 className="h-3.5 w-3.5" />
              </span>
              Public job link
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Anyone can open this and apply — send it to candidates, put it in
              a group, print it on a notice.
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-600">
                {applyLink}
              </code>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<ClipboardCopy className="h-4 w-4" />}
                onClick={copy}
              >
                Copy
              </Button>
              <a href={applyLink} target="_blank" rel="noreferrer">
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<ExternalLink className="h-4 w-4" />}
                >
                  Open
                </Button>
              </a>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const canPost = canContinue && closingDate !== '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Posting · Step 5</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {/* There is no channel to choose any more: publishing puts the post
            on the DBL career page, which is where applications come from. */}
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p className="text-sm text-slate-600">
            Publishes to the{' '}
            <span className="font-medium text-slate-700">DBL career page</span>,
            with a shareable application link for this requisition.
          </p>
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
            Head of Talent Acquisition continues job posting after the role profile is ready.
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
            post.mutate({ id: requisition.id, closingDate });
          }}
        >
          Publish job posting
        </Button>
      </CardBody>
      <BusyOverlay show={post.isPending} label="Posting requisition…" />
    </Card>
  );
}

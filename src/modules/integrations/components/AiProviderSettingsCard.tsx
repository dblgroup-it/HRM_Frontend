import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, PlugZap, Save, Sparkles, XCircle } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  SegmentedToggle,
  Select,
  Spinner,
} from '@shared/components/ui';
import { cn } from '@shared/lib';

import {
  useAiProviderSettings,
  useSaveAiProviderSettings,
  useTestAiProvider,
} from '../hooks/useAiProvider';
import type {
  AiProviderName,
  AiProviderSide,
  AiProviderTestResult,
} from '../types/aiProvider.types';

const NAMES: Record<AiProviderName, { title: string; vendor: string }> = {
  claude: { title: 'Claude', vendor: 'Anthropic' },
  gemini: { title: 'Gemini', vendor: 'Google' },
};

const modelLabel = (side: AiProviderSide, id: string) =>
  side.models.find((m) => m.id === id)?.label.split(' — ')[0] ?? id;

/**
 * Which AI answers TalentHub's requests — CV screening, drafting, document
 * checks — and with which key. One provider answers first; with fallback on,
 * a request it fails goes to the other. Keys are typed here, stored encrypted,
 * and never shown again: only their last four characters.
 */
export function AiProviderSettingsCard() {
  const { data, isLoading } = useAiProviderSettings();
  const save = useSaveAiProviderSettings();

  const [provider, setProvider] = useState<AiProviderName>('claude');
  const [fallback, setFallback] = useState(true);
  const [models, setModels] = useState<Record<AiProviderName, string>>({ claude: '', gemini: '' });
  const [keys, setKeys] = useState<Record<AiProviderName, string>>({ claude: '', gemini: '' });

  useEffect(() => {
    if (!data) return;
    setProvider(data.provider);
    setFallback(data.fallback);
    setModels({ claude: data.claude.model, gemini: data.gemini.model });
    setKeys({ claude: '', gemini: '' });
  }, [data]);

  if (isLoading || !data) {
    return (
      <Card>
        <CardBody className="flex justify-center py-10">
          <Spinner />
        </CardBody>
      </Card>
    );
  }

  const dirty =
    provider !== data.provider ||
    fallback !== data.fallback ||
    models.claude !== data.claude.model ||
    models.gemini !== data.gemini.model ||
    Boolean(keys.claude.trim()) ||
    Boolean(keys.gemini.trim());

  const other: AiProviderName = provider === 'claude' ? 'gemini' : 'claude';

  const submit = (extra: { claudeKey?: string; geminiKey?: string } = {}) =>
    save.mutate({
      provider,
      fallback,
      claudeModel: models.claude,
      geminiModel: models.gemini,
      ...(keys.claude.trim() ? { claudeKey: keys.claude.trim() } : {}),
      ...(keys.gemini.trim() ? { geminiKey: keys.gemini.trim() } : {}),
      ...extra,
    });

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          AI provider
        </CardTitle>
        <InUse order={data.order} data={data} />
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-500">
          The AI behind CV screening, job-analysis drafts, document checks and the proficiency
          tests. Choose which one answers first and give each its API key. A key is stored
          encrypted and never shown again — only its last four characters.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          {(['claude', 'gemini'] as const).map((p) => (
            <ProviderPanel
              key={p}
              name={p}
              side={data[p]}
              first={provider === p}
              onPick={() => setProvider(p)}
              model={models[p]}
              onModel={(m) => setModels((s) => ({ ...s, [p]: m }))}
              typedKey={keys[p]}
              onKey={(k) => setKeys((s) => ({ ...s, [p]: k }))}
              onRemoveKey={() => submit(p === 'claude' ? { claudeKey: '' } : { geminiKey: '' })}
              removing={save.isPending}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800">
              If {NAMES[provider].title} fails, ask {NAMES[other].title}
            </div>
            <div className="text-xs text-slate-500">
              An error, a refusal or an empty answer sends the same request to {NAMES[other].title}
              {data[other].hasKey || keys[other].trim() ? '' : ' — once it has a key'}.
            </div>
          </div>
          <SegmentedToggle value={fallback} onChange={setFallback} />
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={save.isPending}
            disabled={!dirty}
            onClick={() => submit()}
          >
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/** What answers right now, in order — or that nothing does. */
function InUse({
  order,
  data,
}: {
  order: AiProviderName[];
  data: { claude: AiProviderSide; gemini: AiProviderSide };
}) {
  if (!order.length) {
    return <Badge tone="warning">AI is off — add a key</Badge>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
      Answering:
      {order.map((p, i) => (
        <span key={p} className="inline-flex items-center gap-1.5">
          {i > 0 && <ArrowRight className="h-3 w-3 text-slate-400" aria-label="then" />}
          <Badge tone={i === 0 ? 'brand' : 'neutral'}>
            {modelLabel(data[p], data[p].model)}
          </Badge>
        </span>
      ))}
    </span>
  );
}

function ProviderPanel({
  name,
  side,
  first,
  onPick,
  model,
  onModel,
  typedKey,
  onKey,
  onRemoveKey,
  removing,
}: {
  name: AiProviderName;
  side: AiProviderSide;
  first: boolean;
  onPick: () => void;
  model: string;
  onModel: (m: string) => void;
  typedKey: string;
  onKey: (k: string) => void;
  onRemoveKey: () => void;
  removing: boolean;
}) {
  const [show, setShow] = useState(false);
  const test = useTestAiProvider();
  const [result, setResult] = useState<AiProviderTestResult | null>(null);

  // a changed key or model makes the last result stale
  useEffect(() => setResult(null), [typedKey, model]);

  const keyHint =
    side.keySource === 'settings'
      ? `Saved here, encrypted (${side.keyHint}). Type a new key to replace it.`
      : side.keySource === 'env'
        ? `Using the key in the server's .env (${side.keyHint}). A key saved here takes its place.`
        : 'No key yet.';

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border p-4 transition-colors',
        first ? 'border-brand-400 ring-1 ring-brand-200' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="radio"
            name="ai-provider-first"
            checked={first}
            onChange={onPick}
            className="h-4 w-4 accent-brand-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-800">
              {NAMES[name].title}
            </span>
            <span className="block text-xs text-slate-500">{NAMES[name].vendor}</span>
          </span>
        </label>
        {first ? (
          <Badge tone="brand">Answers first</Badge>
        ) : side.hasKey ? (
          <Badge tone="neutral">Fallback</Badge>
        ) : null}
      </div>

      <Select
        label="Model"
        value={model}
        onChange={(e) => onModel(e.target.value)}
        options={side.models.map((m) => ({ value: m.id, label: m.label }))}
      />

      <Input
        label="API key"
        type={show ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        value={typedKey}
        onChange={(e) => onKey(e.target.value)}
        placeholder={side.hasKey ? `•••••••••••• ${side.keyHint ?? ''}` : 'Paste the API key'}
        hint={keyHint}
        rightElement={
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label={show ? 'Hide key' : 'Show key'}
            title={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          leftIcon={<PlugZap className="h-4 w-4" />}
          isLoading={test.isPending}
          disabled={!side.hasKey && !typedKey.trim()}
          onClick={() =>
            test.mutate(
              { provider: name, apiKey: typedKey.trim() || undefined, model },
              { onSuccess: setResult },
            )
          }
        >
          Test
        </Button>
        {side.keySource === 'settings' && !typedKey && (
          <button
            type="button"
            disabled={removing}
            onClick={onRemoveKey}
            className="text-xs font-medium text-rose-600 hover:underline disabled:opacity-50"
          >
            Remove saved key
          </button>
        )}
      </div>

      {result && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg px-3 py-2 text-xs',
            result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800',
          )}
        >
          {result.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 break-words">
            {result.ok
              ? `${modelLabel(side, result.model)} answered in ${(result.ms / 1000).toFixed(1)} s${
                  typedKey.trim() ? ' — save to use this key.' : '.'
                }`
              : result.error}
          </span>
        </div>
      )}
    </div>
  );
}

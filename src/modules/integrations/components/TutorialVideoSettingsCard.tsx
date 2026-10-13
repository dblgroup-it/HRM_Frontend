import { useEffect, useState } from 'react';
import { ArrowUpRight, MonitorPlay, Save } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Input,
  Spinner,
} from '@shared/components/ui';
import {
  useSaveTutorialVideoSettings,
  useTutorialVideoSettings,
} from '@modules/tutorials';

const linkOf = (id: string | null) => (id ? `https://www.youtube.com/playlist?list=${id}` : '');

/**
 * The YouTube playlist on the Tutorials page — shown to everyone, whatever
 * their roles. The IT Helpdesk publishes the videos, so the link is set here
 * rather than in code; clearing it takes the videos off the page.
 */
export function TutorialVideoSettingsCard() {
  const { data, isLoading } = useTutorialVideoSettings();
  const save = useSaveTutorialVideoSettings();
  const [playlist, setPlaylist] = useState('');
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');

  useEffect(() => {
    if (!data) return;
    setPlaylist(linkOf(data.playlistId));
    setTitle(data.title);
    setChannel(data.channel);
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
    playlist.trim() !== linkOf(data.playlistId) ||
    title.trim() !== data.title ||
    channel.trim() !== data.channel;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <MonitorPlay className="h-4 w-4 text-brand-600" />
          Video tutorials
        </CardTitle>
        {data.playlistId ? (
          <a
            href={linkOf(data.playlistId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
          >
            Open the playlist <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-xs text-slate-400">Not shown on Tutorials</span>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-slate-500">
          The YouTube playlist on the <span className="font-medium text-slate-700">Tutorials</span> page.
          Everyone signed in sees it, whatever their roles, beside the guides written for them.
        </p>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <Input
            label="Playlist link"
            value={playlist}
            onChange={(e) => setPlaylist(e.target.value)}
            placeholder="https://youtube.com/playlist?list=…"
            hint="From the playlist’s Share button. Leave empty to take the videos off the page."
          />
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="TalentHub Web Application Configuration"
          />
          <Input
            label="Published by"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="DBL GROUP IT Helpdesk"
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            leftIcon={<Save className="h-4 w-4" />}
            isLoading={save.isPending}
            disabled={!dirty}
            onClick={() =>
              save.mutate({
                playlist: playlist.trim(),
                title: title.trim() || undefined,
                channel: channel.trim(),
              })
            }
          >
            Save
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

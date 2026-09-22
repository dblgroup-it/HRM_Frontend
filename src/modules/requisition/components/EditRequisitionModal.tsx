import { useEffect, useState } from 'react';

import { Button, Input, Modal, Select, Textarea } from '@shared/components/ui';
import { JOB_GRADES } from '@modules/salaryFixation';
import { useMasterData } from '@modules/master-data';

import type {
  EmploymentNature,
  Priority,
  Requisition,
} from '../types/requisition.types';
import { useUpdateRequisition } from '../hooks/useRequisitionActions';

const PRIORITY_OPTIONS = [
  { value: 'top', label: 'Top Priority' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'ordinary', label: 'Ordinary' },
];
const NATURE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'contractual', label: 'Contractual' },
];

export function EditRequisitionModal({
  requisition,
  open,
  onClose,
  gradeHint,
}: {
  requisition: Requisition;
  open: boolean;
  onClose: () => void;
  /** Organogram-configured grade + ZingHR grade reference, for context while picking. */
  gradeHint?: string;
}) {
  const update = useUpdateRequisition();

  const [grade, setGrade] = useState(requisition.grade ?? '');
  const [requiredPosts, setRequiredPosts] = useState(
    String(requisition.requiredPosts),
  );
  const [totalVacantPosts, setTotalVacantPosts] = useState(
    String(requisition.totalVacantPosts),
  );
  const { data: master } = useMasterData();
  const [placeOfPosting, setPlaceOfPosting] = useState(
    requisition.placeOfPosting,
  );
  const [neededDate, setWhenNeededDate] = useState(
    requisition.neededDate?.slice(0, 10) ?? '',
  );
  const [priority, setPriority] = useState<Priority>(requisition.priority);
  const [employmentNature, setEmploymentNature] = useState<EmploymentNature>(
    requisition.employmentNature,
  );
  const [jobDescription, setJobDescription] = useState(
    requisition.jobDescription,
  );
  const [education, setEducation] = useState(requisition.education);
  const [experience, setExperience] = useState(requisition.experience);
  const [others, setOthers] = useState(requisition.others);

  // The modal stays mounted while closed (only `open` toggles visibility), so
  // the initial useState() values above go stale if `requisition` changes
  // (e.g. a live update from another approver) between opens. Resync on open.
  useEffect(() => {
    if (!open) return;
    setGrade(requisition.grade ?? '');
    setRequiredPosts(String(requisition.requiredPosts));
    setTotalVacantPosts(String(requisition.totalVacantPosts));
    setPlaceOfPosting(requisition.placeOfPosting);
    setWhenNeededDate(requisition.neededDate?.slice(0, 10) ?? '');
    setPriority(requisition.priority);
    setEmploymentNature(requisition.employmentNature);
    setJobDescription(requisition.jobDescription);
    setEducation(requisition.education);
    setExperience(requisition.experience);
    setOthers(requisition.others);
  }, [open, requisition]);

  const save = () => {
    update.mutate(
      {
        id: requisition.id,
        input: {
          grade,
          requiredPosts: Number(requiredPosts) || 1,
          totalVacantPosts: Number(totalVacantPosts) || 1,
          placeOfPosting,
          neededDate: neededDate || undefined,
          priority,
          employmentNature,
          jobDescription,
          education,
          experience,
          others,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit requisition details"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button isLoading={update.isPending} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Select
            label="Job Grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            options={JOB_GRADES.map((g) => ({ value: g, label: g }))}
            placeholder="Not yet confirmed"
          />
          {gradeHint && (
            <p className="mt-1 text-xs text-slate-400">{gradeHint}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nos. of required post"
            type="number"
            min={1}
            value={requiredPosts}
            onChange={(e) => setRequiredPosts(e.target.value)}
          />
          <Input
            label="Total vacant post"
            type="number"
            min={1}
            value={totalVacantPosts}
            onChange={(e) => setTotalVacantPosts(e.target.value)}
          />
          <Select
            label="Place of posting"
            placeholder="Select the job location"
            // The offer letter's job-location list, so the requisition and the
            // letter name the same site. Requisitions raised when this was a
            // zone (or free text) keep their value as an option, so editing
            // something else here can't silently blank it.
            options={[
              ...(master?.jobLocations ?? []).map((l) => ({
                value: l,
                label: l,
              })),
              ...(placeOfPosting &&
              !(master?.jobLocations ?? []).includes(placeOfPosting)
                ? [{ value: placeOfPosting, label: `${placeOfPosting} (legacy)` }]
                : []),
            ]}
            value={placeOfPosting}
            onChange={(e) => setPlaceOfPosting(e.target.value)}
          />
          <Input
            label="When needed"
            type="date"
            value={neededDate}
            onChange={(e) => setWhenNeededDate(e.target.value)}
          />
          <Select
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          />
          <Select
            label="Employment nature"
            options={NATURE_OPTIONS}
            value={employmentNature}
            onChange={(e) =>
              setEmploymentNature(e.target.value as EmploymentNature)
            }
          />
        </div>
        <Textarea
          label="Job description"
          rows={3}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Education & training"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          />
          <Input
            label="Experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>
        <Input
          label="Others"
          value={others}
          onChange={(e) => setOthers(e.target.value)}
        />
        {update.isError && (
          <p className="text-sm text-red-600">
            {(update.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}

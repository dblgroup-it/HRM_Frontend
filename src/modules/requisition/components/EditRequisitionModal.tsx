import { useState } from 'react';

import { Button, Input, Modal, Select, Textarea } from '@shared/components/ui';

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
}: {
  requisition: Requisition;
  open: boolean;
  onClose: () => void;
}) {
  const update = useUpdateRequisition();

  const [requiredPosts, setRequiredPosts] = useState(
    String(requisition.requiredPosts),
  );
  const [totalVacantPosts, setTotalVacantPosts] = useState(
    String(requisition.totalVacantPosts),
  );
  const [placeOfPosting, setPlaceOfPosting] = useState(
    requisition.placeOfPosting,
  );
  const [whenNeededDate, setWhenNeededDate] = useState(
    requisition.whenNeededDate?.slice(0, 10) ?? '',
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

  const save = () => {
    update.mutate(
      {
        id: requisition.id,
        input: {
          requiredPosts: Number(requiredPosts) || 1,
          totalVacantPosts: Number(totalVacantPosts) || 1,
          placeOfPosting,
          whenNeededDate: whenNeededDate || undefined,
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
          <Input
            label="Place of posting"
            value={placeOfPosting}
            onChange={(e) => setPlaceOfPosting(e.target.value)}
          />
          <Input
            label="When needed"
            type="date"
            value={whenNeededDate}
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

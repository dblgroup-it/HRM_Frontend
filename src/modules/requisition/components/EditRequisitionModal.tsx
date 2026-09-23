import { useEffect, useState } from 'react';

import {
  Button,
  Combobox,
  Input,
  Modal,
  Select,
  Textarea,
} from '@shared/components/ui';
import type { SelectOption } from '@shared/types';
import { wholeNumberInput } from '@shared/utils';
import { JOB_GRADES } from '@modules/salaryFixation';
import { sectionKey, useMasterData } from '@modules/master-data';

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
/** The master list, plus the requisition's own value if the list has since
 * lost it — so opening the modal to fix something else never blanks it. */
function withCurrent(list: readonly string[], current: string): SelectOption[] {
  const opts = list.map((v) => ({ value: v, label: v }));
  return current && !list.includes(current)
    ? [...opts, { value: current, label: `${current} (as raised)` }]
    : opts;
}

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

  const [designation, setDesignation] = useState(requisition.designation);
  const [department, setDepartment] = useState(requisition.department);
  const [section, setSection] = useState(requisition.section ?? '');
  const [subSection, setSubSection] = useState(requisition.subSection ?? '');
  const [lineOfBusiness, setLineOfBusiness] = useState(
    requisition.lineOfBusiness ?? '',
  );
  const [vacantDate, setVacantDate] = useState(
    requisition.vacantDate?.slice(0, 10) ?? '',
  );
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
    setDesignation(requisition.designation);
    setDepartment(requisition.department);
    setSection(requisition.section ?? '');
    setSubSection(requisition.subSection ?? '');
    setLineOfBusiness(requisition.lineOfBusiness ?? '');
    setVacantDate(requisition.vacantDate?.slice(0, 10) ?? '');
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
          designation,
          department,
          section,
          subSection,
          lineOfBusiness,
          vacantDate: vacantDate || undefined,
          grade,
          requiredPosts: Math.max(1, Math.trunc(Number(requiredPosts)) || 1),
          totalVacantPosts: Math.max(0, Math.trunc(Number(totalVacantPosts)) || 0),
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

  // The same cascade as the raise form: sections hang off the department,
  // sub-sections off the department + section pair.
  const sectionChoices = department
    ? (master?.departmentSections[department] ?? [])
    : [];
  const subSectionChoices =
    department && section
      ? (master?.sectionSubSections[sectionKey(department, section)] ??
        master?.subSections ??
        [])
      : [];

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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          A · Vacancy information
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Combobox
            label="Designation"
            options={withCurrent(master?.designations ?? [], designation)}
            value={designation}
            onChange={setDesignation}
          />
          <Combobox
            label="Department"
            options={withCurrent(master?.departments ?? [], department)}
            value={department}
            onChange={(v) => {
              if (v === department) return;
              setDepartment(v);
              // A section belongs to its department.
              setSection('');
              setSubSection('');
            }}
            hint="The approval chain stays as it was raised."
          />
          <Combobox
            label="Section"
            placeholder="None"
            options={withCurrent(sectionChoices, section)}
            value={section}
            onChange={(v) => {
              setSection(v);
              setSubSection('');
            }}
            disabled={!department}
          />
          <Combobox
            label="Sub-section"
            placeholder="None"
            options={withCurrent(subSectionChoices, subSection)}
            value={subSection}
            onChange={setSubSection}
            disabled={!section}
          />
          <Select
            label="Line of business"
            placeholder="Not set"
            options={withCurrent(master?.linesOfBusiness ?? [], lineOfBusiness)}
            value={lineOfBusiness}
            onChange={(e) => setLineOfBusiness(e.target.value)}
          />
          <Input
            label="Vacant date"
            type="date"
            value={vacantDate}
            onChange={(e) => setVacantDate(e.target.value)}
          />
        </div>
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
            {...wholeNumberInput}
            min={1}
            value={requiredPosts}
            onChange={(e) => setRequiredPosts(e.target.value)}
          />
          <Input
            label="Total vacant post"
            {...wholeNumberInput}
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

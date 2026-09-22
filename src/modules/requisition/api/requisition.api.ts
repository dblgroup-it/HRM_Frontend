import { ENV, MOCK_LATENCY } from '@shared/constants';
import { http } from '@shared/api';
import { delay } from '@shared/utils';
import type { ApiResponse, Paginated } from '@shared/types';

import type {
  ApprovalDecision,
  ApprovalStep,
  CreateRequisitionPayload,
  Facilities,
  FacilityKey,
  JobAnalysisDraft,
  JobAnalysisDraftInput,
  JobAnalysisInput,
  JobAnalysisOwnership,
  Requisition,
  RequisitionDraft,
  RequisitionFilters,
  RequisitionSignatories,
  RequirementType,
  RoleProfile,
  UpdateRequisitionInput,
} from '../types/requisition.types';
import { APPROVAL_ROLE_META, buildApprovalRoles } from '../constants';

const CURRENT_USER = 'Ayesha Rahman';

/** Build a full Facilities object for mock data — every request auto-confirmed by HR. */
function mockFacilities(requests: Partial<Record<FacilityKey, { requested: boolean; option?: string; note?: string }>>): Facilities {
  const keys: FacilityKey[] = ['laptopDesktop', 'transport', 'dormitory', 'seating'];
  const out = {} as Facilities;
  for (const key of keys) {
    const r = requests[key];
    out[key] = {
      requested: r?.requested ?? false,
      option: r?.option ?? null,
      note: r?.note ?? '',
      status: r?.requested ? 'confirmed' : 'pending',
      hrNote: '',
      decidedBy: r?.requested ? CURRENT_USER : null,
      decidedAt: r?.requested ? '2026-01-01T00:00:00.000Z' : null,
    };
  }
  return out;
}

/** Mirrors the backend's `buildInitialFacilities` — HR hasn't acted yet. */
function initialFacilities(input: CreateRequisitionPayload['facilities']): Facilities {
  const keys: FacilityKey[] = ['laptopDesktop', 'transport', 'dormitory', 'seating'];
  const out = {} as Facilities;
  for (const key of keys) {
    const r = input[key];
    out[key] = {
      requested: r?.requested ?? false,
      option: r?.option ?? null,
      note: r?.note ?? '',
      status: 'pending',
      hrNote: '',
      decidedBy: null,
      decidedAt: null,
    };
  }
  return out;
}

/** Build the dynamic sign-off chain from routing rules + intake signatories. */
function buildChain(
  requirement: RequirementType,
  signatories: RequisitionSignatories
): ApprovalStep[] {
  const assignees: Partial<Record<string, string>> = {
    department_head: signatories.departmentHeadName,
    factory_hr: signatories.factoryHRName,
  };
  return buildApprovalRoles(requirement).map((role, index) => ({
    id: `mock-step-${role}-${index}`,
    role,
    approverUserId: null,
    title: APPROVAL_ROLE_META[role].title,
    subtitle: APPROVAL_ROLE_META[role].subtitle,
    assignee: assignees[role] ?? '',
    status: 'pending',
    note: '',
    actedAt: null,
  }));
}

/** Mark the first N steps approved (seed helper). */
function approveFirst(chain: ApprovalStep[], n: number): ApprovalStep[] {
  return chain.map((step, i) =>
    i < n
      ? {
          ...step,
          status: 'approved',
          assignee: step.assignee || CURRENT_USER,
          actedAt: '2026-04-25T10:00:00Z',
        }
      : step
  );
}

const SIGN: RequisitionSignatories = {
  departmentHeadName: 'Mohammad Abdul Latif',
  departmentHeadDesignation: 'GM-Production',
  factoryHRName: 'Omar Faruque',
};

let SEQUENCE = 4;

let STORE: Requisition[] = [
  {
    id: 'req_1001',
    code: 'REQ-2026-001',
    designation: 'Assistant Production Officer',
    grade: null,
    requirementType: 'existing',
    requiredPosts: 3,
    totalVacantPosts: 3,
    unitFactory: 'Jinnat Textile Mills Ltd',
    department: 'Production & QC',
    placeOfPosting: 'Shreehatta Economic Zone, Moulvibazar',
    vacantDate: null,
    neededDate: '2026-05-20',
    priority: 'top',
    employmentNature: 'permanent',
    contractualPurpose: '',
    jobDescription:
      'Support yarn manufacturing production and quality control operations across shifts.',
    education:
      'B.Sc. in Textile Engineering (Yarn Manufacturing) only for BUTex / AUST',
    experience: 'Fresh graduates are encouraged to apply',
    others: 'Ability to work in a shift-based environment',
    facilities: mockFacilities({}),
    preferredSources: ['job_advertisement', 'headhunting'],
    // existing + factory ⇒ Dept Head → Factory HR → Head of Talent Acquisition
    status: 'pending_approval',
    approvalChain: approveFirst(buildChain('existing', SIGN), 1),
    activityLog: [
      {
        actor: 'Mohammad Abdul Latif',
        action: 'approved',
        note: 'Raised against vacant sanctioned seats.',
        createdAt: '2026-04-25T10:00:00Z',
      },
    ],
    roleProfile: null,
    posting: null,
    raisedBy: 'Mohammad Abdul Latif',
    createdAt: '2026-04-20T08:00:00Z',
    updatedAt: '2026-04-25T10:00:00Z',
  },
  {
    id: 'req_1002',
    code: 'REQ-2026-002',
    designation: 'Senior Merchandiser',
    grade: null,
    requirementType: 'new',
    requiredPosts: 1,
    totalVacantPosts: 1,
    unitFactory: 'Jinnat Apparels Ltd',
    department: 'Merchandising',
    placeOfPosting: 'Kashimpur, Gazipur',
    vacantDate: null,
    neededDate: '2026-06-15',
    priority: 'moderate',
    employmentNature: 'permanent',
    contractualPurpose: '',
    jobDescription:
      'Own buyer communication and order execution for woven garment programmes.',
    education: 'Bachelor’s degree; Textile / Apparel Merchandising preferred',
    experience: '5+ years in woven garment merchandising',
    others: 'Strong buyer handling and costing skills',
    facilities: mockFacilities({
      laptopDesktop: { requested: true, option: 'laptop', note: 'Buyer correspondence and costing sheets' },
      seating: { requested: true, option: 'new' },
    }),
    preferredSources: ['headhunting', 'cv_bank'],
    // new + factory ⇒ Dept Head → Factory HR → SBU Head → Head of Talent Acquisition
    status: 'profile_generated',
    approvalChain: approveFirst(buildChain('new', SIGN), 4),
    activityLog: [],
    roleProfile: {
      summary:
        'Senior Merchandiser driving order execution for Jinnat Apparels Ltd within Merchandising.',
      jobDescription:
        'Jinnat Apparels Ltd is seeking a Senior Merchandiser to manage buyer relationships and order execution end-to-end.',
      responsibilities: [
        'Own end-to-end buyer communication and order execution',
        'Prepare costing and negotiate with buyers',
        'Coordinate with production and QC on timelines',
        'Track shipments and resolve issues proactively',
      ],
      requirements: [
        '5+ years in woven garment merchandising',
        'Strong buyer handling and costing skills',
        'Bachelor’s in Textile / Apparel Merchandising',
        'Excellent communication',
      ],
      generatedAt: '2026-05-02T09:00:00Z',
    },
    posting: null,
    raisedBy: 'Mohammad Abdul Latif',
    createdAt: '2026-04-28T08:00:00Z',
    updatedAt: '2026-05-02T09:00:00Z',
  },
  {
    id: 'req_1003',
    code: 'REQ-2026-003',
    designation: 'HR Business Partner',
    grade: null,
    requirementType: 'existing',
    requiredPosts: 1,
    totalVacantPosts: 1,
    unitFactory: 'DBL Group — Head Office',
    department: 'Human Resources',
    placeOfPosting: 'DBL Group HQ, Dhaka',
    vacantDate: null,
    neededDate: '2026-06-10',
    priority: 'moderate',
    employmentNature: 'permanent',
    contractualPurpose: '',
    jobDescription:
      'Partner with business leaders on talent, engagement and people processes.',
    education: 'Master’s in HRM preferred',
    experience: '5+ years as an HR generalist / HRBP',
    others: 'Strong knowledge of Bangladesh labour law',
    facilities: mockFacilities({
      laptopDesktop: { requested: true, option: 'laptop', note: 'HRIS and reporting' },
    }),
    preferredSources: ['headhunting'],
    // existing + HO ⇒ Dept Head → Head of Talent Acquisition
    status: 'posted',
    approvalChain: approveFirst(buildChain('existing', SIGN), 2),
    activityLog: [],
    roleProfile: {
      summary:
        'HR Business Partner aligning people strategy with the business at DBL Group Head Office.',
      jobDescription:
        'DBL Group is seeking an HR Business Partner to act as a trusted advisor to business leaders.',
      responsibilities: [
        'Partner with leaders on workforce planning',
        'Drive engagement and retention',
        'Advise on employee relations and compliance',
        'Support talent and performance cycles',
      ],
      requirements: [
        '5+ years in HRBP / generalist roles',
        'Strong labour-law knowledge',
        'Excellent stakeholder management',
        'Master’s in HRM preferred',
      ],
      generatedAt: '2026-05-05T09:00:00Z',
    },
    posting: {
      sources: ['headhunting'],
      closingDate: '2026-06-08',
      postedAt: '2026-05-06T09:00:00Z',
    },
    raisedBy: 'Sadia Karim',
    createdAt: '2026-04-30T08:00:00Z',
    updatedAt: '2026-05-06T09:00:00Z',
  },
];

function paginate(
  items: Requisition[],
  filters: RequisitionFilters
): Paginated<Requisition> {
  const { search, status, unitFactory, page = 1, pageSize = 8 } = filters;
  let result = [...items].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  if (search) {
    const term = search.toLowerCase();
    result = result.filter(
      (r) =>
        r.designation.toLowerCase().includes(term) ||
        r.code.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term) ||
        r.unitFactory.toLowerCase().includes(term)
    );
  }
  if (status && status !== 'all') {
    result = result.filter((r) => r.status === status);
  }
  if (unitFactory && unitFactory !== 'all') {
    result = result.filter((r) => r.unitFactory === unitFactory);
  }

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return {
    items: result.slice(start, start + pageSize),
    meta: { page, pageSize, total, totalPages },
  };
}

function synthesizeRoleProfile(req: Requisition): RoleProfile {
  return {
    summary: `${req.designation} supporting ${req.department} at ${req.unitFactory}, based in ${req.placeOfPosting}.`,
    jobDescription:
      req.jobDescription ||
      `${req.unitFactory} is seeking a ${req.designation} for the ${req.department} department.`,
    responsibilities: [
      `Deliver ${req.department} outcomes for ${req.unitFactory}`,
      'Maintain quality, safety and compliance standards',
      'Collaborate with cross-functional teams',
      'Report progress and escalate risks',
    ],
    requirements: [
      `Education: ${req.education}`,
      `Experience: ${req.experience}`,
      ...(req.others ? [req.others] : []),
      `Suitable for ${req.requiredPosts} position(s)`,
    ],
    generatedAt: new Date().toISOString(),
  };
}

export const requisitionApi = {
  list(filters: RequisitionFilters = {}): Promise<Paginated<Requisition>> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => paginate(STORE, filters));
    }
    return http
      .get<ApiResponse<Paginated<Requisition>>>('/requisitions', {
        params: filters,
      })
      .then((res) => res.data);
  },

  /** AI quick-fill: plain-language vacancy description → drafted form values. */
  draft(prompt: string): Promise<RequisitionDraft> {
    return http
      .post<ApiResponse<RequisitionDraft>>(
        '/requisitions/draft',
        { prompt },
        { timeout: 90_000 },
      )
      .then((res) => res.data);
  },

  /**
   * AI-draft section B from section A.
   *
   * Returns a draft; nothing is saved. What is already typed goes up with the
   * request so a redraft builds on the writer's own words rather than
   * replacing them.
   */
  draftJobAnalysis(
    id: string,
    input: JobAnalysisDraftInput,
  ): Promise<JobAnalysisDraft> {
    return http
      .post<ApiResponse<JobAnalysisDraft>>(
        `/requisitions/${id}/job-analysis/draft`,
        input,
        { timeout: 90_000 },
      )
      .then((res) => res.data);
  },

  /** Status counts for the list page's tiles — counted server-side. */
  stats(
    filters: RequisitionFilters = {},
  ): Promise<{ total: number; byStatus: Record<string, number> }> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => {
        const byStatus: Record<string, number> = {};
        for (const r of STORE) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
        return { total: STORE.length, byStatus };
      });
    }
    return http
      .get<ApiResponse<{ total: number; byStatus: Record<string, number> }>>(
        '/requisitions/stats',
        { params: filters },
      )
      .then((res) => res.data);
  },

  getById(id: string): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => {
        const found = STORE.find((r) => r.id === id);
        if (!found) throw new Error('Requisition not found');
        return found;
      });
    }
    return http
      .get<ApiResponse<Requisition>>(`/requisitions/${id}`)
      .then((res) => res.data);
  },

  create(payload: CreateRequisitionPayload): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => {
        SEQUENCE += 1;
        const now = new Date().toISOString();
        const { signatories, facilities, replacements, ...fields } = payload;
        const created: Requisition = {
          ...fields,
          grade: null,
          // Section B is written at the job-analysis stage, not here.
          jobDescription: '',
          education: '',
          experience: '',
          others: '',
          preferredSources: [],
          jobAnalysis: {
            assignee: null,
            completedBy: null,
            completedAt: null,
            returnedAt: null,
            returnNote: null,
          },
          // The mock stands in for the server, which assigns the ids.
          replacements: (replacements ?? []).map((r, i) => ({
            id: `rep_${1000 + SEQUENCE}_${i}`,
            employeeName: r.employeeName,
            employeeCode: r.employeeCode ?? null,
            separationReason: r.separationReason ?? null,
            vacantDate: r.vacantDate ?? null,
            remarks: r.remarks ?? null,
          })),
          designationLabel: [
            payload.designation,
            ...(payload.alternateDesignations ?? []),
          ].join(' / '),
          facilities: initialFacilities(facilities),
          id: `req_${1000 + SEQUENCE}`,
          code: `REQ-2026-${String(SEQUENCE).padStart(3, '0')}`,
          status: 'pending_job_analysis',
          approvalChain: buildChain(payload.requirementType, signatories),
          activityLog: [],
          roleProfile: null,
          posting: null,
          raisedBy: signatories.departmentHeadName || CURRENT_USER,
          createdAt: now,
          updatedAt: now,
        };
        STORE = [created, ...STORE];
        return created;
      });
    }
    // requirementType is now the requisitioner's own declaration, so it goes
    // to the API rather than being stripped (it used to be derived server-side
    // from the organogram).
    const body = payload;
    return http
      .post<ApiResponse<Requisition>>('/requisitions', body)
      .then((res) => res.data);
  },

  update(id: string, input: UpdateRequisitionInput): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({ ...r, ...input }))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(`/requisitions/${id}`, input)
      .then((res) => res.data);
  },

  /** Requisitioner sends a clarified requisition back into the chain. */
  resubmit(id: string): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({
          ...r,
          approvalChain: r.approvalChain.map((s) => ({
            ...s,
            status: 'pending' as const,
            note: '',
            actedAt: null,
          })),
        }))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(`/requisitions/${id}/resubmit`)
      .then((res) => res.data);
  },

  /** HR (whoever's turn it currently is) confirms or skips facility requests. */
  updateFacilities(
    id: string,
    decisions?: { key: FacilityKey; status: 'confirmed' | 'skipped'; hrNote?: string }[],
    /** Complete list of the fixed appointment terms; omit to leave unchanged. */
    specialNotes?: string[]
  ): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => {
          const next = { ...r.facilities };
          for (const d of decisions ?? []) {
            next[d.key] = {
              ...next[d.key],
              status: d.status,
              hrNote: d.hrNote ?? '',
              decidedBy: CURRENT_USER,
              decidedAt: new Date().toISOString(),
            };
          }
          return {
            ...r,
            facilities: next,
            specialNotes: specialNotes ?? r.specialNotes,
          };
        })
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(`/requisitions/${id}/facilities`, {
        // Sending an empty decisions array would fail ArrayMinSize; a
        // notes-only save simply omits the field.
        ...(decisions?.length ? { decisions } : {}),
        ...(specialNotes ? { specialNotes } : {}),
      })
      .then((res) => res.data);
  },

  /**
   * Act on the active (first pending) sign-off.
   *  - approved   → advance; last step ⇒ requisition approved.
   *  - rejected   → requisition rejected.
   *  - need_more_info → roll back to the previous approver (re-approval needed).
   */
  act(
    id: string,
    decision: ApprovalDecision,
    note: string
  ): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => applyDecision(r, decision, note))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(`/requisitions/${id}/approval`, {
        decision,
        note,
      })
      .then((res) => res.data);
  },

  /** People holding the Corporate Recruiter role for this requisition's unit. */
  listRecruiters(
    id: string,
  ): Promise<{ id: string; name: string; employeeCode: string }[]> {
    return http
      .get<ApiResponse<{ id: string; name: string; employeeCode: string }[]>>(
        `/requisitions/${id}/recruiters`,
      )
      .then((res) => res.data);
  },

  /** Nominate (or clear, with null) the Corporate Recruiter for a requisition. */
  assignRecruiter(id: string, recruiterId: string | null): Promise<Requisition> {
    return http
      .patch<ApiResponse<Requisition>>(`/requisitions/${id}/recruiter`, {
        recruiterId,
      })
      .then((res) => res.data);
  },

  generateRoleProfile(id: string): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY * 1.5).then(() =>
        updateStore(id, (r) => ({
          ...r,
          status: 'profile_generated',
          roleProfile: synthesizeRoleProfile(r),
        }))
      );
    }
    return http
      .post<ApiResponse<Requisition>>(`/requisitions/${id}/role-profile`, undefined, {
        timeout: 90_000,
      })
      .then((res) => res.data);
  },

  updateRoleProfile(
    id: string,
    input: {
      summary: string;
      jobDescription: string;
      responsibilities: string[];
      requirements: string[];
    }
  ): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({
          ...r,
          status: 'profile_generated',
          roleProfile: {
            ...input,
            generatedAt: new Date().toISOString(),
            generatedBy: 'manual',
          },
        }))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(`/requisitions/${id}/role-profile`, input)
      .then((res) => res.data);
  },

  post(id: string, closingDate: string): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({
          ...r,
          status: 'posted',
          posting: {
            sources: ['career_page'],
            closingDate,
            postedAt: new Date().toISOString(),
          },
        }))
      );
    }
    return http
      .post<ApiResponse<Requisition>>(`/requisitions/${id}/post`, {
        closingDate,
      })
      .then((res) => res.data);
  },

  /**
   * Section B — the unit's Factory HR writes the job analysis and, unless
   * `submit: false`, sends the requisition on to its approval chain.
   */
  saveJobAnalysis(id: string, input: JobAnalysisInput): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({
          ...r,
          jobDescription: input.jobDescription ?? r.jobDescription,
          education: input.education ?? r.education,
          experience: input.experience ?? r.experience,
          others: input.others ?? r.others,
          ...(input.submit === false
            ? {}
            : { status: 'pending_approval' as const }),
        }))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(
        `/requisitions/${id}/job-analysis`,
        input
      )
      .then((res) => res.data);
  },

  /**
   * Who owns the job analysis on this requisition, and may I write it?
   *
   * Asked of the server: whether Corporate HR / a recruiter is covering for a
   * unit depends on who holds Factory HR there, which the browser can't know.
   */
  jobAnalysisOwnership(id: string): Promise<JobAnalysisOwnership> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() => ({
        canComplete: true,
        viaFactoryHr: true,
        owners: [],
        assignee: null,
      }));
    }
    return http
      .get<ApiResponse<JobAnalysisOwnership>>(
        `/requisitions/${id}/job-analysis`
      )
      .then((res) => res.data);
  },

  /** Factory HR hands it back to the raiser instead, with a reason. */
  returnForChanges(id: string, note: string): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({
          ...r,
          jobAnalysis: {
            assignee: null,
            completedBy: null,
            completedAt: null,
            returnedAt: new Date().toISOString(),
            returnNote: note,
          },
        }))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(
        `/requisitions/${id}/job-analysis/return`,
        { note }
      )
      .then((res) => res.data);
  },

  /** The raiser amends a returned requisition and resends it. */
  resendForJobAnalysis(id: string): Promise<Requisition> {
    if (ENV.USE_MOCK_API) {
      return delay(MOCK_LATENCY).then(() =>
        updateStore(id, (r) => ({
          ...r,
          jobAnalysis: {
            assignee: null,
            completedBy: null,
            completedAt: null,
            returnedAt: null,
            returnNote: null,
          },
        }))
      );
    }
    return http
      .patch<ApiResponse<Requisition>>(
        `/requisitions/${id}/job-analysis/resend`,
        {}
      )
      .then((res) => res.data);
  },

  uploadAttachment(id: string, file: File): Promise<Requisition> {
    const fd = new FormData();
    fd.append('file', file);
    return http
      .post<ApiResponse<Requisition>>(`/requisitions/${id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },

  removeAttachment(id: string, fileId: string): Promise<Requisition> {
    return http
      .delete<ApiResponse<Requisition>>(
        `/requisitions/${id}/attachments/${fileId}`
      )
      .then((res) => res.data);
  },
};

function applyDecision(
  r: Requisition,
  decision: ApprovalDecision,
  note: string
): Requisition {
  const idx = r.approvalChain.findIndex((s) => s.status === 'pending');
  if (idx === -1) return r;

  const now = new Date().toISOString();
  const actor = r.approvalChain[idx].assignee || CURRENT_USER;
  const log = [...r.activityLog, { actor, action: decision, note, createdAt: now }];

  if (decision === 'rejected') {
    const chain = r.approvalChain.map((s, i) =>
      i === idx ? { ...s, status: 'rejected' as const, note, actedAt: now } : s
    );
    return { ...r, approvalChain: chain, activityLog: log, status: 'rejected' };
  }

  if (decision === 'need_more_info') {
    // Roll back to the previous approver, if any (they must re-approve).
    if (idx === 0) {
      return { ...r, activityLog: log };
    }
    const chain = r.approvalChain.map((s, i) =>
      i === idx - 1
        ? { ...s, status: 'pending' as const, note, actedAt: null }
        : s
    );
    return { ...r, approvalChain: chain, activityLog: log };
  }

  // approved
  const chain = r.approvalChain.map((s, i) =>
    i === idx
      ? { ...s, status: 'approved' as const, assignee: actor, note, actedAt: now }
      : s
  );
  const allApproved = chain.every((s) => s.status === 'approved');
  return {
    ...r,
    approvalChain: chain,
    activityLog: log,
    status: allApproved ? 'approved' : 'pending_approval',
  };
}

function updateStore(
  id: string,
  updater: (r: Requisition) => Requisition
): Requisition {
  let updated: Requisition | undefined;
  STORE = STORE.map((r) => {
    if (r.id !== id) return r;
    updated = { ...updater(r), updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) throw new Error('Requisition not found');
  return updated;
}

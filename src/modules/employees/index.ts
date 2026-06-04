export { default as EmployeesPage } from './pages/EmployeesPage';
export { default as EmployeeDetailPage } from './pages/EmployeeDetailPage';
export { useEmployees, useEmployee, employeeKeys } from './hooks/useEmployees';
export { employeeApi } from './api/employee.api';
export { MOCK_EMPLOYEES, DEPARTMENTS } from './data/employees.mock';
export { EMPLOYMENT_TYPE_LABEL } from './constants';
export type {
  Employee,
  EmployeeFilters,
  EmploymentStatus,
  EmploymentType,
} from './types/employee.types';

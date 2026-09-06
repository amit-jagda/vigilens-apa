import { addPersonFromFacePhoto, listPeopleDirectory } from './advancedpeopleanalytics';
import type { PersonSummaryItem } from '@/types/advancedpeopleanalytics';

export async function enrollStaffMember(data: {
  faceFile: File;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department?: string;
}): Promise<any> {
  const formData = new FormData();
  formData.append('file', data.faceFile);
  formData.append('first_name', data.firstName);
  formData.append('last_name', data.lastName);
  formData.append('registration_type', 'employee');
  formData.append('employee_code', data.employeeCode);

  return await addPersonFromFacePhoto(formData);
}

export async function listStaffMembers(): Promise<PersonSummaryItem[]> {
  const response = await listPeopleDirectory({ person_type: 'employee' });
  return response?.data || [];
}

export type StudentFormOption = { id: string; name: string; code?: string; campusId?: string | null; classId?: string };
export type StudentFormOptions = {
  campuses: StudentFormOption[];
  academicYears: StudentFormOption[];
  classes: StudentFormOption[];
  sections: StudentFormOption[];
};

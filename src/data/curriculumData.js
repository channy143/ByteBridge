// BTLED ICT 4-Year Academic Prospectus / Curriculum Structure
// Program: Bachelor of Technology and Livelihood Education (BTLED) - Major in ICT

export const BTLED_PROGRAM_INFO = {
  name: 'Bachelor of Technology and Livelihood Education',
  major: 'Information and Communications Technology (ICT)',
  code: 'BTLED-ICT',
  totalYears: 4,
  totalSemesters: 8,
  department: 'College of Education & Information Technology',
  description: 'Curriculum designed to prepare educators and technologists proficient in computing fundamentals, digital media, instructional systems, and modern IT pedagogy.',
};

export const DEFAULT_BTLED_ICT_CURRICULUM = [
  // ==========================================
  // YEAR 1 - FIRST SEMESTER (20 Units)
  // ==========================================
  {
    id: 'btled-y1-s1-01',
    subject_code: 'GE 1',
    subject_title: 'Understanding the Self',
    year_level: '1',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 1,
  },
  {
    id: 'btled-y1-s1-02',
    subject_code: 'GE 2',
    subject_title: 'Readings in Philippine History',
    year_level: '1',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 2,
  },
  {
    id: 'btled-y1-s1-03',
    subject_code: 'GE 4',
    subject_title: 'Mathematics in the Modern World',
    year_level: '1',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 3,
  },
  {
    id: 'btled-y1-s1-04',
    subject_code: 'BTLED 101',
    subject_title: 'Introduction to Technology & Livelihood Education',
    year_level: '1',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'Major Foundation',
    order_index: 4,
  },
  {
    id: 'btled-y1-s1-05',
    subject_code: 'ICT 101',
    subject_title: 'Fundamentals of Computing & Information Technology',
    year_level: '1',
    semester: '1st Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 5,
  },
  {
    id: 'btled-y1-s1-06',
    subject_code: 'PE 1',
    subject_title: 'Physical Fitness and Wellness (PATHFIT 1)',
    year_level: '1',
    semester: '1st Semester',
    units: 2,
    lec_units: 2,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'Physical Education',
    order_index: 6,
  },
  {
    id: 'btled-y1-s1-07',
    subject_code: 'NSTP 1',
    subject_title: 'National Service Training Program 1',
    year_level: '1',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'Mandatory',
    order_index: 7,
  },

  // ==========================================
  // YEAR 1 - SECOND SEMESTER (20 Units)
  // ==========================================
  {
    id: 'btled-y1-s2-08',
    subject_code: 'GE 3',
    subject_title: 'The Contemporary World',
    year_level: '1',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 8,
  },
  {
    id: 'btled-y1-s2-09',
    subject_code: 'GE 5',
    subject_title: 'Purposive Communication',
    year_level: '1',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 9,
  },
  {
    id: 'btled-y1-s2-10',
    subject_code: 'GE 6',
    subject_title: 'Art Appreciation',
    year_level: '1',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 10,
  },
  {
    id: 'btled-y1-s2-11',
    subject_code: 'ICT 102',
    subject_title: 'Computer Hardware & Software Servicing (CHS)',
    year_level: '1',
    semester: '2nd Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 101',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 11,
  },
  {
    id: 'btled-y1-s2-12',
    subject_code: 'ICT 103',
    subject_title: 'Computer Programming 1 (Structured Programming)',
    year_level: '1',
    semester: '2nd Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 101',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 12,
  },
  {
    id: 'btled-y1-s2-13',
    subject_code: 'PE 2',
    subject_title: 'Rhythmic Activities and Dance (PATHFIT 2)',
    year_level: '1',
    semester: '2nd Semester',
    units: 2,
    lec_units: 2,
    lab_units: 0,
    prerequisites: 'PE 1',
    co_requisites: 'None',
    category: 'Physical Education',
    order_index: 13,
  },
  {
    id: 'btled-y1-s2-14',
    subject_code: 'NSTP 2',
    subject_title: 'National Service Training Program 2',
    year_level: '1',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'NSTP 1',
    co_requisites: 'None',
    category: 'Mandatory',
    order_index: 14,
  },

  // ==========================================
  // YEAR 2 - FIRST SEMESTER (17 Units)
  // ==========================================
  {
    id: 'btled-y2-s1-15',
    subject_code: 'GE 7',
    subject_title: 'Science, Technology, and Society',
    year_level: '2',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 15,
  },
  {
    id: 'btled-y2-s1-16',
    subject_code: 'GE 8',
    subject_title: 'Ethics',
    year_level: '2',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 16,
  },
  {
    id: 'btled-y2-s1-17',
    subject_code: 'ICT 201',
    subject_title: 'Data Structures and Algorithms',
    year_level: '2',
    semester: '1st Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 103',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 17,
  },
  {
    id: 'btled-y2-s1-18',
    subject_code: 'ICT 202',
    subject_title: 'Networking & Telecommunication Technologies',
    year_level: '2',
    semester: '1st Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 102',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 18,
  },
  {
    id: 'btled-y2-s1-19',
    subject_code: 'EDUC 101',
    subject_title: 'The Child & Adolescent Learners and Learning Principles',
    year_level: '2',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 19,
  },
  {
    id: 'btled-y2-s1-20',
    subject_code: 'PE 3',
    subject_title: 'Individual and Dual Sports (PATHFIT 3)',
    year_level: '2',
    semester: '1st Semester',
    units: 2,
    lec_units: 2,
    lab_units: 0,
    prerequisites: 'PE 1',
    co_requisites: 'None',
    category: 'Physical Education',
    order_index: 20,
  },

  // ==========================================
  // YEAR 2 - SECOND SEMESTER (17 Units)
  // ==========================================
  {
    id: 'btled-y2-s2-21',
    subject_code: 'GE 9',
    subject_title: 'The Life and Works of Jose Rizal',
    year_level: '2',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'None',
    co_requisites: 'None',
    category: 'General Education',
    order_index: 21,
  },
  {
    id: 'btled-y2-s2-22',
    subject_code: 'ICT 203',
    subject_title: 'Database Management Systems & SQL',
    year_level: '2',
    semester: '2nd Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 201',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 22,
  },
  {
    id: 'btled-y2-s2-23',
    subject_code: 'ICT 204',
    subject_title: 'Web Systems and Technologies (Full-Stack)',
    year_level: '2',
    semester: '2nd Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 201',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 23,
  },
  {
    id: 'btled-y2-s2-24',
    subject_code: 'EDUC 102',
    subject_title: 'The Teaching Profession',
    year_level: '2',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 101',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 24,
  },
  {
    id: 'btled-y2-s2-25',
    subject_code: 'EDUC 103',
    subject_title: 'The Teacher and the School Curriculum',
    year_level: '2',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 101',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 25,
  },
  {
    id: 'btled-y2-s2-26',
    subject_code: 'PE 4',
    subject_title: 'Team Sports and Recreation (PATHFIT 4)',
    year_level: '2',
    semester: '2nd Semester',
    units: 2,
    lec_units: 2,
    lab_units: 0,
    prerequisites: 'PE 1',
    co_requisites: 'None',
    category: 'Physical Education',
    order_index: 26,
  },

  // ==========================================
  // YEAR 3 - FIRST SEMESTER (15 Units)
  // ==========================================
  {
    id: 'btled-y3-s1-27',
    subject_code: 'ICT 301',
    subject_title: 'Systems Analysis and Design (SAD)',
    year_level: '3',
    semester: '1st Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 203',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 27,
  },
  {
    id: 'btled-y3-s1-28',
    subject_code: 'ICT 302',
    subject_title: 'Multimedia and Digital Content Development',
    year_level: '3',
    semester: '1st Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 204',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 28,
  },
  {
    id: 'btled-y3-s1-29',
    subject_code: 'EDUC 104',
    subject_title: 'Assessment of Learning 1',
    year_level: '3',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 103',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 29,
  },
  {
    id: 'btled-y3-s1-30',
    subject_code: 'EDUC 105',
    subject_title: 'Facilitating Learner-Centered Teaching',
    year_level: '3',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 101',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 30,
  },
  {
    id: 'btled-y3-s1-31',
    subject_code: 'BTLED 201',
    subject_title: 'Technology for Teaching and Learning 1 (TTL 1)',
    year_level: '3',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'BTLED 101',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 31,
  },

  // ==========================================
  // YEAR 3 - SECOND SEMESTER (15 Units)
  // ==========================================
  {
    id: 'btled-y3-s2-32',
    subject_code: 'ICT 303',
    subject_title: 'Information Assurance, Cybersecurity & Ethics',
    year_level: '3',
    semester: '2nd Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 202',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 32,
  },
  {
    id: 'btled-y3-s2-33',
    subject_code: 'ICT 304',
    subject_title: 'Mobile Application Development',
    year_level: '3',
    semester: '2nd Semester',
    units: 3,
    lec_units: 2,
    lab_units: 1,
    prerequisites: 'ICT 204',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 33,
  },
  {
    id: 'btled-y3-s2-34',
    subject_code: 'EDUC 106',
    subject_title: 'Assessment of Learning 2 (Alternative Assessment)',
    year_level: '3',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 104',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 34,
  },
  {
    id: 'btled-y3-s2-35',
    subject_code: 'EDUC 107',
    subject_title: 'Building & Enhancing New Literacies Across Curriculum',
    year_level: '3',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 105',
    co_requisites: 'None',
    category: 'Professional Education',
    order_index: 35,
  },
  {
    id: 'btled-y3-s2-36',
    subject_code: 'BTLED 301',
    subject_title: 'Technology for Teaching & Learning 2 (TTL 2 - ICT)',
    year_level: '3',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'BTLED 201',
    co_requisites: 'None',
    category: 'Major Specialization',
    order_index: 36,
  },

  // ==========================================
  // YEAR 4 - FIRST SEMESTER (9 Units)
  // ==========================================
  {
    id: 'btled-y4-s1-37',
    subject_code: 'ICT 401',
    subject_title: 'Undergraduate Thesis & Capstone Project 1',
    year_level: '4',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'ICT 301',
    co_requisites: 'None',
    category: 'Capstone & Research',
    order_index: 37,
  },
  {
    id: 'btled-y4-s1-38',
    subject_code: 'EDUC 108',
    subject_title: 'Field Study 1: Observations of Teaching-Learning',
    year_level: '4',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 106, EDUC 107',
    co_requisites: 'None',
    category: 'Experiential Learning',
    order_index: 38,
  },
  {
    id: 'btled-y4-s1-39',
    subject_code: 'EDUC 109',
    subject_title: 'Field Study 2: Participation & Teaching Assistantship',
    year_level: '4',
    semester: '1st Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'EDUC 108',
    co_requisites: 'None',
    category: 'Experiential Learning',
    order_index: 39,
  },

  // ==========================================
  // YEAR 4 - SECOND SEMESTER (9 Units)
  // ==========================================
  {
    id: 'btled-y4-s2-40',
    subject_code: 'ICT 402',
    subject_title: 'Undergraduate Thesis & Capstone Project 2',
    year_level: '4',
    semester: '2nd Semester',
    units: 3,
    lec_units: 3,
    lab_units: 0,
    prerequisites: 'ICT 401',
    co_requisites: 'None',
    category: 'Capstone & Research',
    order_index: 40,
  },
  {
    id: 'btled-y4-s2-41',
    subject_code: 'EDUC 110',
    subject_title: 'Teaching Internship (Practice Teaching & Seminars)',
    year_level: '4',
    semester: '2nd Semester',
    units: 6,
    lec_units: 0,
    lab_units: 6,
    prerequisites: 'EDUC 108, EDUC 109',
    co_requisites: 'None',
    category: 'Experiential Learning',
    order_index: 41,
  },
];

export const YEAR_LABELS = {
  '1': '1st Year',
  '2': '2nd Year',
  '3': '3rd Year',
  '4': '4th Year',
};

export const SEMESTER_LABELS = {
  '1st Semester': '1st Semester',
  '2nd Semester': '2nd Semester',
  'Summer': 'Summer Term',
};

// Map grade to status badge info
export function getGradeBadge(grade, status) {
  if (grade !== null && grade !== undefined && grade !== '') {
    const num = Number(grade);
    if (isNaN(num)) {
      return { label: grade, tone: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (num <= 1.25) return { label: num.toFixed(2), tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
    if (num <= 1.75) return { label: num.toFixed(2), tone: 'bg-teal-50 text-teal-700 border-teal-200 font-semibold' };
    if (num <= 2.25) return { label: num.toFixed(2), tone: 'bg-blue-50 text-blue-700 border-blue-200 font-medium' };
    if (num <= 3.00) return { label: num.toFixed(2), tone: 'bg-amber-50 text-amber-700 border-amber-200 font-medium' };
    return { label: num.toFixed(2), tone: 'bg-red-50 text-red-700 border-red-200 font-bold' };
  }
  if (status === 'Passed') return { label: 'Passed', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'Enrolled') return { label: 'Enrolled', tone: 'bg-primary-50 text-primary-700 border-primary-200' };
  if (status === 'Failed') return { label: 'Failed', tone: 'bg-red-50 text-red-700 border-red-200' };
  if (status === 'Locked') return { label: 'Locked', tone: 'bg-slate-100 text-slate-400 border-slate-200' };
  return { label: 'To Take', tone: 'bg-slate-50 text-slate-600 border-slate-200' };
}

// Check whether all prerequisites are met for a subject given the student's passed subject codes and waived codes
export function arePrerequisitesMet(prerequisitesString, passedSubjectCodes = new Set(), waivedSubjectCodes = new Set()) {
  if (!prerequisitesString || prerequisitesString.trim() === '' || prerequisitesString.toLowerCase() === 'none') {
    return true;
  }
  const reqs = prerequisitesString
    .split(/[,;/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (reqs.length === 0) return true;

  // Each prerequisite code must be present in passedSubjectCodes or waived
  return reqs.every((reqCode) => {
    return passedSubjectCodes.has(reqCode) || waivedSubjectCodes.has(reqCode);
  });
}

// Explains prerequisite status for tooltips
export function getPrerequisiteDetails(prerequisitesString, passedSubjectCodes = new Set(), waivedSubjectCodes = new Set(), enrollmentsMap = new Map()) {
  if (!prerequisitesString || prerequisitesString.trim() === '' || prerequisitesString.toLowerCase() === 'none') {
    return { isMet: true, missing: [], message: 'No prerequisite requirements for this subject.' };
  }

  const reqs = prerequisitesString
    .split(/[,;/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const missing = [];
  const details = [];

  reqs.forEach((code) => {
    if (waivedSubjectCodes.has(code)) {
      details.push(`${code} (Waived by Dean/Adviser)`);
    } else if (passedSubjectCodes.has(code)) {
      details.push(`${code} (Passed)`);
    } else {
      const enr = enrollmentsMap.get(code);
      if (enr?.completion_status === 'Failed' || (enr?.grade && Number(enr.grade) > 3.0)) {
        details.push(`${code} (Failed - Needs Retake)`);
      } else if (enr?.completion_status === 'Enrolled') {
        details.push(`${code} (Currently Enrolled)`);
      } else {
        details.push(`${code} (Not Yet Taken)`);
      }
      missing.push(code);
    }
  });

  const isMet = missing.length === 0;
  const message = isMet
    ? `All prerequisites satisfied: ${details.join(', ')}`
    : `Requires passing: ${details.join(', ')}`;

  return { isMet, missing, details, message };
}

// Sample student profiles for Advising mode
export const DEFAULT_SAMPLE_STUDENTS = [
  {
    id: 'sample-student-1',
    student_id: '2024-0001',
    full_name: 'Juan Dela Cruz',
    course_year_section: 'BTLED ICT 2-A',
    program: 'BTLED-ICT',
    year_level: '2',
    enrollments: [
      // Year 1 Sem 1 - Passed
      { subject_code: 'GE 1', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'GE 2', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'GE 4', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'BTLED 101', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'ICT 101', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'PE 1', grade: '1.00', completion_status: 'Passed' },
      { subject_code: 'NSTP 1', grade: '1.25', completion_status: 'Passed' },
      // Year 1 Sem 2 - Passed
      { subject_code: 'GE 3', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'GE 5', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'GE 6', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'ICT 102', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'ICT 103', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'PE 2', grade: '1.00', completion_status: 'Passed' },
      { subject_code: 'NSTP 2', grade: '1.25', completion_status: 'Passed' },
      // Year 2 Sem 1 - Currently Enrolled
      { subject_code: 'GE 7', grade: null, completion_status: 'Enrolled' },
      { subject_code: 'GE 8', grade: null, completion_status: 'Enrolled' },
      { subject_code: 'ICT 201', grade: null, completion_status: 'Enrolled' },
      { subject_code: 'ICT 202', grade: null, completion_status: 'Enrolled' },
      { subject_code: 'EDUC 101', grade: null, completion_status: 'Enrolled' },
      { subject_code: 'PE 3', grade: null, completion_status: 'Enrolled' },
    ],
  },
  {
    id: 'sample-student-2',
    student_id: '2024-0042',
    full_name: 'Maria Santos',
    course_year_section: 'BTLED ICT 3-B',
    program: 'BTLED-ICT',
    year_level: '3',
    enrollments: [
      // Year 1 Passed
      { subject_code: 'GE 1', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'GE 2', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'GE 4', grade: '2.00', completion_status: 'Passed' },
      { subject_code: 'BTLED 101', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'ICT 101', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'PE 1', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'NSTP 1', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'GE 3', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'GE 5', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'GE 6', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'ICT 102', grade: '2.00', completion_status: 'Passed' },
      { subject_code: 'ICT 103', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'PE 2', grade: '1.25', completion_status: 'Passed' },
      { subject_code: 'NSTP 2', grade: '1.25', completion_status: 'Passed' },
      // Year 2 Sem 1 Passed
      { subject_code: 'GE 7', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'GE 8', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'ICT 201', grade: '2.25', completion_status: 'Passed' },
      { subject_code: 'ICT 202', grade: '2.00', completion_status: 'Passed' },
      { subject_code: 'EDUC 101', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'PE 3', grade: '1.00', completion_status: 'Passed' },
      // Year 2 Sem 2 - Failed ICT 203 (DBMS)! Locks ICT 301 (Systems Analysis & Design)
      { subject_code: 'GE 9', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'ICT 203', grade: '5.00', completion_status: 'Failed' },
      { subject_code: 'ICT 204', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'EDUC 102', grade: '1.50', completion_status: 'Passed' },
      { subject_code: 'EDUC 103', grade: '1.75', completion_status: 'Passed' },
      { subject_code: 'PE 4', grade: '1.25', completion_status: 'Passed' },
    ],
  },
];

// Master Template Faculty Coordinators
export const DEFAULT_FACULTY_COORDINATORS = {
  'GE 1': { name: 'Prof. Eleanor Ramos', title: 'General Education Faculty' },
  'GE 2': { name: 'Prof. Mark Bautista', title: 'Social Sciences Dept' },
  'GE 4': { name: 'Dr. Anita Villanueva', title: 'Mathematics Faculty' },
  'BTLED 101': { name: 'Dr. Carmen Mendoza', title: 'BTLED Department Chair' },
  'ICT 101': { name: 'Engr. Ronald Reyes, MIT', title: 'ICT Specialization Coordinator' },
  'PE 1': { name: 'Coach Aris Dela Cruz', title: 'Physical Education Dept' },
  'NSTP 1': { name: 'Capt. Joel Tan', title: 'NSTP Facilitator' },
  'GE 3': { name: 'Prof. Mark Bautista', title: 'Social Sciences Dept' },
  'GE 5': { name: 'Prof. Eleanor Ramos', title: 'Languages Faculty' },
  'GE 6': { name: 'Prof. Marco Antonio', title: 'Humanities Dept' },
  'ICT 102': { name: 'Engr. Ronald Reyes, MIT', title: 'Hardware Systems Instructor' },
  'ICT 103': { name: 'Prof. Kevin Soriano, MSCS', title: 'Programming Coordinator' },
  'PE 2': { name: 'Coach Aris Dela Cruz', title: 'Physical Education Dept' },
  'NSTP 2': { name: 'Capt. Joel Tan', title: 'NSTP Facilitator' },
  'GE 7': { name: 'Prof. Mark Bautista', title: 'General Education Faculty' },
  'GE 8': { name: 'Prof. Eleanor Ramos', title: 'Philosophy & Ethics Dept' },
  'ICT 201': { name: 'Prof. Kevin Soriano, MSCS', title: 'Algorithms Coordinator' },
  'ICT 202': { name: 'Engr. D. Dimagiba, CCNA', title: 'Networking Lab Instructor' },
  'EDUC 101': { name: 'Dr. Carmen Mendoza', title: 'Professional Education Chair' },
  'PE 3': { name: 'Coach Aris Dela Cruz', title: 'Physical Education Dept' },
  'GE 9': { name: 'Prof. Mark Bautista', title: 'Social Sciences Dept' },
  'ICT 203': { name: 'Prof. Grace Alcantara, MIT', title: 'Database Lead Instructor' },
  'ICT 204': { name: 'Prof. Kevin Soriano, MSCS', title: 'Web Development Lead' },
  'EDUC 102': { name: 'Dr. Anita Villanueva', title: 'Prof. Education Faculty' },
  'EDUC 103': { name: 'Dr. Carmen Mendoza', title: 'Curriculum Specialist' },
  'PE 4': { name: 'Coach Aris Dela Cruz', title: 'Physical Education Dept' },
  'ICT 301': { name: 'Prof. Grace Alcantara, MIT', title: 'Systems Analysis Lead' },
  'ICT 302': { name: 'Prof. Marco Antonio, MGD', title: 'Digital Media Specialist' },
  'EDUC 104': { name: 'Dr. Anita Villanueva', title: 'Assessment Specialist' },
  'EDUC 105': { name: 'Dr. Carmen Mendoza', title: 'Educational Pedagogy Chair' },
  'BTLED 201': { name: 'Prof. Kevin Soriano, MSCS', title: 'Educational Technology Lead' },
  'ICT 303': { name: 'Engr. D. Dimagiba, CCNA', title: 'Information Security Lead' },
  'ICT 304': { name: 'Prof. Kevin Soriano, MSCS', title: 'Mobile Computing Lead' },
  'EDUC 106': { name: 'Dr. Anita Villanueva', title: 'Assessment Specialist' },
  'EDUC 107': { name: 'Dr. Carmen Mendoza', title: 'Literacies Specialist' },
  'BTLED 301': { name: 'Prof. Kevin Soriano, MSCS', title: 'Educational Technology Lead' },
  'ICT 401': { name: 'Research & Capstone Committee', title: 'Thesis Review Board' },
  'EDUC 108': { name: 'Field Study Supervisors', title: 'Laboratory School Dept' },
  'EDUC 109': { name: 'Field Study Supervisors', title: 'Laboratory School Dept' },
  'ICT 402': { name: 'Research & Capstone Committee', title: 'Capstone Defense Panel' },
  'EDUC 110': { name: 'Dean of College of Education', title: 'Internship Director' },
};

export const DEFAULT_SYLLABI_INFO = {
  version: '2025-2026 Rev. 4',
  status: 'Approved OBE Format',
  last_updated: 'August 2025',
  accreditation: 'AACCUP Level II Re-Accredited',
};

// Macro Analytics for Master Template mode
export function getCurriculumMacroAnalytics(subjectsList = DEFAULT_BTLED_ICT_CURRICULUM) {
  const totalCourses = subjectsList.length;
  const totalUnits = subjectsList.reduce((acc, s) => acc + Number(s.units || 0), 0);
  const totalLec = subjectsList.reduce((acc, s) => acc + Number(s.lec_units ?? s.units ?? 0), 0);
  const totalLab = subjectsList.reduce((acc, s) => acc + Number(s.lab_units ?? 0), 0);

  // Categories
  const majorCount = subjectsList.filter((s) => s.category?.includes('Major') || s.category?.includes('Capstone')).length;
  const profEdCount = subjectsList.filter((s) => s.category?.includes('Professional') || s.category?.includes('Experiential')).length;
  const geCount = subjectsList.filter((s) => s.category?.includes('General') || s.category?.includes('Mandatory') || s.category?.includes('Physical')).length;

  // Prerequisite bottleneck analysis
  const dependentCountMap = new Map();
  subjectsList.forEach((s) => {
    if (s.prerequisites && s.prerequisites !== 'None') {
      const parts = s.prerequisites.split(/[,;/]/).map((p) => p.trim().toUpperCase());
      parts.forEach((p) => {
        dependentCountMap.set(p, (dependentCountMap.get(p) || 0) + 1);
      });
    }
  });

  const bottlenecks = Array.from(dependentCountMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalCourses,
    totalUnits,
    totalLec,
    totalLab,
    majorCount,
    profEdCount,
    geCount,
    bottlenecks,
  };
}

// Compute comprehensive progress stats for a student
export function computeStudentProgress(subjectsList = [], enrollmentsList = [], waivedCodes = new Set()) {
  const subjects = subjectsList.length > 0 ? subjectsList : DEFAULT_BTLED_ICT_CURRICULUM;

  // Map enrollment by subject code or subject id
  const enrollmentByCode = new Map();
  const enrollmentById = new Map();

  enrollmentsList.forEach((enr) => {
    if (enr.subject_id) enrollmentById.set(enr.subject_id, enr);
    if (enr.subject?.subject_code) enrollmentByCode.set(enr.subject.subject_code.toUpperCase(), enr);
    if (enr.subject_code) enrollmentByCode.set(enr.subject_code.toUpperCase(), enr);
  });

  // Track passed codes
  const passedCodes = new Set();
  let totalGradeProduct = 0;
  let gradedUnits = 0;

  enrollmentsList.forEach((enr) => {
    const isPassed =
      enr.completion_status?.toLowerCase() === 'passed' ||
      (enr.grade != null && Number(enr.grade) > 0 && Number(enr.grade) <= 3.0);

    if (isPassed) {
      if (enr.subject?.subject_code) passedCodes.add(enr.subject.subject_code.toUpperCase());
      if (enr.subject_code) passedCodes.add(enr.subject_code.toUpperCase());

      const numGrade = Number(enr.grade);
      const units = Number(enr.subject?.units || enr.units || 3);
      if (!isNaN(numGrade) && numGrade > 0) {
        totalGradeProduct += numGrade * units;
        gradedUnits += units;
      }
    }
  });

  // Now classify each subject in the curriculum
  let totalUnits = 0;
  let passedUnits = 0;
  let enrolledUnits = 0;
  let remainingUnits = 0;
  let passedCount = 0;
  let enrolledCount = 0;

  const resolvedSubjects = subjects.map((subj) => {
    const uCode = (subj.subject_code || '').toUpperCase();
    const enr = enrollmentById.get(subj.id) || enrollmentByCode.get(uCode);
    const units = Number(subj.units || 3);
    totalUnits += units;

    let status = 'To Take';
    let grade = null;
    let enrollmentId = null;
    const isWaived = waivedCodes.has(uCode);

    if (enr) {
      enrollmentId = enr.id;
      grade = enr.grade;
      const numGrade = Number(enr.grade);
      const isGradePassed = !isNaN(numGrade) && numGrade > 0 && numGrade <= 3.0;
      const isGradeFailed = !isNaN(numGrade) && numGrade > 3.0;

      if (enr.completion_status === 'Passed' || isGradePassed) {
        status = 'Passed';
        passedCodes.add(uCode);
      } else if (enr.completion_status === 'Failed' || isGradeFailed) {
        status = 'Failed';
      } else {
        status = 'Enrolled';
      }
    }

    // If waived, unlock to Enrolled or Passed
    if (isWaived) {
      if (status !== 'Passed') {
        status = 'Enrolled';
      }
      passedCodes.add(uCode);
    }

    // If not passed/enrolled, check if prerequisites are locked
    if (status === 'To Take') {
      const prereqsMet = arePrerequisitesMet(subj.prerequisites, passedCodes, waivedCodes);
      if (!prereqsMet) {
        status = 'Locked';
      }
    }

    const prereqInfo = getPrerequisiteDetails(subj.prerequisites, passedCodes, waivedCodes, enrollmentByCode);

    if (status === 'Passed') {
      passedUnits += units;
      passedCount += 1;
    } else if (status === 'Enrolled') {
      enrolledUnits += units;
      enrolledCount += 1;
    } else {
      remainingUnits += units;
    }

    return {
      ...subj,
      enrollmentId,
      status,
      grade,
      isWaived,
      prereqInfo,
    };
  });

  const progressPercent = totalUnits > 0 ? Math.round((passedUnits / totalUnits) * 100) : 0;
  const gwa = gradedUnits > 0 ? (totalGradeProduct / gradedUnits).toFixed(2) : null;

  let academicStanding = 'In Good Standing';
  if (gwa) {
    const gwaNum = Number(gwa);
    if (gwaNum <= 1.25) academicStanding = "President's Lister Candidate";
    else if (gwaNum <= 1.75) academicStanding = "Dean's Lister Candidate";
    else if (gwaNum <= 2.50) academicStanding = 'In Good Standing';
    else if (gwaNum <= 3.00) academicStanding = 'Conditional Standing';
    else academicStanding = 'Academic Warning';
  }

  return {
    subjects: resolvedSubjects,
    totalSubjects: subjects.length,
    totalUnits,
    passedUnits,
    enrolledUnits,
    remainingUnits,
    passedCount,
    enrolledCount,
    progressPercent,
    gwa,
    academicStanding,
  };
}


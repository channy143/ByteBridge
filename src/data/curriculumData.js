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

// Check whether all prerequisites are met for a subject given the student's passed subject codes
export function arePrerequisitesMet(prerequisitesString, passedSubjectCodes) {
  if (!prerequisitesString || prerequisitesString.trim() === '' || prerequisitesString.toLowerCase() === 'none') {
    return true;
  }
  // Split by comma or semicolon
  const reqs = prerequisitesString
    .split(/[,;/]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (reqs.length === 0) return true;

  // Each prerequisite code must be present in passedSubjectCodes
  return reqs.every((reqCode) => {
    // Exact or normalized match
    return passedSubjectCodes.has(reqCode);
  });
}

// Compute comprehensive progress stats for a student
export function computeStudentProgress(subjectsList = [], enrollmentsList = []) {
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

    // If not passed/enrolled, check if prerequisites are locked
    if (status === 'To Take') {
      const prereqsMet = arePrerequisitesMet(subj.prerequisites, passedCodes);
      if (!prereqsMet) {
        status = 'Locked';
      }
    }

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

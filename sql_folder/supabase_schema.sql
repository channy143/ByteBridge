-- Supabase Schema for ByteBridge LMS

-- 1. Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher')),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    photo_url TEXT,
    bio TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(auth_user_id)
);

-- 2. Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    birthdate DATE
);

-- 3. Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    teacher_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255)
);

-- 4. Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_code VARCHAR(50) NOT NULL,
    subject_title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Sections Table
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL
);

-- 6. Enrollments (Students -> Subjects)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, subject_id)
);

-- 7. Teacher Subjects (Teachers -> Subjects)
CREATE TABLE teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, subject_id, section_id)
);

-- 8. Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE, -- NULL means global announcement
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Announcement Attachments
CREATE TABLE announcement_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    points INTEGER DEFAULT 100,
    grading_criteria TEXT,
    created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    allow_late_submission BOOLEAN DEFAULT TRUE,
    late_penalty INTEGER DEFAULT 0,
    hard_lock BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Activity Attachments
CREATE TABLE activity_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    content TEXT,
    file_url TEXT,
    status VARCHAR(50) DEFAULT 'Submitted', -- 'Submitted', 'Late', 'Graded', 'Lacking'
    grade INTEGER,
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, student_id)
);

-- 13. Modules
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Course Materials (tied to Modules)
CREATE TABLE course_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url TEXT,
    external_url TEXT,
    material_type VARCHAR(50), -- 'PDF', 'Video', 'Link', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Module Progress
CREATE TABLE module_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(student_id, module_id)
);

-- 16. Meeting Sessions
CREATE TABLE meeting_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    started_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
    room_name VARCHAR(255) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_url TEXT
);

-- 17. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-----------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-----------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read basic profiles, but users can only update their own.
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = auth_user_id);

-- Other generic read-only policies for structural data for all authenticated users (students/teachers need to see subjects)
CREATE POLICY "Subjects are viewable by everyone" ON subjects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Sections are viewable by everyone" ON sections FOR SELECT USING (auth.role() = 'authenticated');

-- Submissions: Students see their own, Teachers see for their assigned subjects
CREATE POLICY "Students can view their own submissions" ON submissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.id = submissions.student_id
    )
);

CREATE POLICY "Students can insert their own submissions" ON submissions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.id = submissions.student_id
    )
);

CREATE POLICY "Students can update their own submissions" ON submissions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE profiles.auth_user_id = auth.uid() AND profiles.id = submissions.student_id
    )
);

CREATE POLICY "Teachers can view all submissions for their activities" ON submissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM activities 
        JOIN teacher_subjects ON activities.subject_id = teacher_subjects.subject_id 
        JOIN profiles ON profiles.id = teacher_subjects.teacher_id
        WHERE profiles.auth_user_id = auth.uid() AND activities.id = submissions.activity_id
    )
);

CREATE POLICY "Teachers can update (grade) submissions for their activities" ON submissions FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM activities 
        JOIN teacher_subjects ON activities.subject_id = teacher_subjects.subject_id 
        JOIN profiles ON profiles.id = teacher_subjects.teacher_id
        WHERE profiles.auth_user_id = auth.uid() AND activities.id = submissions.activity_id
    )
);

-- Activities: Everyone can see them, but only teachers can manage them for their subjects
CREATE POLICY "Activities viewable by everyone" ON activities FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can insert activities for their subjects" ON activities FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM teacher_subjects
        JOIN profiles ON profiles.id = teacher_subjects.teacher_id
        WHERE profiles.auth_user_id = auth.uid() AND teacher_subjects.subject_id = activities.subject_id
    )
);

CREATE POLICY "Teachers can update their activities" ON activities FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM teacher_subjects
        JOIN profiles ON profiles.id = teacher_subjects.teacher_id
        WHERE profiles.auth_user_id = auth.uid() AND teacher_subjects.subject_id = activities.subject_id
    )
);

CREATE POLICY "Teachers can delete their activities" ON activities FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM teacher_subjects
        JOIN profiles ON profiles.id = teacher_subjects.teacher_id
        WHERE profiles.auth_user_id = auth.uid() AND teacher_subjects.subject_id = activities.subject_id
    )
);

-- (Further policies for announcements, modules, etc., follow similar patterns)

import React, { useState, useEffect } from 'react';
import { 
  fetchUsers, 
  createUser, 
  assignTherapistToStudent, 
  fetchAssignments,
  updateStudentUser
} from '../services/api';

// Sub-level options mapping based on selected main level
const SUB_LEVEL_OPTIONS: Record<string, string[]> = {
  'Kindergarten': ['K1', 'K2'],
  'Primary': ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  'Secondary': ['S1', 'S2', 'S3', 'S4', 'S5'],
  'Post-Secondary / Adult': ['Tertiary Support', 'Adult Literacy & Profiling'],
};

// Helper to parse saved level string e.g. "Primary (P3)" -> { main: "Primary", sub: "P3" }
const parseSavedLevel = (levelStr?: string) => {
  if (!levelStr) return { main: '', sub: '' };
  const match = levelStr.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) return { main: match[1], sub: match[2] };
  return { main: levelStr, sub: '' };
};

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Form State: Create User
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'therapist' | 'admin'>('student');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  // Two-tier Level State for Create Form
  const [mainLevel, setMainLevel] = useState('');
  const [subLevel, setSubLevel] = useState('');

  // Form State: Assign Relationship
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Filter States
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');

  // Modal State for Editing Student
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editMainLevel, setEditMainLevel] = useState('');
  const [editSubLevel, setEditSubLevel] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch accounts and assignments on load
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      try {
        const usersData = await fetchUsers();
        setUsers(usersData || []);
      } catch (err: any) {
        console.error('Failed to fetch users:', err);
      }

      try {
        const assignmentsData = await fetchAssignments();
        setAssignments(assignmentsData || []);
      } catch (err: any) {
        console.error('Failed to fetch assignments:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter accounts for assignment dropdowns
  const therapists = users.filter((u) => u.role === 'therapist');
  const students = users.filter((u) => u.role === 'student');

  // Filter accounts for Registered Accounts table
  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    
    const query = userSearchQuery.toLowerCase();
    const matchesSearch = 
      !query ||
      u.name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query) ||
      u.id?.toLowerCase().includes(query);

    return matchesRole && matchesSearch;
  });

  // Filter assignments table
  const filteredAssignments = assignments.filter((item) => {
    const query = assignmentSearchQuery.toLowerCase();
    const therapistMatch = item.therapist_name?.toLowerCase().includes(query) || item.therapist_username?.toLowerCase().includes(query);
    const studentMatch = item.student_name?.toLowerCase().includes(query) || item.student_username?.toLowerCase().includes(query);
    return therapistMatch || studentMatch;
  });

  // Submit Handler: Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setStatusMessage('');
      
      const formattedLevel = mainLevel && subLevel ? `${mainLevel} (${subLevel})` : undefined;

      const userData = role === 'student' 
        ? {
            username,
            name,
            role: 'student' as const,
            dateOfBirth: dateOfBirth || undefined,
            level: formattedLevel,
          }
        : {
            username,
            password,
            name,
            role: role as 'therapist' | 'admin',
          };

      await createUser(userData);

      setStatusMessage(`User "${username}" created successfully!`);
      
      setUsername('');
      setPassword('');
      setName('');
      setDateOfBirth('');
      setMainLevel('');
      setSubLevel('');
      loadDashboardData();
    } catch (err: any) {
      setStatusMessage(`Error creating user: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Handler: Assign Relationship
  const handleAssignTherapist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTherapistId || !selectedStudentId) {
      setStatusMessage('Please select both a therapist and a student.');
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('');
      const result = await assignTherapistToStudent(selectedTherapistId, selectedStudentId);
      setStatusMessage(result.message || 'Successfully assigned therapist to student!');
      
      setSelectedTherapistId('');
      setSelectedStudentId('');
      
      loadDashboardData();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal Handler: Open Edit Modal
  const handleOpenEditModal = (user: any) => {
    if (user.role !== 'student') return;

    setEditingStudent(user);
    setEditName(user.name || '');
    setEditUsername(user.username || '');

    const formattedDob = user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '';
    setEditDob(formattedDob);

    const { main, sub } = parseSavedLevel(user.level);
    setEditMainLevel(main);
    setEditSubLevel(sub);
  };

  // Modal Handler: Save Student Edits
  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      setIsLoading(true);
      setStatusMessage('');

      const formattedLevel = editMainLevel && editSubLevel 
        ? `${editMainLevel} (${editSubLevel})` 
        : editMainLevel || undefined;

      await updateStudentUser(editingStudent.id, {
        name: editName,
        username: editUsername,
        dateOfBirth: editDob,
        level: formattedLevel,
      });

      setStatusMessage(`Updated profile for "${editName}" successfully!`);
      setEditingStudent(null);
      loadDashboardData();
    } catch (err: any) {
      setStatusMessage(`Error updating student: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Admin Management Dashboard</h1>

      {statusMessage && (
        <div style={{ padding: '12px', marginBottom: '1.5rem', backgroundColor: '#e2f0d9', color: '#1e4620', borderRadius: '6px', fontWeight: 'bold' }}>
          {statusMessage}
        </div>
      )}

      {/* 1. CREATE USER ACCOUNT */}
      <section style={{ padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fff' }}>
        <h2>Create New Account</h2>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="student">Student</option>
              <option value="therapist">Therapist</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
              {role === 'student' ? 'Student Username / ID' : 'Username / Email'}
            </label>
            <input
              type="text"
              placeholder={role === 'student' ? "e.g. student1" : "e.g. therapist1 or user@das.org.sg"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Aaron Tan or Ms Lim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          {/* Password field strictly hidden for Students */}
          {role !== 'student' && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          )}

          {/* Student specific details with two-tier dropdowns */}
          {role === 'student' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Education Category</label>
                <select
                  value={mainLevel}
                  onChange={(e) => {
                    setMainLevel(e.target.value);
                    setSubLevel('');
                  }}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Category --</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Post-Secondary / Adult">Post-Secondary / Adult</option>
                </select>
              </div>

              {mainLevel && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Specific Level / Grade</label>
                  <select
                    value={subLevel}
                    onChange={(e) => setSubLevel(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">-- Select Specific Level --</option>
                    {SUB_LEVEL_OPTIONS[mainLevel]?.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="primary-button"
            style={{ width: 'fit-content', padding: '10px 20px', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </section>

      {/* 2. ASSIGN THERAPIST TO STUDENT */}
      <section style={{ padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fff' }}>
        <h2>Assign Therapist to Student</h2>
        <form onSubmit={handleAssignTherapist} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Therapist:</label>
            <select
              value={selectedTherapistId}
              onChange={(e) => setSelectedTherapistId(e.target.value)}
              required
              style={{ padding: '8px', minWidth: '220px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">-- Select Therapist --</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.username})
                </option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '1.5rem', paddingBottom: '6px' }}>➔</span>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Student:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
              style={{ padding: '8px', minWidth: '220px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">-- Select Student --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.username})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="primary-button"
            style={{ padding: '10px 20px', cursor: 'pointer' }}
          >
            {isLoading ? 'Assigning...' : 'Assign'}
          </button>
        </form>
      </section>

      {/* 3. ASSIGNED THERAPISTS & STUDENTS TABLE */}
      <section style={{ padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '2rem', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Therapist & Student Assignments ({filteredAssignments.length})</h2>
          <input
            type="text"
            placeholder="Search by therapist or student..."
            value={assignmentSearchQuery}
            onChange={(e) => setAssignmentSearchQuery(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
          />
        </div>

        <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th>Therapist</th>
              <th>Assigned Student</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                  No therapist-student assignments found.
                </td>
              </tr>
            ) : (
              filteredAssignments.map((item, idx) => (
                <tr key={`${item.therapist_id}-${item.student_id}-${idx}`}>
                  <td>
                    <strong>{item.therapist_name || 'N/A'}</strong> 
                    {item.therapist_username && <span style={{ color: '#666', marginLeft: '4px' }}>({item.therapist_username})</span>}
                  </td>
                  <td>
                    <strong>{item.student_name || 'N/A'}</strong> 
                    {item.student_username && <span style={{ color: '#666', marginLeft: '4px' }}>({item.student_username})</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* 4. REGISTERED ACCOUNTS LIST WITH ROLE FILTER AND SEARCH BAR */}
      <section style={{ padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2>Registered Accounts ({filteredUsers.length})</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>
              💡 Click on any student row to view details or edit profile.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name, username, ID..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '220px' }}
            />

            <div>
              <label style={{ marginRight: '0.5rem', fontWeight: 'bold' }}>Filter by Role:</label>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="therapist">Therapist</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th>Name</th>
              <th>Username / ID</th>
              <th>Role</th>
              <th>DOB</th>
              <th>Education Level</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                  No accounts found matching search or role filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isStudent = u.role === 'student';
                const formattedDob = u.date_of_birth ? new Date(u.date_of_birth).toLocaleDateString() : 'N/A';

                return (
                  <tr 
                    key={u.id}
                    onClick={() => isStudent && handleOpenEditModal(u)}
                    style={{ 
                      cursor: isStudent ? 'pointer' : 'default',
                      backgroundColor: isStudent ? '#fbfcfd' : 'transparent',
                    }}
                  >
                    <td><strong>{u.name}</strong></td>
                    <td>{u.username}</td>
                    <td><strong>{u.role}</strong></td>
                    <td>{isStudent ? formattedDob : '—'}</td>
                    <td>{isStudent ? (u.level || 'Unspecified') : '—'}</td>
                    <td>
                      {isStudent && (
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(u);
                          }}
                          style={{ padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* EDIT STUDENT MODAL OVERLAY */}
      {editingStudent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', padding: '2rem', borderRadius: '8px',
            width: '100%', maxWidth: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ marginTop: 0 }}>Edit Student Profile</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              UUID: {editingStudent.id}
            </p>

            <form onSubmit={handleSaveStudentEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Student ID / Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Date of Birth</label>
                <input
                  type="date"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Education Category</label>
                <select
                  value={editMainLevel}
                  onChange={(e) => {
                    setEditMainLevel(e.target.value);
                    setEditSubLevel('');
                  }}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="">-- Select Category --</option>
                  <option value="Kindergarten">Kindergarten</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary</option>
                  <option value="Post-Secondary / Adult">Post-Secondary / Adult</option>
                </select>
              </div>

              {editMainLevel && (
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>Specific Level</label>
                  <select
                    value={editSubLevel}
                    onChange={(e) => setEditSubLevel(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value="">-- Select Specific Level --</option>
                    {SUB_LEVEL_OPTIONS[editMainLevel]?.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', border: '1px solid #ccc' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#007bff', color: '#fff', border: 'none' }}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { 
  fetchUsers, 
  createUser, 
  assignTherapistToStudent, 
  fetchAssignments 
} from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Form State: Create User
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Form State: Assign Relationship
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Filter States
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>(''); // <--- Added Search State

  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch accounts and assignments on load
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch users safely
      try {
        const usersData = await fetchUsers();
        setUsers(usersData || []);
      } catch (err: any) {
        console.error('Failed to fetch users:', err);
      }

      // Fetch assignments safely
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

  // Filter accounts for the assignment dropdowns
  const therapists = users.filter((u) => u.role === 'therapist');
  const students = users.filter((u) => u.role === 'student');

  // Filter accounts for the Registered Accounts table (by Role AND Search Query)
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

  // Filter assignments table based on search input
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
      
      await createUser({
        username,
        password,
        name,
        role,
        dateOfBirth: role === 'student' ? dateOfBirth : undefined,
      });

      setStatusMessage(`User "${username}" created successfully!`);
      
      // Clear form & reload dashboard data
      setUsername('');
      setPassword('');
      setName('');
      setDateOfBirth('');
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
      setStatusMessage(result.message);
      
      setSelectedTherapistId('');
      setSelectedStudentId('');
      
      // Refresh assignments table
      loadDashboardData();
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
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
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Username / Email</label>
            <input
              type="text"
              placeholder="e.g. therapist1 or user@das.org.sg"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

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

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Ms Lim"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="student">Student</option>
              <option value="therapist">Therapist</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === 'student' && (
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
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="primary-button"
            style={{ width: 'fit-content', padding: '10px 20px', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            {isLoading ? 'Creating...' : 'Create User'}
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
          <h2>Registered Accounts ({filteredUsers.length})</h2>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Registered Accounts Search Bar */}
            <input
              type="text"
              placeholder="Search by name, username, ID..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ccc', minWidth: '220px' }}
            />

            {/* Role Filter */}
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
              <th>Username</th>
              <th>Role</th>
              <th>ID (UUID)</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                  No accounts found matching search or role filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td><strong>{u.role}</strong></td>
                  <td style={{ fontSize: '0.8rem', color: '#666' }}>{u.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};
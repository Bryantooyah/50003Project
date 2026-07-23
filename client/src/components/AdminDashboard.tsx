import React, { useState, useEffect } from 'react';
import { fetchUsers, createUser, assignTherapistToStudent } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);

  // Form State: Create User
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Form State: Assign Relationship
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch accounts on load
  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error('Failed to fetch user list', err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filter accounts for the assignment dropdowns
  const therapists = users.filter((u) => u.role === 'therapist');
  const students = users.filter((u) => u.role === 'student');

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
      
      // Clear form & reload list
      setUsername('');
      setPassword('');
      setName('');
      setDateOfBirth('');
      loadUsers();
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
      await assignTherapistToStudent(selectedTherapistId, selectedStudentId);
      setStatusMessage('Successfully assigned therapist to student!');
      
      setSelectedTherapistId('');
      setSelectedStudentId('');
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
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Date of Birth field - displayed only when creating a Student */}
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

      {/* 3. USER ACCOUNTS LIST */}
      <section style={{ padding: '1.5rem', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h2>Registered Accounts ({users.length})</h2>
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
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.username}</td>
                <td><strong>{u.role}</strong></td>
                <td style={{ fontSize: '0.8rem', color: '#666' }}>{u.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import {
  fetchUsers,
  createUser,
  assignTherapistToStudent,
  fetchAssignments,
  resetPassword
} from '../services/api';

// Sub-level options mapping based on selected main level
const SUB_LEVEL_OPTIONS: Record<string, string[]> = {
  'Kindergarten': ['K1', 'K2'],
  'Primary': ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  'Secondary': ['S1', 'S2', 'S3', 'S4', 'S5'],
  'Post-Secondary / Adult': ['Tertiary Support', 'Adult Literacy & Profiling'],
};

type AdminDashboardProps = {
  currentUser?: { id: string; name: string; role: string } | null;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
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
  const [usersPage, setUsersPage] = useState<number>(1);
  const USERS_PER_PAGE = 10;

  // Reset page when filter or search changes
  useEffect(() => {
    setUsersPage(1);
  }, [userSearchQuery, selectedRoleFilter]);

  // Form State: Reset Password (dedicated section, search + dropdown)
  const [resetPasswordSearchQuery, setResetPasswordSearchQuery] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

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

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * USERS_PER_PAGE,
    usersPage * USERS_PER_PAGE
  );

  // Accounts eligible for password reset: students never log in (no real
  // password to reset), and the system administrator's password is
  // protected — both are excluded here, and the backend enforces the same
  // rules independently in case of a direct API call.
  const resettableUsers = users.filter(
    (u) => u.role !== 'student' && !(u.role === 'admin' && u.is_system_admin)
  );
  const filteredResettableUsers = resettableUsers.filter((u) => {
    const query = resetPasswordSearchQuery.toLowerCase();
    return (
      !query ||
      u.name?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    );
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

  // Submit Handler: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUserId || !newPasswordInput) {
      setStatusMessage('Select an account and enter a new password.');
      return;
    }

    try {
      setIsLoading(true);
      setStatusMessage('');
      const result = await resetPassword(resetPasswordUserId, newPasswordInput);
      setStatusMessage(result.message || 'Password reset successfully.');

      setResetPasswordUserId('');
      setNewPasswordInput('');
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <section className="hero" style={{ justifyContent: "center", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.8rem", marginBottom: "0.25rem" }}>
            Welcome back, {currentUser?.name || "System Administrator"}
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "1rem", margin: 0 }}>
            Admin Management Dashboard
          </p>
        </div>
      </section>

      <div className="page-body" style={{ maxWidth: "960px", margin: "0 auto" }}>
        {statusMessage && (
          <div className="message message-info" style={{ marginBottom: "1.5rem" }}>
            {statusMessage}
          </div>
        )}

        {/* 1. CREATE USER ACCOUNT */}
        <section className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ textAlign: "center", marginBottom: "1.25rem" }}>Create New Account</h2>
          <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "460px", margin: "0 auto" }}>
            
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              >
                <option value="student">Student</option>
                <option value="therapist">Therapist</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>
                {role === "student" ? "Student Username / ID" : "Username / Email"}
              </label>
              <input
                type="text"
                placeholder={role === "student" ? "e.g. student1" : "e.g. therapist1 or user@das.org.sg"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Aaron Tan or Ms Lim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </div>

            {role !== "student" && (
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </div>
            )}

            {role === "student" && (
              <>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Education Category</label>
                  <select
                    value={mainLevel}
                    onChange={(e) => {
                      setMainLevel(e.target.value);
                      setSubLevel("");
                    }}
                    required
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
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
                    <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Specific Level / Grade</label>
                    <select
                      value={subLevel}
                      onChange={(e) => setSubLevel(e.target.value)}
                      required
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
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
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", cursor: "pointer", marginTop: "0.5rem" }}
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>
        </section>

        {/* 2. ASSIGN THERAPIST TO STUDENT */}
        <section className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ textAlign: "center", marginBottom: "1.25rem" }}>Assign Therapist to Student</h2>
          <form onSubmit={handleAssignTherapist} style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Therapist:</label>
              <select
                value={selectedTherapistId}
                onChange={(e) => setSelectedTherapistId(e.target.value)}
                required
                style={{ padding: "10px", minWidth: "220px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              >
                <option value="">-- Select Therapist --</option>
                {therapists.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.username})
                  </option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: "1.5rem", padding: "0 4px" }}>➔</span>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Student:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                required
                style={{ padding: "10px", minWidth: "220px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
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
              className="btn btn-primary"
              style={{ padding: "10px 24px", cursor: "pointer", marginTop: "1.5rem" }}
            >
              {isLoading ? "Assigning..." : "Assign"}
            </button>
          </form>
        </section>

        {/* 3. ASSIGNED THERAPISTS & STUDENTS TABLE */}
        <section className="card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>Therapist &amp; Student Assignments ({filteredAssignments.length})</h2>
            <input
              type="text"
              placeholder="Search by therapist or student..."
              value={assignmentSearchQuery}
              onChange={(e) => setAssignmentSearchQuery(e.target.value)}
              style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", minWidth: "250px" }}
            />
          </div>

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, textAlign: "left", borderRadius: "10px", overflow: "hidden", border: "1px solid #c4d4c7" }}>
            <thead>
              <tr style={{ backgroundColor: "#eef3e8" }}>
                <th style={{ padding: "12px 16px", borderRight: "1px solid #c4d4c7", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>Therapist</th>
                <th style={{ padding: "12px 16px", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>Assigned Student</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: "center", color: "#666", padding: "1.5rem" }}>
                    No therapist-student assignments found.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((item, idx) => (
                  <tr key={`${item.therapist_id}-${item.student_id}-${idx}`} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8faf5" }}>
                    <td style={{ padding: "12px 16px", borderRight: "1px solid #dbe5dc", borderBottom: idx === filteredAssignments.length - 1 ? "none" : "1px solid #dbe5dc" }}>
                      <strong>{item.therapist_name || "N/A"}</strong> 
                      {item.therapist_username && <span style={{ color: "#5a6e61", marginLeft: "6px" }}>({item.therapist_username})</span>}
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: idx === filteredAssignments.length - 1 ? "none" : "1px solid #dbe5dc" }}>
                      <strong>{item.student_name || "N/A"}</strong> 
                      {item.student_username && <span style={{ color: "#5a6e61", marginLeft: "6px" }}>({item.student_username})</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {/* 4. REGISTERED ACCOUNTS LIST WITH ROLE FILTER AND SEARCH BAR */}
        <section className="card" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Registered Accounts ({filteredUsers.length})</h2>
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search by name, username, ID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #c4d4c7", minWidth: "220px" }}
              />

              <div>
                <label style={{ marginRight: "0.5rem", fontWeight: "bold" }}>Filter by Role:</label>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => setSelectedRoleFilter(e.target.value)}
                  style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #c4d4c7" }}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="therapist">Therapist</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, textAlign: "left", borderRadius: "10px", overflow: "hidden", border: "1px solid #c4d4c7" }}>
            <thead>
              <tr style={{ backgroundColor: "#eef3e8" }}>
                <th style={{ padding: "12px 16px", borderRight: "1px solid #c4d4c7", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>Name</th>
                <th style={{ padding: "12px 16px", borderRight: "1px solid #c4d4c7", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>Username / ID</th>
                <th style={{ padding: "12px 16px", borderRight: "1px solid #c4d4c7", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>Role</th>
                <th style={{ padding: "12px 16px", borderRight: "1px solid #c4d4c7", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>DOB</th>
                <th style={{ padding: "12px 16px", borderBottom: "1.5px solid #c4d4c7", color: "#1b382b", fontWeight: 700 }}>Education Level</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#666", padding: "1.5rem" }}>
                    No accounts found matching search or role filter.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const isStudent = u.role === "student";
                  const formattedDob = u.date_of_birth ? new Date(u.date_of_birth).toLocaleDateString() : "N/A";
                  const isLastRow = idx === paginatedUsers.length - 1;

                  return (
                    <tr key={u.id} style={{ backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8faf5" }}>
                      <td style={{ padding: "12px 16px", borderRight: "1px solid #dbe5dc", borderBottom: isLastRow ? "none" : "1px solid #dbe5dc" }}><strong>{u.name}</strong></td>
                      <td style={{ padding: "12px 16px", borderRight: "1px solid #dbe5dc", borderBottom: isLastRow ? "none" : "1px solid #dbe5dc" }}>{u.username}</td>
                      <td style={{ padding: "12px 16px", borderRight: "1px solid #dbe5dc", borderBottom: isLastRow ? "none" : "1px solid #dbe5dc" }}><strong>{u.role}</strong></td>
                      <td style={{ padding: "12px 16px", borderRight: "1px solid #dbe5dc", borderBottom: isLastRow ? "none" : "1px solid #dbe5dc" }}>{isStudent ? formattedDob : "—"}</td>
                      <td style={{ padding: "12px 16px", borderBottom: isLastRow ? "none" : "1px solid #dbe5dc" }}>{isStudent ? (u.level || "Unspecified") : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {filteredUsers.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>
                Showing {(usersPage - 1) * USERS_PER_PAGE + 1}–{Math.min(usersPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} accounts
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  type="button"
                  disabled={usersPage === 1}
                  onClick={() => setUsersPage((p) => p - 1)}
                  className="btn btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                >
                  Previous
                </button>
                <span style={{ fontSize: "0.88rem", fontWeight: "bold", padding: "0 8px" }}>
                  Page {usersPage} of {totalUserPages}
                </span>
                <button
                  type="button"
                  disabled={usersPage === totalUserPages}
                  onClick={() => setUsersPage((p) => p + 1)}
                  className="btn btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.85rem" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 5. RESET PASSWORD */}
        <section className="card" style={{ marginBottom: "2rem" }}>
          <h2 style={{ textAlign: "center", marginBottom: "0.5rem" }}>Reset Password</h2>
          <p style={{ color: "#666", textAlign: "center", marginBottom: "1.25rem", fontSize: "0.9rem" }}>
            Students don't have login accounts and aren't listed here; the system administrator's password can't be changed from this screen.
          </p>
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "460px", margin: "0 auto" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Search</label>
              <input
                type="text"
                placeholder="Search by name or username..."
                value={resetPasswordSearchQuery}
                onChange={(e) => setResetPasswordSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Account</label>
              <select
                value={resetPasswordUserId}
                onChange={(e) => setResetPasswordUserId(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              >
                <option value="">-- Select account --</option>
                {filteredResettableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.username}) — {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>New Password</label>
              <input
                type="password"
                placeholder="Enter new password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px", cursor: "pointer", marginTop: "0.5rem" }}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};
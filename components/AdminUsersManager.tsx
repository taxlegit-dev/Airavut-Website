"use client";

import { useState } from "react";

export type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export function AdminUsersManager({ initialUsers }: { initialUsers: AdminUserRecord[] }) {
  const [users, setUsers] = useState<AdminUserRecord[]>(initialUsers);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserEmail, setResetUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");

    if (!createEmail || !createEmail.includes("@")) {
      setCreateError("Please enter a valid email address.");
      return;
    }
    if (!createPassword || createPassword.length < 8) {
      setCreateError("Password must be at least 8 characters long.");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          name: createName,
          password: createPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create user.");
      }

      setCreateSuccess(`Administrator ${data.user.email} created successfully.`);
      setUsers((prev) => [...prev, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
        updatedAt: data.user.updatedAt
      }]);
      setCreateEmail("");
      setCreateName("");
      setCreatePassword("");
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId) return;
    setResetError("");
    setResetSuccess("");

    if (!newPassword || newPassword.length < 8) {
      setResetError("New password must be at least 8 characters long.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUserId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setResetSuccess(`Password for ${resetUserEmail} has been updated.`);
      setNewPassword("");
      setTimeout(() => {
        setResetUserId(null);
        setResetSuccess("");
      }, 2500);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="admin-users-manager">
      <div className="users-header-row">
        <div>
          <h2>Administrator Accounts</h2>
          <p className="muted">Manage accounts that have access to the Airavut administration panel.</p>
        </div>
        <button
          type="button"
          className="admin-btn-primary"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setCreateError("");
            setCreateSuccess("");
          }}
        >
          {showCreateForm ? "Cancel" : "+ Add New Administrator"}
        </button>
      </div>

      {createSuccess ? <p className="admin-success-banner" role="status">{createSuccess}</p> : null}
      {createError ? <p className="admin-error" role="alert">{createError}</p> : null}

      {showCreateForm ? (
        <section className="admin-panel user-create-panel" aria-labelledby="create-user-heading">
          <h3 id="create-user-heading">Create New Administrator</h3>
          <form onSubmit={handleCreateUser} className="admin-user-form">
            <div className="form-group">
              <label>
                Email Address *
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  disabled={createLoading}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                Full Name (Optional)
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  disabled={createLoading}
                />
              </label>
            </div>
            <div className="form-group">
              <label>
                Initial Password * (minimum 8 characters)
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  disabled={createLoading}
                />
              </label>
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={createLoading}>
                {createLoading ? "Creating..." : "Create Administrator"}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setShowCreateForm(false)}
                disabled={createLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {resetUserId ? (
        <section className="admin-panel user-reset-panel" aria-labelledby="reset-user-heading">
          <h3 id="reset-user-heading">Reset Password for {resetUserEmail}</h3>
          {resetSuccess ? <p className="admin-success-banner" role="status">{resetSuccess}</p> : null}
          {resetError ? <p className="admin-error" role="alert">{resetError}</p> : null}
          <form onSubmit={handleResetPassword} className="admin-user-form">
            <div className="form-group">
              <label>
                New Password * (minimum 8 characters)
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={resetLoading}
                />
              </label>
            </div>
            <div className="form-buttons">
              <button type="submit" disabled={resetLoading}>
                {resetLoading ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => {
                  setResetUserId(null);
                  setResetError("");
                  setResetSuccess("");
                  setNewPassword("");
                }}
                disabled={resetLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-panel users-table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Name</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.email}</strong>
                  </td>
                  <td>{user.name || "—"}</td>
                  <td>
                    <time dateTime={user.createdAt}>
                      {new Date(user.createdAt).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                        timeZone: "Asia/Kolkata"
                      })}
                    </time>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => {
                        setResetUserId(user.id);
                        setResetUserEmail(user.email);
                        setResetError("");
                        setResetSuccess("");
                        setNewPassword("");
                      }}
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// src/UserManager.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function UserManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    license: 'Single',
  })

  const [editingUserId, setEditingUserId] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_all_users')
        if (error) throw error
        setUsers(data)
      } catch (error) { 
        alert(error.message) 
      } finally { 
        setLoading(false) 
      }
    }
    fetchUsers()
  }, [])

  const handleInviteInputChange = (e) => {
    setInviteForm({ ...inviteForm, [e.target.name]: e.target.value })
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    if (!window.confirm(`Are you sure you want to invite ${inviteForm.email}?`)) return;
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('invite-user', { body: inviteForm })
      if (error) throw error
      alert(`Successfully invited ${inviteForm.email}.`)
      setUsers([data.user, ...users])
      setInviteForm({ firstName: '', lastName: '', email: '', license: 'Single' })
    } catch (error) {
      alert('Error inviting user: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (user) => {
    setEditingUserId(user.id)
    setEditFormData({ ...user })
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
  }

  const handleEditFormChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value })
  }

  const handleUpdateUser = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.functions.invoke('admin-update-user', {
        body: { userId: editingUserId, updates: editFormData }
      })
      if (error) throw error
      alert('User updated successfully!')
      setUsers(users.map(u => u.id === editingUserId ? editFormData : u))
      setEditingUserId(null)
    } catch (error) {
      alert('Error updating user: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendPasswordReset = async (email) => {
    if (!window.confirm(`Send a password reset link to ${email}?`)) return;
    try {
      setLoading(true)
      const { error } = await supabase.functions.invoke('admin-send-password-reset', { body: { email } })
      if (error) throw error
      alert('Password reset link sent successfully.')
    } catch (error) {
      alert('Error sending reset link: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const handleDeleteUser = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return alert('You must type DELETE to confirm.')
    }
    try {
      setLoading(true)
      const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userId: userToDelete.id } })
      if (error) throw error
      alert(`User ${userToDelete.email} has been permanently deleted.`)
      setUsers(users.filter(u => u.id !== userToDelete.id))
      setShowDeleteModal(false)
      setUserToDelete(null)
      setDeleteConfirmText('')
    } catch (error) {
      alert('Error deleting user: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !showDeleteModal) return <p>Loading users...</p>

  return (
    <div>
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h2>Delete User</h2>
            <p>This action is irreversible. It will permanently delete the user:</p>
            <p><strong>{userToDelete?.first_name} {userToDelete?.last_name} ({userToDelete?.email})</strong></p>
            <p>To confirm, please type DELETE below:</p>
            <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} />
            <div style={{ marginTop: '20px' }}>
              <button onClick={handleDeleteUser} style={{ backgroundColor: 'red', color: 'white' }}>Confirm Deletion</button>
              <button onClick={() => setShowDeleteModal(false)} style={{ marginLeft: '10px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <h2>Manage Users</h2>
      <form onSubmit={handleInviteUser} style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px' }}>
        <h3>Invite New User</h3>
        <input name="firstName" placeholder="First Name" value={inviteForm.firstName} onChange={handleInviteInputChange} required />
        <input name="lastName" placeholder="Last Name" value={inviteForm.lastName} onChange={handleInviteInputChange} required />
        <input name="email" type="email" placeholder="Email" value={inviteForm.email} onChange={handleInviteInputChange} required />
        <select name="license" value={inviteForm.license} onChange={handleInviteInputChange}>
          <option value="Single">Single License</option>
          <option value="Home Run">Home Run License</option>
        </select>
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Invite'}
        </button>
      </form>

      <h3>Existing Users ({users.length})</h3>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>License</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              {editingUserId === user.id ? (
                <>
                  <td>
                    <input name="first_name" value={editFormData.first_name} onChange={handleEditFormChange} />
                    <input name="last_name" value={editFormData.last_name} onChange={handleEditFormChange} />
                  </td>
                  <td><input name="email" type="email" value={editFormData.email} onChange={handleEditFormChange} /></td>
                  <td>
                    <select name="license" value={editFormData.license || ''} onChange={handleEditFormChange}>
                      <option value="">None</option>
                      <option value="Single">Single</option>
                      <option value="Home Run">Home Run</option>
                    </select>
                  </td>
                  <td>
                    <select name="role" value={editFormData.role} onChange={handleEditFormChange}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={handleUpdateUser}>Save</button>
                    <button onClick={handleCancelEdit}>Cancel</button>
                  </td>
                </>
              ) : (
                <>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>{user.license || 'None'}</td>
                  <td>{user.role}</td>
                  <td>
                    <button onClick={() => handleEditClick(user)}>Edit</button>
                    <button onClick={() => handleSendPasswordReset(user.email)}>Send Password Reset</button>
                    <button onClick={() => openDeleteModal(user)} style={{color: 'red'}}>Delete</button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
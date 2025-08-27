// src/UserManager.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function UserManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    license: 'Single',
  })

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        // --- THIS IS THE CRITICAL CHANGE ---
        // Call our new, secure database function instead of querying the table directly.
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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleInviteUser = async (e) => {
    e.preventDefault()
    try {
      setLoading(true) // Set loading for feedback
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: formData
      })
      if (error) throw error
      alert(`Successfully invited ${formData.email}. They will receive an email to set their password.`)
      // Add the new user to the top of the list for immediate feedback
      setUsers([data.user, ...users])
      setFormData({ firstName: '', lastName: '', email: '', license: 'Single' })
    } catch (error) {
      alert('Error inviting user: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <p>Loading users...</p>

  return (
    <div>
      <h2>Manage Users</h2>
      <form onSubmit={handleInviteUser} style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px' }}>
        <h3>Invite New User</h3>
        <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleInputChange} required />
        <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleInputChange} required />
        <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleInputChange} required />
        <select name="license" value={formData.license} onChange={handleInputChange}>
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
            <th>Joined On</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.first_name} {user.last_name}</td>
              <td>{user.email}</td>
              <td>{user.license || 'None'}</td>
              <td>{user.role}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
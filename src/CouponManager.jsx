// src/CouponManager.jsx

import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function CouponManager() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  
  // State for the new/edit coupon form
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    is_active: true,
  })

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from('coupons').select('*')
        if (error) throw error
        setCoupons(data)
      } catch (error) {
        alert('Error fetching coupons: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCoupons()
  }, [])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    try {
      // --- THIS IS THE NEW LOGIC ---
      // Step 1: Call the Edge Function to create the coupon in Stripe
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('create-stripe-coupon', {
        body: {
          code: formData.code,
          discount_type: formData.discount_type,
          discount_value: formData.discount_value,
        }
      })
      if (stripeError) throw stripeError

      // Step 2: Save the coupon to our database, including the new Stripe ID
      const couponToInsert = {
        ...formData,
        stripe_coupon_id: stripeData.stripe_coupon_id,
        // Convert fixed amount to cents for our DB, if applicable
        discount_value: formData.discount_type === 'fixed_amount' ? formData.discount_value * 100 : formData.discount_value,
      }
      
      const { data, error } = await supabase
        .from('coupons')
        .insert(couponToInsert)
        .select()
        .single()
      
      if (error) throw error
      setCoupons([...coupons, data])
      setFormData({ code: '', discount_type: 'percent', discount_value: 10, is_active: true })
    } catch (error) {
      alert('Error creating coupon: ' + error.message)
    }
  }

  if (loading) return <p>Loading coupons...</p>

  return (
    <div>
      <h2>Manage Coupons</h2>
      
      {/* Coupon Creation Form */}
      <form onSubmit={handleFormSubmit} style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px' }}>
        <h3>Create New Coupon</h3>
        <input name="code" value={formData.code} onChange={handleInputChange} placeholder="Coupon Code (e.g., LAUNCH25)" required />
        <select name="discount_type" value={formData.discount_type} onChange={handleInputChange}>
          <option value="percent">Percentage (%)</option>
          <option value="fixed_amount">Fixed Amount ($)</option>
        </select>
        <input name="discount_value" type="number" value={formData.discount_value} onChange={handleInputChange} placeholder="Value" required />
        <label>
          <input name="is_active" type="checkbox" checked={formData.is_active} onChange={handleInputChange} />
          Active
        </label>
        <button type="submit">Create Coupon</button>
      </form>

      {/* Table of Existing Coupons */}
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Active</th>
            <th>Uses</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map(coupon => (
            <tr key={coupon.id}>
              <td>{coupon.code}</td>
              <td>{coupon.discount_type}</td>
              <td>{coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `$${(coupon.discount_value / 100).toFixed(2)}`}</td>
              <td>{coupon.is_active ? 'Yes' : 'No'}</td>
              <td>{coupon.current_uses} / {coupon.max_uses || '∞'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
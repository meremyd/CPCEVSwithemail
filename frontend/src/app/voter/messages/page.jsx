"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MessageSquare, Send, HelpCircle, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import VoterLayout from '@/components/VoterLayout'
import { chatSupportAPI } from '@/lib/api/chatSupport'
import { departmentsAPI } from '@/lib/api/departments'
import { getVoterFromToken } from '@/lib/auth'
import Swal from 'sweetalert2'

export default function VoterMessages() {
  const [voter, setVoter] = useState(null)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    schoolId: "",
    fullName: "",
    departmentId: "",
    birthday: "",
    email: "",
    message: ""
  })
  const [formErrors, setFormErrors] = useState({})
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const voterToken = localStorage.getItem("voterToken")
        if (!voterToken) {
          router.push("/voterlogin")
          return
        }

        const voterFromToken = getVoterFromToken()
        if (!voterFromToken) {
          router.push("/voterlogin")
          return
        }

        setVoter(voterFromToken)
        
        // Pre-fill form with voter data
        setFormData(prev => ({
          ...prev,
          schoolId: voterFromToken.schoolId || "",
          fullName: `${voterFromToken.firstName || ""} ${voterFromToken.lastName || ""}`.trim()
        }))

        // Load departments
        await loadDepartments()
      } catch (error) {
        console.error("Auth check error:", error)
        setError("Authentication error occurred")
        setLoading(false)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await departmentsAPI.getAll()
      
      if (response.success && response.data) {
        setDepartments(response.data.departments || response.data || [])
      }
      
      setError("")
    } catch (error) {
      console.error("Error loading departments:", error)
      setError("Failed to load departments")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.schoolId || formData.schoolId.trim() === "") {
      errors.schoolId = "School ID is required"
    }
    
    if (!formData.fullName || formData.fullName.trim() === "") {
      errors.fullName = "Full name is required"
    }
    
    if (!formData.departmentId) {
      errors.departmentId = "Department is required"
    }
    
    if (!formData.birthday) {
      errors.birthday = "Birthday is required"
    } else {
      const birthDate = new Date(formData.birthday)
      const age = (new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 16 || age > 100) {
        errors.birthday = "Please enter a valid birthday"
      }
    }
    
    if (!formData.email || formData.email.trim() === "") {
      errors.email = "Email is required"
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(formData.email)) {
        errors.email = "Please enter a valid email address"
      }
    }
    
    if (!formData.message || formData.message.trim() === "") {
      errors.message = "Message is required"
    } else if (formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      await Swal.fire({
        title: 'Validation Error',
        text: 'Please fill in all required fields correctly',
        icon: 'error'
      })
      return
    }

    try {
      setSubmitting(true)
      
      const response = await chatSupportAPI.submit({
        schoolId: Number(formData.schoolId),
        fullName: formData.fullName.trim(),
        departmentId: formData.departmentId,
        birthday: formData.birthday,
        email: formData.email.trim().toLowerCase(),
        message: formData.message.trim()
      })

      if (response.success) {
        await Swal.fire({
          title: 'Success!',
          html: `
            <div class="text-center">
              <div class="text-green-500 text-6xl mb-4">✓</div>
              <p class="text-gray-700 mb-2">Your support request has been submitted successfully!</p>
              <p class="text-sm text-gray-500">Request ID: ${response.requestId}</p>
              <p class="text-sm text-gray-500 mt-2">Our team will get back to you soon.</p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#001f65'
        })

        // Reset form but keep school ID and name
        setFormData({
          schoolId: voter.schoolId || "",
          fullName: `${voter.firstName || ""} ${voter.lastName || ""}`.trim(),
          departmentId: "",
          birthday: "",
          email: "",
          message: ""
        })
        setFormErrors({})
      }
    } catch (error) {
      console.error("Error submitting support request:", error)
      
      let errorMessage = "Failed to submit support request. Please try again."
      
      if (error.response?.status === 429) {
        errorMessage = "Please wait 5 minutes before submitting another support request"
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      await Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20">
            <Loader2 className="animate-spin rounded-full h-12 w-12 mx-auto text-white" />
            <p className="mt-4 text-white font-medium">Loading...</p>
          </div>
        </div>
      </VoterLayout>
    )
  }

  if (error && !departments.length) {
    return (
      <VoterLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-md mx-auto border border-white/20">
            <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Error</h2>
            <p className="text-gray-600 mb-4 text-center">{error}</p>
            <div className="space-y-2">
              <button
                onClick={loadDepartments}
                className="w-full bg-[#001f65] hover:bg-[#003399] text-white px-6 py-2 rounded-lg transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => router.push("/voter/dashboard")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </VoterLayout>
    )
  }

  return (
    <VoterLayout>
      {/* Header */}
      <div className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/30 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/voter/dashboard")}
              className="mr-3 p-2 hover:bg-gray-100/80 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#001f65]" />
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-[#001f65] to-[#003399] rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#001f65]">
                Support & Messages
              </h1>
              <p className="text-xs text-[#001f65]/70">
                Submit a support request or view FAQs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-[calc(100vh-120px)] p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Quick Actions */}
          <div className="mb-6 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/30">
            <h2 className="text-lg font-semibold text-[#001f65] mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/voter/faq")}
                className="flex items-center justify-center px-4 py-3 bg-white/90 hover:bg-white rounded-lg shadow-md transition-all hover:shadow-lg border border-gray-200"
              >
                <HelpCircle className="w-5 h-5 text-[#001f65] mr-2" />
                <span className="font-medium text-[#001f65]">View FAQs</span>
              </button>
            </div>
          </div>

          {/* Support Request Form */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/30">
            <h2 className="text-xl font-bold text-[#001f65] mb-6 flex items-center">
              <Send className="w-6 h-6 mr-2" />
              Submit Support Request
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* School ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${formErrors.schoolId ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80`}
                  placeholder="Enter your school ID"
                  disabled={submitting}
                />
                {formErrors.schoolId && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.schoolId}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${formErrors.fullName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80`}
                  placeholder="Enter your full name"
                  disabled={submitting}
                />
                {formErrors.fullName && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.fullName}</p>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department <span className="text-red-500">*</span>
                </label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${formErrors.departmentId ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80`}
                  disabled={submitting}
                >
                  <option value="">Select your department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.departmentCode} - {dept.degreeProgram}
                    </option>
                  ))}
                </select>
                {formErrors.departmentId && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.departmentId}</p>
                )}
              </div>

              {/* Birthday */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birthday <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${formErrors.birthday ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80`}
                  disabled={submitting}
                />
                {formErrors.birthday && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.birthday}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80`}
                  placeholder="your.email@example.com"
                  disabled={submitting}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={6}
                  className={`w-full px-4 py-2 border ${formErrors.message ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-[#001f65] focus:border-transparent bg-white/80 resize-none`}
                  placeholder="Describe your issue or question..."
                  disabled={submitting}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-1">
                  {formErrors.message ? (
                    <p className="text-sm text-red-500">{formErrors.message}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Minimum 10 characters</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {formData.message.length}/1000
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#001f65] hover:bg-[#003399] text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5 mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-gradient-to-r from-blue-50/80 to-green-50/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/30">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-[#001f65]" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-[#001f65] mb-2">
                  Important Information
                </h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Our support team typically responds within 24-48 hours</li>
                  <li>• Please check your email regularly for updates</li>
                  <li>• For urgent matters, please contact your election committee</li>
                  <li>• You can only submit one request every 5 minutes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </VoterLayout>
  )
}
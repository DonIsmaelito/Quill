import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { Heart, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['patient', 'provider', 'admin'], {
    required_error: 'Please select a role',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type SignUpFormData = z.infer<typeof signUpSchema>

const roleDescriptions = {
  patient: 'Access your medical records, schedule appointments, and communicate with providers',
  provider: 'Manage patient care, view medical records, and provide clinical services',
  admin: 'Full system access for practice management and administrative tasks'
}

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true)
    try {
      await signUp(data.email, data.password, data.firstName, data.lastName, data.role)
      toast.success('Account created successfully! Please check your email to verify your account.')
      navigate('/signin')
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error(error.message || 'Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">Quill EHR</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Join thousands of healthcare providers and patients
          </p>
        </div>

        {/* Sign Up Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Fill in your information to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter your first name"
                    {...register('firstName')}
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter your last name"
                    {...register('lastName')}
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => setValue('role', value as any)}>
                  <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">Patient</SelectItem>
                    <SelectItem value="provider">Healthcare Provider</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
                {selectedRole && (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {roleDescriptions[selectedRole]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    {...register('password')}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-300">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    Privacy Policy
                  </a>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <Link
                  to="/signin"
                  className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Secure</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">HIPAA compliant data protection</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Easy to Use</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Intuitive interface for all users</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">24/7 Support</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Round-the-clock assistance</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
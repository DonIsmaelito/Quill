import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/AuthContext'
import { Heart, ArrowLeft, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/services/supabase'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordReset, setPasswordReset] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const navigate = useNavigate()
  const { updatePassword } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Check if user has a valid session (they should be authenticated after clicking the reset link)
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('Session check:', { session, error })
        
        if (error) {
          console.error('Session error:', error)
          toast.error('Invalid or expired reset link. Please request a new one.')
          navigate('/forgot-password')
          return
        }

        if (!session) {
          console.log('No session found')
          toast.error('Invalid or expired reset link. Please request a new one.')
          navigate('/forgot-password')
          return
        }

        // Check if this is a recovery session
        if (session.user.app_metadata?.provider === 'email' && session.user.aud === 'authenticated') {
          console.log('Valid recovery session found')
          setIsValidSession(true)
        } else {
          console.log('Invalid session type')
          toast.error('Invalid reset session. Please request a new reset link.')
          navigate('/forgot-password')
        }
      } catch (error) {
        console.error('Session check error:', error)
        toast.error('Invalid or expired reset link. Please request a new one.')
        navigate('/forgot-password')
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [navigate])

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!isValidSession) {
      toast.error('Invalid reset session. Please request a new reset link.')
      navigate('/forgot-password')
      return
    }

    setIsLoading(true)
    try {
      await updatePassword(data.password)
      setPasswordReset(true)
      toast.success('Password successfully reset!')
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
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
          </div>

          {/* Success Message */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <CardTitle className="text-xl">Password Reset Successfully</CardTitle>
              <CardDescription>
                Your password has been updated. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  For security reasons, you may need to sign in again on other devices.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={() => navigate('/signin')}
                className="w-full"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl">Validating Reset Link</CardTitle>
              <CardDescription>
                Please wait while we validate your reset link...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl">Invalid Reset Link</CardTitle>
              <CardDescription>
                The reset link is invalid or has expired. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/forgot-password')}
                className="w-full"
              >
                Request New Reset Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Enter your new password below
          </p>
        </div>

        {/* Reset Password Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">New Password</CardTitle>
            <CardDescription className="text-center">
              Choose a strong password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your new password"
                    {...register('password')}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Remember your password?{' '}
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
      </div>
    </div>
  )
} 
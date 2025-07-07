import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, authService } from '../services/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string, role: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  verifyRecoveryToken: (token: string) => Promise<any>
  updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected')
          // User has clicked the password reset link and is now authenticated
          setUser(session?.user ?? null)
          setLoading(false)
        } else {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signIn({ email, password })
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: string) => {
    try {
      await authService.signUp({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role: role as 'patient' | 'provider' | 'admin'
      })
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await authService.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await authService.resetPassword(email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  }

  const verifyRecoveryToken = async (token: string) => {
    try {
      return await authService.verifyRecoveryToken(token)
    } catch (error) {
      console.error('Token verification error:', error)
      throw error
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      await authService.updatePassword(newPassword)
    } catch (error) {
      console.error('Password update error:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    verifyRecoveryToken,
    updatePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 
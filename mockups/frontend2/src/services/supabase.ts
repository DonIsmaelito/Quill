import { createClient } from '@supabase/supabase-js'

console.log(`Environment Variable: ${import.meta.env}`)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth types
export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    first_name?: string
    last_name?: string
    role?: string
  }
}

export interface SignUpData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: 'patient' | 'provider' | 'admin'
}

export interface SignInData {
  email: string
  password: string
}

// Auth service
export const authService = {
  // Sign up new user
  async signUp(data: SignUpData) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role
        }
      }
    })

    if (error) throw error

    // Create person record in EHR database
    if (authData.user) {
      await this.createPersonRecord(authData.user, data)
    }

    return authData
  },

  // Sign in user
  async signIn(data: SignInData) {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (error) throw error
    return authData
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Reset password - sends reset email
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  },

  // Verify recovery token and update password
  async verifyRecoveryToken(token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    })
    if (error) throw error
    return data
  },

  // Update password with new password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Create person record in EHR database
  async createPersonRecord(user: any, signUpData: SignUpData) {
    const personData = {
      person_source_value: user.email, // Use email as the unique identifier
      first_name: signUpData.first_name,
      last_name: signUpData.last_name,
      gender_concept_id: 0, // Unknown
      year_of_birth: null,
      month_of_birth: null,
      day_of_birth: null,
      race_concept_id: 0, // Unknown
      ethnicity_concept_id: 0, // Unknown
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('person')
      .insert(personData)
      .select()
      .single()

    if (error) {
      console.error('Error creating person record:', error)
      throw error
    }

    return data
  },

  // Get person record by user email
  async getPersonRecord(userEmail: string) {
    const { data, error } = await supabase
      .from('person')
      .select('*')
      .eq('person_source_value', userEmail)
      .single()

    if (error) throw error
    return data
  }
}

// Database service for EHR operations
export const ehrService = {
  // Get patient profile
  async getPatientProfile(personId: number) {
    const { data, error } = await supabase
      .from('person')
      .select(`
        *,
        condition_occurrence(*),
        drug_exposure(*),
        measurement(*),
        visit_occurrence(*),
        person_address(*),
        person_contact(*),
        insurance(*)
      `)
      .eq('person_id', personId)
      .single()

    if (error) throw error
    return data
  },

  // Update person information
  async updatePerson(personId: number, updates: any) {
    const { data, error } = await supabase
      .from('person')
      .update(updates)
      .eq('person_id', personId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Add address
  async addAddress(personId: number, addressData: any) {
    const { data, error } = await supabase
      .from('person_address')
      .insert({
        person_id: personId,
        ...addressData
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Add contact information
  async addContact(personId: number, contactData: any) {
    const { data, error } = await supabase
      .from('person_contact')
      .insert({
        person_id: personId,
        ...contactData
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
} 
/**
 * Patient Dashboard Component
 * 
 * This component handles patient profile management with OMOP CDM concept_id mapping.
 * When patients edit their demographic information, both source_value and concept_id
 * fields are updated to maintain data standardization according to OMOP CDM standards.
 * 
 * Supported concept mappings:
 * - Gender: Male (8507), Female (8532), Other/Unknown (0)
 * - Race: White (8527), Black or African American (8516), Asian (8515), etc.
 * - Ethnicity: Hispanic or Latino (38003563), Not Hispanic or Latino (38003564)
 * - Language: English (4180186), Spanish (4175777), French (4175778), etc.
 */
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ehrService, supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Heart, 
  User, 
  Calendar, 
  FileText, 
  Activity, 
  Settings, 
  LogOut,
  Plus,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  Edit,
  Save,
  X,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  UserCheck,
  CreditCard,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface PersonRecord {
  person_id: number
  first_name: string
  last_name: string
  middle_name?: string
  suffix?: string
  preferred_name?: string
  person_source_value: string
  gender_source_value?: string
  gender_concept_id?: number
  year_of_birth?: number
  month_of_birth?: number
  day_of_birth?: number
  birth_datetime?: string
  race_source_value?: string
  race_concept_id?: number
  ethnicity_source_value?: string
  ethnicity_concept_id?: number
  ssn?: string
  marital_status_concept_id?: number
  preferred_language?: string
  language_concept_id?: number
  veteran_status?: boolean
  deceased?: boolean
  death_date?: string
  created_at: string
  updated_at: string
}

interface PersonAddress {
  address_id: number
  person_id: number
  address_type: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  zip_code: string
  country: string
  created_at: string
}

interface PersonContact {
  contact_id: number
  person_id: number
  contact_type: string
  contact_value: string
  contact_subtype?: string
  is_primary?: boolean
  created_at: string
}

interface EmergencyContact {
  emergency_contact_id: number
  person_id: number
  contact_name: string
  relationship: string
  phone_number: string
  email?: string
  address_line_1?: string
  city?: string
  state?: string
  zip_code?: string
  is_primary: boolean
  created_at: string
}

interface Insurance {
  insurance_id: number
  person_id: number
  insurance_type: string
  insurance_provider: string
  policy_number: string
  group_number?: string
  subscriber_name: string
  subscriber_relationship: string
  effective_date: string
  expiration_date?: string
  copay_amount?: number
  deductible_amount?: number
  is_active: boolean
  created_at: string
}

interface ConditionOccurrence {
  condition_occurrence_id: number
  person_id: number
  condition_source_value: string
  condition_start_date: string
  condition_end_date?: string
  active: boolean
  severity?: string
  chronic: boolean
  notes?: string
  created_at: string
}

interface DrugExposure {
  drug_exposure_id: number
  person_id: number
  drug_source_value: string
  drug_exposure_start_date: string
  drug_exposure_end_date?: string
  prescription_status: string
  dose_form?: string
  strength?: string
  frequency?: string
  created_at: string
}

interface Measurement {
  measurement_id: number
  person_id: number
  measurement_source_value: string
  measurement_date: string
  value_as_number?: number
  unit_source_value?: string
  result_status?: string
  abnormal_flag?: string
  created_at: string
}

interface VisitOccurrence {
  visit_occurrence_id: number
  person_id: number
  visit_start_date: string
  visit_end_date?: string
  visit_source_value: string
  visit_status?: string
  chief_complaint?: string
  follow_up_date?: string
  created_at: string
}

interface Allergy {
  allergy_id: number
  person_id: number
  allergen_source_value: string
  allergy_type: string
  severity: string
  reaction?: string
  onset_date: string
  resolved_date?: string
  is_active: boolean
  verified: boolean
  notes?: string
  created_at: string
}

interface VitalSigns {
  vital_signs_id: number
  person_id: number
  measurement_date: string
  temperature?: number
  temperature_unit?: string
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  heart_rate?: number
  respiratory_rate?: number
  oxygen_saturation?: number
  height?: number
  height_unit?: string
  weight?: number
  weight_unit?: string
  bmi?: number
  pain_scale?: number
  created_at: string
}

interface Appointment {
  appointment_id: number
  person_id: number
  appointment_date: string
  appointment_time?: string
  duration_minutes?: number
  appointment_type: string
  appointment_status: string
  reason?: string
  created_at: string
}

interface PatientProfile {
  person: PersonRecord | null
  person_address: PersonAddress[]
  person_contact: PersonContact[]
  emergency_contact: EmergencyContact[]
  insurance: Insurance[]
  condition_occurrence: ConditionOccurrence[]
  drug_exposure: DrugExposure[]
  measurement: Measurement[]
  visit_occurrence: VisitOccurrence[]
  allergy: Allergy[]
  vital_signs: VitalSigns[]
  appointment: Appointment[]
}

// Concept ID mappings based on OMOP CDM standards
const CONCEPT_VALUES = {
  gender: {
    "Male": 8507,
    "Female": 8532,
    "Other": 0,
    "Prefer not to say": 0,
    "Unknown": 0
  },
  race: {
    "White": 8527,
    "Black or African American": 8516,
    "Asian": 8515,
    "Native American": 8657,
    "Pacific Islander": 8557,
    "Other": 0,
    "Prefer not to say": 0,
    "Unknown": 0
  },
  ethnicity: {
    "Hispanic or Latino": 38003563,
    "Not Hispanic or Latino": 38003564,
    "Prefer not to say": 0,
    "Unknown": 0
  },
  language: {
    "English": 4180186,
    "Spanish": 4175777,
    "French": 4175778,
    "German": 4175779,
    "Chinese": 4175780,
    "Other": 0,
    "Unknown": 0
  }
}

// Utility function to get concept ID for a given source value
const getConceptId = (category: keyof typeof CONCEPT_VALUES, sourceValue: string): number => {
  return CONCEPT_VALUES[category][sourceValue as keyof typeof CONCEPT_VALUES[typeof category]] || 0
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingPerson, setEditingPerson] = useState(false)
  const [personForm, setPersonForm] = useState<Partial<PersonRecord>>({})

  useEffect(() => {
    if (!user) {
      navigate('/signin')
      return
    }

    const loadProfile = async () => {
      try {
        // Try to get existing person record
        let personRecord: PersonRecord | null = null
        
        try {
          const { data: personData, error: personError } = await supabase
            .from('person')
            .select('*')
            .eq('person_source_value', user.email)
            .single()

          if (personData && !personError) {
            personRecord = personData
          }
        } catch (error) {
          console.log('No existing person record found, will create one')
        }

        // If no person record exists, create one with user metadata
        if (!personRecord) {
          const newPersonData = {
            person_source_value: user.email,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data: newPerson, error: createError } = await supabase
            .from('person')
            .insert(newPersonData)
            .select()
            .single()

          if (createError) {
            console.error('Error creating person record:', createError)
            toast.error('Failed to create patient profile')
          } else {
            personRecord = newPerson
          }
        }

        if (!personRecord) {
          toast.error('Failed to load or create patient profile')
          setLoading(false)
          return
        }

        // Fetch all related data for the person
        const personId = personRecord.person_id

        // Fetch addresses
        const { data: addresses, error: addressError } = await supabase
          .from('person_address')
          .select('*')
          .eq('person_id', personId)

        if (addressError) {
          console.error('Error fetching addresses:', addressError)
        }

        // Fetch contacts
        const { data: contacts, error: contactError } = await supabase
          .from('person_contact')
          .select('*')
          .eq('person_id', personId)

        if (contactError) {
          console.error('Error fetching contacts:', contactError)
        }

        // Fetch emergency contacts
        const { data: emergencyContacts, error: emergencyError } = await supabase
          .from('emergency_contact')
          .select('*')
          .eq('person_id', personId)

        if (emergencyError) {
          console.error('Error fetching emergency contacts:', emergencyError)
        }

        // Fetch insurance
        const { data: insurance, error: insuranceError } = await supabase
          .from('insurance')
          .select('*')
          .eq('person_id', personId)

        if (insuranceError) {
          console.error('Error fetching insurance:', insuranceError)
        }

        // Fetch conditions
        const { data: conditions, error: conditionError } = await supabase
          .from('condition_occurrence')
          .select('*')
          .eq('person_id', personId)

        if (conditionError) {
          console.error('Error fetching conditions:', conditionError)
        }

        // Fetch medications
        const { data: medications, error: medicationError } = await supabase
          .from('drug_exposure')
          .select('*')
          .eq('person_id', personId)

        if (medicationError) {
          console.error('Error fetching medications:', medicationError)
        }

        // Fetch measurements
        const { data: measurements, error: measurementError } = await supabase
          .from('measurement')
          .select('*')
          .eq('person_id', personId)

        if (measurementError) {
          console.error('Error fetching measurements:', measurementError)
        }

        // Fetch visits
        const { data: visits, error: visitError } = await supabase
          .from('visit_occurrence')
          .select('*')
          .eq('person_id', personId)

        if (visitError) {
          console.error('Error fetching visits:', visitError)
        }

        // Fetch allergies
        const { data: allergies, error: allergyError } = await supabase
          .from('allergy')
          .select('*')
          .eq('person_id', personId)

        if (allergyError) {
          console.error('Error fetching allergies:', allergyError)
        }

        // Fetch vital signs
        const { data: vitalSigns, error: vitalSignsError } = await supabase
          .from('vital_signs')
          .select('*')
          .eq('person_id', personId)

        if (vitalSignsError) {
          console.error('Error fetching vital signs:', vitalSignsError)
        }

        // Fetch appointments
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointment')
          .select('*')
          .eq('person_id', personId)

        if (appointmentError) {
          console.error('Error fetching appointments:', appointmentError)
        }

        // Initialize form data
        setPersonForm({
          first_name: personRecord.first_name || '',
          last_name: personRecord.last_name || '',
          middle_name: personRecord.middle_name || '',
          suffix: personRecord.suffix || '',
          preferred_name: personRecord.preferred_name || '',
          gender_source_value: personRecord.gender_source_value || '',
          gender_concept_id: personRecord.gender_concept_id || undefined,
          year_of_birth: personRecord.year_of_birth || undefined,
          month_of_birth: personRecord.month_of_birth || undefined,
          day_of_birth: personRecord.day_of_birth || undefined,
          race_source_value: personRecord.race_source_value || '',
          race_concept_id: personRecord.race_concept_id || undefined,
          ethnicity_source_value: personRecord.ethnicity_source_value || '',
          ethnicity_concept_id: personRecord.ethnicity_concept_id || undefined,
          preferred_language: personRecord.preferred_language || '',
          language_concept_id: personRecord.language_concept_id || undefined,
          veteran_status: personRecord.veteran_status || false
        })

        // Create profile with real data
        const realProfile: PatientProfile = {
          person: personRecord,
          person_address: addresses || [],
          person_contact: contacts || [],
          emergency_contact: emergencyContacts || [],
          insurance: insurance || [],
          condition_occurrence: conditions || [],
          drug_exposure: medications || [],
          measurement: measurements || [],
          visit_occurrence: visits || [],
          allergy: allergies || [],
          vital_signs: vitalSigns || [],
          appointment: appointments || []
        }
        
        setProfile(realProfile)
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user, navigate])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Failed to sign out')
    }
  }

  const handleSavePerson = async () => {
    if (!profile?.person) return

    try {
      // Prepare update data with both source values and concept IDs
      const updateData: Partial<PersonRecord> = {
        ...personForm,
        updated_at: new Date().toISOString()
      }

      // Add concept IDs for fields that have them
      if (personForm.gender_source_value !== undefined) {
        updateData.gender_concept_id = getConceptId('gender', personForm.gender_source_value)
        console.log(`Mapping gender "${personForm.gender_source_value}" to concept ID: ${updateData.gender_concept_id}`)
      }
      
      if (personForm.race_source_value !== undefined) {
        updateData.race_concept_id = getConceptId('race', personForm.race_source_value)
        console.log(`Mapping race "${personForm.race_source_value}" to concept ID: ${updateData.race_concept_id}`)
      }
      
      if (personForm.ethnicity_source_value !== undefined) {
        updateData.ethnicity_concept_id = getConceptId('ethnicity', personForm.ethnicity_source_value)
        console.log(`Mapping ethnicity "${personForm.ethnicity_source_value}" to concept ID: ${updateData.ethnicity_concept_id}`)
      }
      
      if (personForm.preferred_language !== undefined) {
        updateData.language_concept_id = getConceptId('language', personForm.preferred_language)
        console.log(`Mapping language "${personForm.preferred_language}" to concept ID: ${updateData.language_concept_id}`)
      }

      const { error } = await supabase
        .from('person')
        .update(updateData)
        .eq('person_id', profile.person.person_id)

      if (error) {
        console.error('Error updating person:', error)
        toast.error('Failed to update profile')
        return
      }

      // Update local state with both source values and concept IDs
      setProfile(prev => prev ? {
        ...prev,
        person: { 
          ...prev.person!, 
          ...personForm,
          gender_concept_id: updateData.gender_concept_id,
          race_concept_id: updateData.race_concept_id,
          ethnicity_concept_id: updateData.ethnicity_concept_id,
          language_concept_id: updateData.language_concept_id
        }
      } : null)

      setEditingPerson(false)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error saving person:', error)
      toast.error('Failed to save profile')
    }
  }

  const formatDate = (year?: number, month?: number, day?: number) => {
    if (!year) return 'Not specified'
    if (!month) return year.toString()
    if (!day) return `${month}/${year}`
    return `${month}/${day}/${year}`
  }

  const getFullName = (person: PersonRecord) => {
    const parts = [
      person.first_name,
      person.middle_name,
      person.last_name,
      person.suffix
    ].filter(Boolean)
    
    return parts.length > 0 ? parts.join(' ') : 'Not specified'
  }

  const getLatestVitalSigns = () => {
    if (!profile?.vital_signs.length) return null
    return profile.vital_signs.sort((a, b) => 
      new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
    )[0]
  }

  const getUpcomingAppointments = () => {
    if (!profile?.appointment.length) return []
    const today = new Date()
    return profile.appointment
      .filter(apt => new Date(apt.appointment_date) >= today)
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
      .slice(0, 3)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Failed to load profile</p>
        </div>
      </div>
    )
  }

  const person = profile.person
  const latestVitals = getLatestVitalSigns()
  const upcomingAppointments = getUpcomingAppointments()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Quill EHR</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Patient Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {person?.preferred_name || person?.first_name || 'Patient'}!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Here's an overview of your health information and recent activity.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Patient Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Patient Information
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPerson(!editingPerson)}
                  >
                    {editingPerson ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPerson ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">First Name</Label>
                        <Input
                          id="first_name"
                          value={personForm.first_name || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, first_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input
                          id="last_name"
                          value={personForm.last_name || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, last_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="middle_name">Middle Name</Label>
                        <Input
                          id="middle_name"
                          value={personForm.middle_name || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, middle_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="suffix">Suffix</Label>
                        <Input
                          id="suffix"
                          value={personForm.suffix || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, suffix: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="preferred_name">Preferred Name</Label>
                      <Input
                        id="preferred_name"
                        value={personForm.preferred_name || ''}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, preferred_name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={personForm.gender_source_value || ''}
                        onValueChange={(value) => setPersonForm(prev => ({ ...prev, gender_source_value: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="year_of_birth">Year</Label>
                        <Input
                          id="year_of_birth"
                          type="number"
                          placeholder="YYYY"
                          value={personForm.year_of_birth || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, year_of_birth: e.target.value ? parseInt(e.target.value) : undefined }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="month_of_birth">Month</Label>
                        <Input
                          id="month_of_birth"
                          type="number"
                          placeholder="MM"
                          min="1"
                          max="12"
                          value={personForm.month_of_birth || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, month_of_birth: e.target.value ? parseInt(e.target.value) : undefined }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="day_of_birth">Day</Label>
                        <Input
                          id="day_of_birth"
                          type="number"
                          placeholder="DD"
                          min="1"
                          max="31"
                          value={personForm.day_of_birth || ''}
                          onChange={(e) => setPersonForm(prev => ({ ...prev, day_of_birth: e.target.value ? parseInt(e.target.value) : undefined }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="race">Race</Label>
                        <Select
                          value={personForm.race_source_value || ''}
                          onValueChange={(value) => setPersonForm(prev => ({ ...prev, race_source_value: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select race" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="White">White</SelectItem>
                            <SelectItem value="Black or African American">Black or African American</SelectItem>
                            <SelectItem value="Asian">Asian</SelectItem>
                            <SelectItem value="Native American">Native American</SelectItem>
                            <SelectItem value="Pacific Islander">Pacific Islander</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="ethnicity">Ethnicity</Label>
                        <Select
                          value={personForm.ethnicity_source_value || ''}
                          onValueChange={(value) => setPersonForm(prev => ({ ...prev, ethnicity_source_value: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ethnicity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hispanic or Latino">Hispanic or Latino</SelectItem>
                            <SelectItem value="Not Hispanic or Latino">Not Hispanic or Latino</SelectItem>
                            <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                            <SelectItem value="Unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="preferred_language">Preferred Language</Label>
                      <Select
                        value={personForm.preferred_language || ''}
                        onValueChange={(value) => setPersonForm(prev => ({ ...prev, preferred_language: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Spanish">Spanish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="German">German</SelectItem>
                          <SelectItem value="Chinese">Chinese</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="veteran_status"
                        checked={personForm.veteran_status || false}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, veteran_status: e.target.checked }))}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="veteran_status">Veteran Status</Label>
                    </div>

                    <div className="flex space-x-2">
                      <Button onClick={handleSavePerson} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setEditingPerson(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Full Name</p>
                      <p className="font-medium">
                        {person ? getFullName(person) : 'Not specified'}
                      </p>
                      {person?.preferred_name && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">Preferred: {person.preferred_name}</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Gender</p>
                      <p className="font-medium">{person?.gender_source_value || 'Not specified'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Date of Birth</p>
                      <p className="font-medium">
                        {formatDate(person?.year_of_birth, person?.month_of_birth, person?.day_of_birth)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Race</p>
                      <p className="font-medium">{person?.race_source_value || 'Not specified'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Ethnicity</p>
                      <p className="font-medium">{person?.ethnicity_source_value || 'Not specified'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Preferred Language</p>
                      <p className="font-medium">{person?.preferred_language || 'Not specified'}</p>
                    </div>

                    {person?.veteran_status && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Veteran Status</p>
                        <Badge variant="default">Veteran</Badge>
                      </div>
                    )}
                    
                    {profile.person_contact.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Contact Information</p>
                        {profile.person_contact.map((contact) => (
                          <div key={contact.contact_id} className="flex items-center space-x-2 mb-1">
                            {contact.contact_type === 'phone' ? (
                              <Phone className="w-4 h-4 text-gray-400" />
                            ) : (
                              <Mail className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm">{contact.contact_value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {profile.person_address.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Address</p>
                        {profile.person_address.map((address) => (
                          <div key={address.address_id} className="flex items-start space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="text-sm">
                              <p>{address.address_line_1}</p>
                              {address.address_line_2 && <p>{address.address_line_2}</p>}
                              <p>{address.city}, {address.state} {address.zip_code}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            {profile.emergency_contact.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Emergency Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.emergency_contact.map((contact) => (
                      <div key={contact.emergency_contact_id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{contact.contact_name}</p>
                          {contact.is_primary && (
                            <Badge variant="destructive">Primary</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          {contact.relationship}
                        </p>
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{contact.phone_number}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center space-x-2 text-sm mt-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Insurance Information */}
            {profile.insurance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Insurance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.insurance.map((ins) => (
                      <div key={ins.insurance_id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{ins.insurance_provider}</p>
                          <Badge variant={ins.is_active ? "default" : "secondary"}>
                            {ins.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                          {ins.insurance_type} • Policy: {ins.policy_number}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Subscriber: {ins.subscriber_name} ({ins.subscriber_relationship})
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and navigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => navigate('/forms')}
                  >
                    <FileText className="w-6 h-6 mb-2" />
                    <span className="text-sm">Medical Forms</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Calendar className="w-6 h-6 mb-2" />
                    <span className="text-sm">Appointments</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Activity className="w-6 h-6 mb-2" />
                    <span className="text-sm">Vital Signs</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex flex-col items-center justify-center"
                  >
                    <Stethoscope className="w-6 h-6 mb-2" />
                    <span className="text-sm">Records</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Vital Signs Summary */}
            {latestVitals && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Latest Vital Signs
                  </CardTitle>
                  <CardDescription>
                    {new Date(latestVitals.measurement_date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {latestVitals.temperature && (
                      <div className="text-center">
                        <p className="text-2xl font-bold">{latestVitals.temperature}°{latestVitals.temperature_unit}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Temperature</p>
                      </div>
                    )}
                    {latestVitals.blood_pressure_systolic && (
                      <div className="text-center">
                        <p className="text-2xl font-bold">{latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Blood Pressure</p>
                      </div>
                    )}
                    {latestVitals.heart_rate && (
                      <div className="text-center">
                        <p className="text-2xl font-bold">{latestVitals.heart_rate}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Heart Rate</p>
                      </div>
                    )}
                    {latestVitals.weight && (
                      <div className="text-center">
                        <p className="text-2xl font-bold">{latestVitals.weight} {latestVitals.weight_unit}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Weight</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingAppointments.map((apt) => (
                      <div key={apt.appointment_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium">{apt.appointment_type}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {new Date(apt.appointment_date).toLocaleDateString()}
                            {apt.appointment_time && ` at ${apt.appointment_time}`}
                          </p>
                          {apt.reason && (
                            <p className="text-sm text-gray-500">{apt.reason}</p>
                          )}
                        </div>
                        <Badge variant={apt.appointment_status === 'confirmed' ? "default" : "secondary"}>
                          {apt.appointment_status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Conditions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Active Conditions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.condition_occurrence.length > 0 ? (
                    <div className="space-y-2">
                      {profile.condition_occurrence.map((condition) => (
                        <div key={condition.condition_occurrence_id} className="flex items-center justify-between">
                          <div>
                            <span className="text-sm">{condition.condition_source_value}</span>
                            {condition.severity && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {condition.severity}
                              </Badge>
                            )}
                          </div>
                          <Badge variant={condition.active ? "destructive" : "secondary"}>
                            {condition.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">No active conditions</p>
                  )}
                </CardContent>
              </Card>

              {/* Current Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Stethoscope className="w-5 h-5 mr-2" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.drug_exposure.length > 0 ? (
                    <div className="space-y-2">
                      {profile.drug_exposure.map((medication) => (
                        <div key={medication.drug_exposure_id} className="flex items-center justify-between">
                          <div>
                            <span className="text-sm">{medication.drug_source_value}</span>
                            {medication.strength && (
                              <span className="text-xs text-gray-500 ml-1">({medication.strength})</span>
                            )}
                          </div>
                          <Badge variant={medication.prescription_status === 'active' ? "default" : "secondary"}>
                            {medication.prescription_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-300">No current medications</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Allergies */}
            {profile.allergy.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Allergies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {profile.allergy.map((allergy) => (
                      <div key={allergy.allergy_id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-200">
                            {allergy.allergen_source_value}
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-300">
                            {allergy.allergy_type} • {allergy.severity} severity
                          </p>
                          {allergy.reaction && (
                            <p className="text-sm text-red-500 dark:text-red-400">
                              Reaction: {allergy.reaction}
                            </p>
                          )}
                        </div>
                        <Badge variant={allergy.is_active ? "destructive" : "secondary"}>
                          {allergy.is_active ? "Active" : "Resolved"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest health records and visits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.measurement.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">{profile.measurement[0].measurement_source_value}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {profile.measurement[0].value_as_number} {profile.measurement[0].unit_source_value}
                        </p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(profile.measurement[0].measurement_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {profile.visit_occurrence.length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">{profile.visit_occurrence[0].visit_source_value}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {profile.visit_occurrence[0].visit_status || 'Visit completed'}
                        </p>
                        {profile.visit_occurrence[0].chief_complaint && (
                          <p className="text-sm text-gray-500">
                            Chief complaint: {profile.visit_occurrence[0].chief_complaint}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(profile.visit_occurrence[0].visit_start_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {profile.measurement.length === 0 && profile.visit_occurrence.length === 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">
                      No recent activity to display
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 
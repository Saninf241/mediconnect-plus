type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: {
          id: string
          name: string
          type: string
          code: string
          address: string
          siret: string
          speciality: string | null
          phone: string | null
          theme: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: string
          code: string
          address: string
          siret: string
          speciality?: string | null
          phone?: string | null
          theme?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          code?: string
          address?: string
          siret?: string
          speciality?: string | null
          phone?: string | null
          theme?: Json | null
          created_at?: string | null
        }
      }
      clinic_staff: {
        Row: {
          id: string
          clinic_id: string
          name: string
          role: string
          speciality: string | null
          license_number: string | null
          email: string
          created_at: string | null
        }
        Insert: {
          id?: string
          clinic_id: string
          name: string
          role: string
          speciality?: string | null
          license_number?: string | null
          email: string
          created_at?: string | null
        }
        Update: {
          id?: string
          clinic_id?: string
          name?: string
          role?: string
          speciality?: string | null
          license_number?: string | null
          email?: string
          created_at?: string | null
        }
      }
      consultations: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          clinic_id: string
          symptoms: string | null
          diagnosis: string | null
          notes: string | null
          status: string
          is_urgent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          clinic_id: string
          symptoms?: string | null
          diagnosis?: string | null
          notes?: string | null
          status?: string
          is_urgent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          clinic_id?: string
          symptoms?: string | null
          diagnosis?: string | null
          notes?: string | null
          status?: string
          is_urgent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medical_reports: {
        Row: {
          id: string
          consultation_id: string
          content: string
          generated_by: string
          created_at: string
        }
        Insert: {
          id?: string
          consultation_id: string
          content: string
          generated_by: string
          created_at?: string
        }
        Update: {
          id?: string
          consultation_id?: string
          content?: string
          generated_by?: string
          created_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          biometric_id: string | null
          name: string
          date_of_birth: string
          insurance_number: string | null
          email: string | null
          phone: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          biometric_id?: string | null
          name: string
          date_of_birth: string
          insurance_number?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          biometric_id?: string | null
          name?: string
          date_of_birth?: string
          insurance_number?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
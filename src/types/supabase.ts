
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      act_codes: {
        Row: {
          act_key: string | null
          article_no: string | null
          chapter_roman: string | null
          chapter_title: string | null
          code: string
          coefficient: number | null
          id: string
          is_active: boolean
          key_letter: string | null
          profession_scope: string | null
          source: string
          title: string
          title_group: string | null
        }
        Insert: {
          act_key?: string | null
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code: string
          coefficient?: number | null
          id?: string
          is_active?: boolean
          key_letter?: string | null
          profession_scope?: string | null
          source?: string
          title: string
          title_group?: string | null
        }
        Update: {
          act_key?: string | null
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string
          coefficient?: number | null
          id?: string
          is_active?: boolean
          key_letter?: string | null
          profession_scope?: string | null
          source?: string
          title?: string
          title_group?: string | null
        }
        Relationships: []
      }
      act_codes_backup: {
        Row: {
          article_no: string | null
          chapter_roman: string | null
          chapter_title: string | null
          code: string | null
          coefficient: number | null
          id: string | null
          is_active: boolean | null
          key_letter: string | null
          profession_scope: string | null
          source: string | null
          title: string | null
          title_group: string | null
        }
        Insert: {
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          coefficient?: number | null
          id?: string | null
          is_active?: boolean | null
          key_letter?: string | null
          profession_scope?: string | null
          source?: string | null
          title?: string | null
          title_group?: string | null
        }
        Update: {
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          coefficient?: number | null
          id?: string | null
          is_active?: boolean | null
          key_letter?: string | null
          profession_scope?: string | null
          source?: string | null
          title?: string | null
          title_group?: string | null
        }
        Relationships: []
      }
      act_codes_staging: {
        Row: {
          act_key: string | null
          article_no: string | null
          chapter_roman: string | null
          chapter_title: string | null
          code: string | null
          coefficient: number | null
          is_active: boolean | null
          key_letter: string | null
          profession_scope: string | null
          source: string | null
          title: string | null
          title_group: string | null
        }
        Insert: {
          act_key?: string | null
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          coefficient?: number | null
          is_active?: boolean | null
          key_letter?: string | null
          profession_scope?: string | null
          source?: string | null
          title?: string | null
          title_group?: string | null
        }
        Update: {
          act_key?: string | null
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          coefficient?: number | null
          is_active?: boolean | null
          key_letter?: string | null
          profession_scope?: string | null
          source?: string | null
          title?: string | null
          title_group?: string | null
        }
        Relationships: []
      }
      act_codes_staging_backup: {
        Row: {
          article_no: string | null
          chapter_roman: string | null
          chapter_title: string | null
          code: string | null
          coefficient: number | null
          is_active: boolean | null
          key_letter: string | null
          profession_scope: string | null
          source: string | null
          title: string | null
          title_group: string | null
        }
        Insert: {
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          coefficient?: number | null
          is_active?: boolean | null
          key_letter?: string | null
          profession_scope?: string | null
          source?: string | null
          title?: string | null
          title_group?: string | null
        }
        Update: {
          article_no?: string | null
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          coefficient?: number | null
          is_active?: boolean | null
          key_letter?: string | null
          profession_scope?: string | null
          source?: string | null
          title?: string | null
          title_group?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          id: string
          message: string
          type: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          type: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          clinic_id: string | null
          created_at: string | null
          doctor_id: string | null
          id: string
          patient_id: string | null
          reason: string | null
          status: string | null
        }
        Insert: {
          appointment_date: string
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          reason?: string | null
          status?: string | null
        }
        Update: {
          appointment_date?: string
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_items: {
        Row: {
          batch_id: string | null
          consultation_id: string | null
          created_at: string | null
          id: string
        }
        Insert: {
          batch_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          id?: string
        }
        Update: {
          batch_id?: string | null
          consultation_id?: string | null
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_items_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_items_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_items_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_items_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_captures: {
        Row: {
          captured_at: string
          consultation_id: string
          device_id: string | null
          id: string
          operator_id: string | null
          patient_id: string
        }
        Insert: {
          captured_at?: string
          consultation_id: string
          device_id?: string | null
          id?: string
          operator_id?: string | null
          patient_id: string
        }
        Update: {
          captured_at?: string
          consultation_id?: string
          device_id?: string | null
          id?: string
          operator_id?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_captures_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_captures_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_captures_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_captures_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: true
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_captures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_admin_whitelist: {
        Row: {
          clinic_id: string
          email: string
        }
        Insert: {
          clinic_id: string
          email: string
        }
        Update: {
          clinic_id?: string
          email?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_admin_whitelist_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_insurer_networks: {
        Row: {
          can_identify_network: boolean
          clinic_id: string
          created_at: string | null
          id: string
          insurer_id: string
          status: string
        }
        Insert: {
          can_identify_network?: boolean
          clinic_id: string
          created_at?: string | null
          id?: string
          insurer_id: string
          status?: string
        }
        Update: {
          can_identify_network?: boolean
          clinic_id?: string
          created_at?: string | null
          id?: string
          insurer_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_insurer_networks_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_insurer_networks_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_staff: {
        Row: {
          bypass_biometry_until: string | null
          clerk_user_id: string | null
          clinic_id: string | null
          created_at: string | null
          email: string
          exceptional_biometric_access: boolean | null
          id: string
          is_trusted_doctor: boolean | null
          last_login: string | null
          license_number: string | null
          name: string
          qualifications: Json[] | null
          role: string
          schedule: Json | null
          speciality: string | null
          status: string | null
          version: number | null
        }
        Insert: {
          bypass_biometry_until?: string | null
          clerk_user_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          email: string
          exceptional_biometric_access?: boolean | null
          id?: string
          is_trusted_doctor?: boolean | null
          last_login?: string | null
          license_number?: string | null
          name: string
          qualifications?: Json[] | null
          role: string
          schedule?: Json | null
          speciality?: string | null
          status?: string | null
          version?: number | null
        }
        Update: {
          bypass_biometry_until?: string | null
          clerk_user_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          email?: string
          exceptional_biometric_access?: boolean | null
          id?: string
          is_trusted_doctor?: boolean | null
          last_login?: string | null
          license_number?: string | null
          name?: string
          qualifications?: Json[] | null
          role?: string
          schedule?: Json | null
          speciality?: string | null
          status?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          active: boolean | null
          address: string
          code: string
          created_at: string | null
          id: string
          name: string
          phone: string | null
          siret: string
          speciality: string | null
          theme: Json | null
          type: string
        }
        Insert: {
          active?: boolean | null
          address: string
          code?: string
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          siret?: string
          speciality?: string | null
          theme?: Json | null
          type: string
        }
        Update: {
          active?: boolean | null
          address?: string
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          siret?: string
          speciality?: string | null
          theme?: Json | null
          type?: string
        }
        Relationships: []
      }
      consultation_codes: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          id: string
          medical_code_id: string | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          medical_code_id?: string | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          medical_code_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_codes_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_codes_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_codes_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_codes_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_codes_medical_code_id_fkey"
            columns: ["medical_code_id"]
            isOneToOne: false
            referencedRelation: "medical_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_examinations: {
        Row: {
          category: string
          consultation_id: string | null
          created_at: string | null
          id: string
          name: string
          results: string | null
          status: string | null
        }
        Insert: {
          category: string
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          results?: string | null
          status?: string | null
        }
        Update: {
          category?: string
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          results?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_examinations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_examinations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_examinations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_examinations_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          changes: Json
          consultation_id: string | null
          id: string
          version: number
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          changes: Json
          consultation_id?: string | null
          id?: string
          version: number
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          changes?: Json
          consultation_id?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultation_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_history_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_history_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_history_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_history_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_medications: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          dosage: string
          duration: string | null
          form: string
          id: string
          instructions: string | null
          name: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          dosage: string
          duration?: string | null
          form: string
          id?: string
          instructions?: string | null
          name: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          dosage?: string
          duration?: string | null
          form?: string
          id?: string
          instructions?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_medications_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_medications_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_medications_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_medications_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          consultation_id: string | null
          content: string | null
          created_at: string
          id: string
          sender_id: string | null
          sender_role: string | null
        }
        Insert: {
          consultation_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string | null
        }
        Update: {
          consultation_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_role?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          accident_date: string | null
          acts: Json | null
          amount: number | null
          amount_delta: number | null
          amount_expected: number | null
          attachments: Json | null
          billing_details: Json | null
          biometric_clinic_id: string | null
          biometric_operator_id: string | null
          biometric_verified_at: string | null
          ccam_codes: string[] | null
          clinic_id: string | null
          consultation_type: string | null
          created_at: string | null
          diagnosis: string | null
          diagnosis_code_id: string | null
          diagnosis_code_ids: string[]
          diagnosis_code_text: string | null
          diagnosis_drawn: string | null
          doctor_id: string | null
          duration: string | null
          fingerprint_missing: boolean | null
          icd_codes: string[] | null
          id: string
          insurance_coverage: Json | null
          insurer_agent_id: string | null
          insurer_amount: number | null
          insurer_comment: string | null
          insurer_decision_at: string | null
          insurer_id: string | null
          is_urgent: boolean | null
          medical_history_snapshot: Json | null
          medical_reports: Json | null
          medications: string[] | null
          missing_tariffs: number | null
          next_visit_date: string | null
          notes: string | null
          patient_amount: number | null
          patient_id: string | null
          payment_date: string | null
          payment_status: string | null
          pdf_url: string | null
          prescription: Json | null
          pricing_details: Json | null
          pricing_status: string
          pricing_total: number | null
          provisional_amount: number | null
          rejection_reason: string | null
          rights_checked_at: string | null
          status: Database["public"]["Enums"]["consultation_status"] | null
          symptoms: string | null
          symptoms_drawn: string | null
          third_party_accident: boolean | null
          ticket_type: string | null
          type: string | null
          updated_at: string | null
          validated_at: string | null
          version: number | null
          vital_signs: Json | null
        }
        Insert: {
          accident_date?: string | null
          acts?: Json | null
          amount?: number | null
          amount_delta?: number | null
          amount_expected?: number | null
          attachments?: Json | null
          billing_details?: Json | null
          biometric_clinic_id?: string | null
          biometric_operator_id?: string | null
          biometric_verified_at?: string | null
          ccam_codes?: string[] | null
          clinic_id?: string | null
          consultation_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          diagnosis_code_id?: string | null
          diagnosis_code_ids?: string[]
          diagnosis_code_text?: string | null
          diagnosis_drawn?: string | null
          doctor_id?: string | null
          duration?: string | null
          fingerprint_missing?: boolean | null
          icd_codes?: string[] | null
          id?: string
          insurance_coverage?: Json | null
          insurer_agent_id?: string | null
          insurer_amount?: number | null
          insurer_comment?: string | null
          insurer_decision_at?: string | null
          insurer_id?: string | null
          is_urgent?: boolean | null
          medical_history_snapshot?: Json | null
          medical_reports?: Json | null
          medications?: string[] | null
          missing_tariffs?: number | null
          next_visit_date?: string | null
          notes?: string | null
          patient_amount?: number | null
          patient_id?: string | null
          payment_date?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          prescription?: Json | null
          pricing_details?: Json | null
          pricing_status?: string
          pricing_total?: number | null
          provisional_amount?: number | null
          rejection_reason?: string | null
          rights_checked_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"] | null
          symptoms?: string | null
          symptoms_drawn?: string | null
          third_party_accident?: boolean | null
          ticket_type?: string | null
          type?: string | null
          updated_at?: string | null
          validated_at?: string | null
          version?: number | null
          vital_signs?: Json | null
        }
        Update: {
          accident_date?: string | null
          acts?: Json | null
          amount?: number | null
          amount_delta?: number | null
          amount_expected?: number | null
          attachments?: Json | null
          billing_details?: Json | null
          biometric_clinic_id?: string | null
          biometric_operator_id?: string | null
          biometric_verified_at?: string | null
          ccam_codes?: string[] | null
          clinic_id?: string | null
          consultation_type?: string | null
          created_at?: string | null
          diagnosis?: string | null
          diagnosis_code_id?: string | null
          diagnosis_code_ids?: string[]
          diagnosis_code_text?: string | null
          diagnosis_drawn?: string | null
          doctor_id?: string | null
          duration?: string | null
          fingerprint_missing?: boolean | null
          icd_codes?: string[] | null
          id?: string
          insurance_coverage?: Json | null
          insurer_agent_id?: string | null
          insurer_amount?: number | null
          insurer_comment?: string | null
          insurer_decision_at?: string | null
          insurer_id?: string | null
          is_urgent?: boolean | null
          medical_history_snapshot?: Json | null
          medical_reports?: Json | null
          medications?: string[] | null
          missing_tariffs?: number | null
          next_visit_date?: string | null
          notes?: string | null
          patient_amount?: number | null
          patient_id?: string | null
          payment_date?: string | null
          payment_status?: string | null
          pdf_url?: string | null
          prescription?: Json | null
          pricing_details?: Json | null
          pricing_status?: string
          pricing_total?: number | null
          provisional_amount?: number | null
          rejection_reason?: string | null
          rights_checked_at?: string | null
          status?: Database["public"]["Enums"]["consultation_status"] | null
          symptoms?: string | null
          symptoms_drawn?: string | null
          third_party_accident?: boolean | null
          ticket_type?: string | null
          type?: string | null
          updated_at?: string | null
          validated_at?: string | null
          version?: number | null
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_diagnosis_code_id_fkey"
            columns: ["diagnosis_code_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_insurer_agent_id_fkey"
            columns: ["insurer_agent_id"]
            isOneToOne: false
            referencedRelation: "insurer_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnosis_codes: {
        Row: {
          chapter_roman: string | null
          chapter_title: string | null
          code: string
          code_range: string | null
          created_at: string
          id: string
          is_active: boolean
          source: string
          title: string
        }
        Insert: {
          chapter_roman?: string | null
          chapter_title?: string | null
          code: string
          code_range?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          source?: string
          title: string
        }
        Update: {
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string
          code_range?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          source?: string
          title?: string
        }
        Relationships: []
      }
      diagnosis_codes_staging: {
        Row: {
          chapter_roman: string | null
          chapter_title: string | null
          code: string | null
          code_range: string | null
          source: string | null
          title: string | null
        }
        Insert: {
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          code_range?: string | null
          source?: string | null
          title?: string | null
        }
        Update: {
          chapter_roman?: string | null
          chapter_title?: string | null
          code?: string | null
          code_range?: string | null
          source?: string | null
          title?: string | null
        }
        Relationships: []
      }
      etablissements: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nom: string
          type: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          nom: string
          type: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nom?: string
          type?: string
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          assurer_id: string | null
          data: Json | null
          generated_at: string | null
          id: string
          type: string
          url: string | null
        }
        Insert: {
          assurer_id?: string | null
          data?: Json | null
          generated_at?: string | null
          id?: string
          type: string
          url?: string | null
        }
        Update: {
          assurer_id?: string | null
          data?: Json | null
          generated_at?: string | null
          id?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      insurer_act_code_map: {
        Row: {
          act_code_id: string
          id: string
          insurer_code: string
          insurer_coefficient: number | null
          insurer_id: string
          insurer_key_letter: string | null
          insurer_label: string | null
        }
        Insert: {
          act_code_id: string
          id?: string
          insurer_code: string
          insurer_coefficient?: number | null
          insurer_id: string
          insurer_key_letter?: string | null
          insurer_label?: string | null
        }
        Update: {
          act_code_id?: string
          id?: string
          insurer_code?: string
          insurer_coefficient?: number | null
          insurer_id?: string
          insurer_key_letter?: string | null
          insurer_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurer_act_code_map_act_code_id_fkey"
            columns: ["act_code_id"]
            isOneToOne: false
            referencedRelation: "act_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurer_act_code_map_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurer_diagnosis_code_map: {
        Row: {
          diagnosis_code_id: string
          id: string
          insurer_code: string
          insurer_id: string
          insurer_label: string | null
        }
        Insert: {
          diagnosis_code_id: string
          id?: string
          insurer_code: string
          insurer_id: string
          insurer_label?: string | null
        }
        Update: {
          diagnosis_code_id?: string
          id?: string
          insurer_code?: string
          insurer_id?: string
          insurer_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurer_diagnosis_code_map_diagnosis_code_id_fkey"
            columns: ["diagnosis_code_id"]
            isOneToOne: false
            referencedRelation: "diagnosis_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurer_diagnosis_code_map_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurer_memberships: {
        Row: {
          confidence: string | null
          coverage_end: string | null
          coverage_start: string | null
          created_at: string | null
          id: string
          insurer_id: string | null
          is_active: boolean | null
          last_verified_at: string | null
          member_no: string | null
          patient_id: string
          plan_code: string | null
          source: Json | null
          status: string | null
          verification_level: string | null
        }
        Insert: {
          confidence?: string | null
          coverage_end?: string | null
          coverage_start?: string | null
          created_at?: string | null
          id?: string
          insurer_id?: string | null
          is_active?: boolean | null
          last_verified_at?: string | null
          member_no?: string | null
          patient_id: string
          plan_code?: string | null
          source?: Json | null
          status?: string | null
          verification_level?: string | null
        }
        Update: {
          confidence?: string | null
          coverage_end?: string | null
          coverage_start?: string | null
          created_at?: string | null
          id?: string
          insurer_id?: string | null
          is_active?: boolean | null
          last_verified_at?: string | null
          member_no?: string | null
          patient_id?: string
          plan_code?: string | null
          source?: Json | null
          status?: string | null
          verification_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurer_memberships_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurer_memberships_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      insurer_staff: {
        Row: {
          clerk_user_id: string | null
          created_at: string | null
          email: string
          id: string
          insurer_id: string
          role: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          insurer_id: string
          role?: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          insurer_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurer_staff_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurer_tariffs: {
        Row: {
          context: Database["public"]["Enums"]["tariff_context"] | null
          coverage_case: Database["public"]["Enums"]["coverage_case"] | null
          created_at: string
          currency: string
          effective_from: string | null
          effective_to: string | null
          id: string
          insured_rate: number | null
          insurer_id: string
          insurer_rate: number | null
          is_active: boolean
          key_letter: string
          key_letter_label: string | null
          source: string
          unit_value: number | null
          unit_value_fcfa: number
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          context?: Database["public"]["Enums"]["tariff_context"] | null
          coverage_case?: Database["public"]["Enums"]["coverage_case"] | null
          created_at?: string
          currency?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          insured_rate?: number | null
          insurer_id: string
          insurer_rate?: number | null
          is_active?: boolean
          key_letter: string
          key_letter_label?: string | null
          source?: string
          unit_value?: number | null
          unit_value_fcfa: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          context?: Database["public"]["Enums"]["tariff_context"] | null
          coverage_case?: Database["public"]["Enums"]["coverage_case"] | null
          created_at?: string
          currency?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          insured_rate?: number | null
          insurer_id?: string
          insurer_rate?: number | null
          is_active?: boolean
          key_letter?: string
          key_letter_label?: string | null
          source?: string
          unit_value?: number | null
          unit_value_fcfa?: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurer_tariffs_insurer_id_fkey"
            columns: ["insurer_id"]
            isOneToOne: false
            referencedRelation: "insurers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurer_tariffs_staging: {
        Row: {
          context: string
          coverage_case: string
          currency: string
          effective_from: string
          inserted_at: string
          insured_rate: number
          insurer_id: string
          insurer_rate: number
          is_active: boolean
          key_letter: string
          source: string
          unit_value: number
          unit_value_fcfa: number | null
        }
        Insert: {
          context: string
          coverage_case: string
          currency: string
          effective_from: string
          inserted_at?: string
          insured_rate: number
          insurer_id: string
          insurer_rate: number
          is_active?: boolean
          key_letter: string
          source: string
          unit_value: number
          unit_value_fcfa?: number | null
        }
        Update: {
          context?: string
          coverage_case?: string
          currency?: string
          effective_from?: string
          inserted_at?: string
          insured_rate?: number
          insurer_id?: string
          insurer_rate?: number
          is_active?: boolean
          key_letter?: string
          source?: string
          unit_value?: number
          unit_value_fcfa?: number | null
        }
        Relationships: []
      }
      insurers: {
        Row: {
          id: string
          name: string
          slug: string | null
          verification_level: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          verification_level: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          verification_level?: string
        }
        Relationships: []
      }
      medical_acts: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          label: string
          source: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label: string
          source?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          label?: string
          source?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_codes: {
        Row: {
          category: string | null
          code: string
          code_type: string
          created_at: string | null
          description: string
          id: string
          subcategory: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code: string
          code_type: string
          created_at?: string | null
          description: string
          id?: string
          subcategory?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          code_type?: string
          created_at?: string | null
          description?: string
          id?: string
          subcategory?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_reports: {
        Row: {
          consultation_id: string | null
          content: string
          created_at: string | null
          generated_by: string | null
          id: string
        }
        Insert: {
          consultation_id?: string | null
          content: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
        }
        Update: {
          consultation_id?: string | null
          content?: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_reports_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reports_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reports_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reports_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_standard_codes: {
        Row: {
          code: string
          code_type: string
          created_at: string | null
          description: string
          id: string
        }
        Insert: {
          code: string
          code_type: string
          created_at?: string | null
          description: string
          id?: string
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string | null
          description?: string
          id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          consultation_id: string | null
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          consultation_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
          sender_role: string
        }
        Update: {
          consultation_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_auth: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          password_hash: string
          patient_id: string | null
          reset_token: string | null
          reset_token_expires: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          password_hash: string
          patient_id?: string | null
          reset_token?: string | null
          reset_token_expires?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          password_hash?: string
          patient_id?: string | null
          reset_token?: string | null
          reset_token_expires?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_auth_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_biometrics: {
        Row: {
          captured_at: string
          clinic_id: string
          device_model: string | null
          enrolled_by: string | null
          id: string
          patient_id: string
          quality: number | null
          revoked: boolean
          template_b64: string
          template_hash: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          clinic_id: string
          device_model?: string | null
          enrolled_by?: string | null
          id?: string
          patient_id: string
          quality?: number | null
          revoked?: boolean
          template_b64: string
          template_hash: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          clinic_id?: string
          device_model?: string | null
          enrolled_by?: string | null
          id?: string
          patient_id?: string
          quality?: number | null
          revoked?: boolean
          template_b64?: string
          template_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_biometrics_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_biometrics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinic_links: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          patient_id: string
          rel: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          patient_id: string
          rel?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          patient_id?: string
          rel?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinic_links_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "etablissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinic_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          auth_user_id: string | null
          biometric_id: string | null
          clinic_id: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string
          email: string | null
          emergency_contact: Json | null
          fingerprint_enrolled: boolean
          fingerprint_missing: boolean | null
          has_fingerprint: boolean
          id: string
          insurance_expiry: string | null
          insurance_number: string | null
          insurance_provider: string | null
          insurance_status: string | null
          insurance_type: string | null
          is_assured: boolean | null
          last_visit_date: string | null
          medical_history: Json | null
          name: string
          national_id: string | null
          phone: string | null
          sex: string | null
          status: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          auth_user_id?: string | null
          biometric_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth: string
          email?: string | null
          emergency_contact?: Json | null
          fingerprint_enrolled?: boolean
          fingerprint_missing?: boolean | null
          has_fingerprint?: boolean
          id?: string
          insurance_expiry?: string | null
          insurance_number?: string | null
          insurance_provider?: string | null
          insurance_status?: string | null
          insurance_type?: string | null
          is_assured?: boolean | null
          last_visit_date?: string | null
          medical_history?: Json | null
          name: string
          national_id?: string | null
          phone?: string | null
          sex?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          auth_user_id?: string | null
          biometric_id?: string | null
          clinic_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string
          email?: string | null
          emergency_contact?: Json | null
          fingerprint_enrolled?: boolean
          fingerprint_missing?: boolean | null
          has_fingerprint?: boolean
          id?: string
          insurance_expiry?: string | null
          insurance_number?: string | null
          insurance_provider?: string | null
          insurance_status?: string | null
          insurance_type?: string | null
          is_assured?: boolean | null
          last_visit_date?: string | null
          medical_history?: Json | null
          name?: string
          national_id?: string | null
          phone?: string | null
          sex?: string | null
          status?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patients_fingerprint: {
        Row: {
          created_at: string | null
          device_type: string | null
          fingerprint_template: string | null
          id: string
          patient_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          fingerprint_template?: string | null
          id?: string
          patient_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          fingerprint_template?: string | null
          id?: string
          patient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_fingerprint_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          amount: number | null
          clinic_id: string | null
          commission: number | null
          created_at: string | null
          id: string
          paid_at: string | null
          status: string | null
          total_paid: number | null
        }
        Insert: {
          amount?: number | null
          clinic_id?: string | null
          commission?: number | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          total_paid?: number | null
        }
        Update: {
          amount?: number | null
          clinic_id?: string | null
          commission?: number | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          total_paid?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          assurer_id: string | null
          clinic_id: string | null
          commission: number
          consultation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          payment_date: string | null
          payment_method: string
          payment_reference: string | null
          status: string
          total_amount: number
        }
        Insert: {
          amount: number
          assurer_id?: string | null
          clinic_id?: string | null
          commission: number
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method: string
          payment_reference?: string | null
          status: string
          total_amount: number
        }
        Update: {
          amount?: number
          assurer_id?: string | null
          clinic_id?: string | null
          commission?: number
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string
          payment_reference?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_assurer_id_fkey"
            columns: ["assurer_id"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          subscription_level: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          subscription_level?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          subscription_level?: string | null
        }
        Relationships: []
      }
      pharmacy_deliveries: {
        Row: {
          comment: string | null
          consultation_id: string
          delivered_at: string
          id: string
          pharmacist_id: string
          pharmacy_id: string
        }
        Insert: {
          comment?: string | null
          consultation_id: string
          delivered_at?: string
          id?: string
          pharmacist_id: string
          pharmacy_id: string
        }
        Update: {
          comment?: string | null
          consultation_id?: string
          delivered_at?: string
          id?: string
          pharmacist_id?: string
          pharmacy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_deliveries_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_deliveries_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_deliveries_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_deliveries_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_deliveries_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_receipts: {
        Row: {
          consultation_id: string | null
          created_at: string | null
          id: string
          items: Json | null
          patient_id: string | null
          pharmacy_name: string | null
          receipt_date: string
          total_amount: number | null
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          items?: Json | null
          patient_id?: string | null
          pharmacy_name?: string | null
          receipt_date?: string
          total_amount?: number | null
        }
        Update: {
          consultation_id?: string | null
          created_at?: string | null
          id?: string
          items?: Json | null
          patient_id?: string | null
          pharmacy_name?: string | null
          receipt_date?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_receipts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_receipts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_receipts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_receipts_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_receipts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_staff: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          pharmacy_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          pharmacy_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          pharmacy_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_staff_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          consultation_id: string | null
          content: string
          created_at: string | null
          doctor_id: string | null
          id: string
          patient_id: string | null
          printed_once: boolean | null
        }
        Insert: {
          consultation_id?: string | null
          content: string
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          printed_once?: boolean | null
        }
        Update: {
          consultation_id?: string | null
          content?: string
          created_at?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          printed_once?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_bio_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations_fingerprint_alerts_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_clinic_types: {
        Row: {
          clinic_type: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          clinic_type: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          clinic_type?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      specialists: {
        Row: {
          active: boolean | null
          bypass_biometric: boolean | null
          clinic_id: string | null
          created_at: string | null
          id: string
          is_developer: boolean | null
          license_number: string | null
          name: string
          role: string
          speciality: string
        }
        Insert: {
          active?: boolean | null
          bypass_biometric?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_developer?: boolean | null
          license_number?: string | null
          name: string
          role?: string
          speciality: string
        }
        Update: {
          active?: boolean | null
          bypass_biometric?: boolean | null
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_developer?: boolean | null
          license_number?: string | null
          name?: string
          role?: string
          speciality?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialists_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          doctor_id: string | null
          end_date: string | null
          engagement_months: number
          id: string
          maintenance_included: boolean | null
          monthly_price: number
          plan_type: string
          start_date: string
          test_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          end_date?: string | null
          engagement_months?: number
          id?: string
          maintenance_included?: boolean | null
          monthly_price?: number
          plan_type?: string
          start_date?: string
          test_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          doctor_id?: string | null
          end_date?: string | null
          engagement_months?: number
          id?: string
          maintenance_included?: boolean | null
          monthly_price?: number
          plan_type?: string
          start_date?: string
          test_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          clinic_id: string | null
          created_at: string
          id: string
          message: string | null
          sender_id: string | null
          sender_name: string | null
          sender_role: string | null
          status: string | null
          subject: string | null
          target: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string | null
          status?: string | null
          subject?: string | null
          target?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string | null
          status?: string | null
          subject?: string | null
          target?: string | null
        }
        Relationships: []
      }
      support_responses: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          message_id: string | null
          responder: string | null
          response: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          responder?: string | null
          response?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          responder?: string | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_responses_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_responses_message_fk"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "support_messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      consultations_alerts: {
        Row: {
          amount: number | null
          anomaly: boolean | null
          clinic_name: string | null
          created_at: string | null
          doctor_name: string | null
          id: string | null
          patient_is_assured: boolean | null
          patient_name: string | null
          status: Database["public"]["Enums"]["consultation_status"] | null
        }
        Relationships: []
      }
      consultations_anomalies_7d: {
        Row: {
          amount: number | null
          clinic_id: string | null
          clinic_name: string | null
          consultation_id: string | null
          created_at: string | null
          doctor_id: string | null
          doctor_name: string | null
          message: string | null
          patient_id: string | null
          patient_is_assured: boolean | null
          patient_name: string | null
          title: string | null
          type: string | null
        }
        Relationships: []
      }
      consultations_bio_feed: {
        Row: {
          amount: number | null
          biometric_validated_at: string | null
          clinic_name: string | null
          created_at: string | null
          doctor_name: string | null
          id: string | null
          patient_is_assured: boolean | null
          patient_name: string | null
          status: Database["public"]["Enums"]["consultation_status"] | null
        }
        Relationships: []
      }
      consultations_fingerprint_alerts_30d: {
        Row: {
          amount: number | null
          biometric_clinic_id: string | null
          biometric_operator_id: string | null
          biometric_verified_at: string | null
          clinic_id: string | null
          clinic_name: string | null
          created_at: string | null
          doctor_id: string | null
          doctor_name: string | null
          fingerprint_missing: boolean | null
          id: string | null
          patient_id: string | null
          patient_is_assured: boolean | null
          patient_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_unread_messages_by_consultation: {
        Row: {
          consultation_id: string | null
          unread_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      check_role_clinic_compatibility: {
        Args: { p_clinic_id: string; p_role: string }
        Returns: boolean
      }
      compute_consultation_pricing: {
        Args: {
          p_case: Database["public"]["Enums"]["coverage_case"]
          p_consultation_id: string
          p_context: Database["public"]["Enums"]["tariff_context"]
        }
        Returns: Json
      }
      create_patient_with_link: {
        Args: { actor_email: string; p: Json }
        Returns: string
      }
      finalize_patient_uninsured: {
        Args: {
          actor_email: string
          p_fingerprint_missing: boolean
          p_patient_id: string
        }
        Returns: undefined
      }
      generate_weekly_report: { Args: never; Returns: undefined }
      get_dashboard_stats_by_doctor: {
        Args: never
        Returns: {
          consultation_count: number
          doctor_id: string
          doctor_name: string
          rejection_rate: number
          total_amount: number
        }[]
      }
      get_doctor_performance:
        | {
            Args: { input_doctor_id: string }
            Returns: {
              avg_payment_delay: number
              current_month_revenue: number
              immediate_acceptance_rate: number
              monthly_revenues: Json
              previous_month_revenue: number
            }[]
          }
        | {
            Args: { input_doctor_id: string; input_period: string }
            Returns: Json
          }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      match_fingerprint: {
        Args: { fingerprint: string }
        Returns: {
          patient_id: string
        }[]
      }
      rpc_create_patient_draft:
        | {
            Args: {
              p_clinic_id: string
              p_created_by: string
              p_date_of_birth: string
              p_email: string
              p_full_name: string
              p_national_id: string
              p_phone: string
              p_sex: string
            }
            Returns: string
          }
        | {
            Args: {
              p_created_by: string
              p_date_of_birth: string
              p_email: string
              p_full_name: string
              p_national_id: string
              p_phone: string
              p_sex: string
            }
            Returns: {
              patient_id: string
            }[]
          }
      rpc_finalize_uninsured: {
        Args: { p_fingerprint_captured?: boolean; p_patient_id: string }
        Returns: undefined
      }
      sum_amount_today: {
        Args: never
        Returns: {
          sum: number
        }[]
      }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
    }
    Enums: {
      consultation_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "paid"
        | "validated"
      coverage_case: "acute" | "chronic" | "pregnancy"
      tariff_context: "private_weekday" | "private_night_weekend_holiday"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consultation_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "paid",
        "validated",
      ],
      coverage_case: ["acute", "chronic", "pregnancy"],
      tariff_context: ["private_weekday", "private_night_weekend_holiday"],
    },
  },
} as const

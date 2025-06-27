import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { ReactElement } from 'react';

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 20
  },
  headerLeft: {
    flexDirection: 'column'
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  logo: {
    width: 150,
    marginBottom: 10
  },
  clinicInfo: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 4
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 15
  },
  infoColumn: {
    flex: 1
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2
  },
  value: {
    fontSize: 12,
    color: '#1F2937'
  },
  table: {
    marginTop: 10
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8
  },
  tableHeader: {
    backgroundColor: '#F9FAFB'
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    padding: 4
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#6B7280',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  signature: {
    marginTop: 40,
    alignItems: 'flex-end'
  },
  stamp: {
    width: 100,
    height: 100,
    marginTop: 10
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  confidentialWatermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: '#E5E7EB',
    opacity: 0.3
  },
  totalSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  },
  insuranceInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 4
  }
});

interface Patient {
  name: string;
  dateOfBirth: string;
  address?: string;
  phone?: string;
  insuranceNumber?: string;
  insurance_provider?: string;
}

interface DoctorProfile {
  name: string;
  rppsCode: string;
  establishmentCode: string;
  speciality: string;
}

interface ConsultationData {
  symptoms: string;
  diagnosis: string;
  notes: string;
  isUrgent?: boolean;
  created_at: string;
  consultation_type: string;
  amount?: number;
}

interface Medication {
  name: string;
  dosage: string;
  form: string;
  instructions?: string;
  price?: number;
}

interface Examination {
  name: string;
  category: string;
  status?: string;
  results?: string;
  price?: number;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function MedicalReport({
  patient,
  doctor,
  consultation,
  medications,
  examinations
}: {
  patient: Patient;
  doctor: DoctorProfile;
  consultation: ConsultationData;
  medications: Medication[];
  examinations: Examination[];
}): ReactElement {
  // Calcul des totaux
  const medicationsTotal = medications.reduce((sum, med) => sum + (med.price || 0), 0);
  const examinationsTotal = examinations.reduce((sum, exam) => sum + (exam.price || 0), 0);
  const consultationAmount = consultation.amount || 0;
  const total = medicationsTotal + examinationsTotal + consultationAmount;

  // Calcul de la part patient si assuré
  const insuranceCoverage = patient.insurance_provider ? 0.8 : 0;
  const patientShare = total * (1 - insuranceCoverage);
  const insuranceShare = total * insuranceCoverage;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              src="https://raw.githubusercontent.com/stackblitz/stackblitz-logo/main/icon192.png"
              style={styles.logo}
            />
            <Text style={styles.clinicInfo}>MediConnect+</Text>
            <Text style={styles.clinicInfo}>Cabinet Vision Plus</Text>
            <Text style={styles.clinicInfo}>15 Avenue des Lumières</Text>
            <Text style={styles.clinicInfo}>Libreville, Gabon</Text>
            <Text style={styles.clinicInfo}>Tél: 01 23 45 67 89</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.clinicInfo}>
              Date: {formatDate(consultation.created_at)}
            </Text>
            <Text style={styles.clinicInfo}>
              N° RPPS: {doctor.rppsCode}
            </Text>
          </View>
        </View>

        {consultation.isUrgent && (
          <View style={styles.urgentBadge}>
            <Text>URGENT</Text>
          </View>
        )}

        <Text style={styles.documentTitle}>Rapport de Consultation</Text>

        {/* Informations Patient et Médecin */}
        <View style={styles.section}>
          <View style={styles.infoGrid}>
            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>PATIENT</Text>
              <Text style={styles.value}>{patient.name}</Text>
              <Text style={styles.value}>
                Né(e) le {new Date(patient.dateOfBirth).toLocaleDateString('fr-FR')}
              </Text>
              {patient.address && (
                <Text style={styles.value}>{patient.address}</Text>
              )}
              {patient.phone && (
                <Text style={styles.value}>Tél: {patient.phone}</Text>
              )}
              {patient.insuranceNumber && (
                <Text style={styles.value}>
                  N° Assuré: {patient.insuranceNumber}
                  {patient.insurance_provider && ` (${patient.insurance_provider})`}
                </Text>
              )}
            </View>
            <View style={styles.infoColumn}>
              <Text style={styles.sectionTitle}>MÉDECIN</Text>
              <Text style={styles.value}>Dr. {doctor.name}</Text>
              <Text style={styles.value}>{doctor.speciality}</Text>
              <Text style={styles.value}>Code: {doctor.establishmentCode}</Text>
            </View>
          </View>
        </View>

        {/* Type de Consultation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TYPE DE CONSULTATION</Text>
          <Text style={styles.value}>
            {consultation.consultation_type.charAt(0).toUpperCase() + 
             consultation.consultation_type.slice(1)}
          </Text>
        </View>

        {/* Motif et Symptômes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MOTIF ET SYMPTÔMES</Text>
          <Text style={styles.value}>{consultation.symptoms}</Text>
        </View>

        {/* Diagnostic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DIAGNOSTIC</Text>
          <Text style={styles.value}>{consultation.diagnosis}</Text>
        </View>

        {/* Prescriptions */}
        {medications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRESCRIPTIONS</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Médicament</Text>
                <Text style={styles.tableCell}>Dosage</Text>
                <Text style={styles.tableCell}>Forme</Text>
                <Text style={styles.tableCell}>Prix</Text>
              </View>
              {medications.map((med, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{med.name}</Text>
                  <Text style={styles.tableCell}>{med.dosage}</Text>
                  <Text style={styles.tableCell}>{med.form}</Text>
                  <Text style={styles.tableCell}>
                    {med.price ? formatCurrency(med.price) : 'N/A'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Examens */}
        {examinations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXAMENS PRESCRITS</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Examen</Text>
                <Text style={styles.tableCell}>Catégorie</Text>
                <Text style={styles.tableCell}>Statut</Text>
                <Text style={styles.tableCell}>Prix</Text>
              </View>
              {examinations.map((exam, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{exam.name}</Text>
                  <Text style={styles.tableCell}>{exam.category}</Text>
                  <Text style={styles.tableCell}>{exam.status || 'En attente'}</Text>
                  <Text style={styles.tableCell}>
                    {exam.price ? formatCurrency(exam.price) : 'N/A'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Résumé financier */}
        <View style={styles.totalSection}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>
              Consultation
            </Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>
              {formatCurrency(consultationAmount)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Médicaments</Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>
              {formatCurrency(medicationsTotal)}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]}>Examens</Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>
              {formatCurrency(examinationsTotal)}
            </Text>
          </View>
          <View style={[styles.tableRow, { fontWeight: 'bold' }]}>
            <Text style={[styles.tableCell, { flex: 2 }]}>TOTAL</Text>
            <Text style={[styles.tableCell, { textAlign: 'right' }]}>
              {formatCurrency(total)}
            </Text>
          </View>
        </View>

        {/* Information assurance */}
        {patient.insurance_provider && (
          <View style={styles.insuranceInfo}>
            <Text style={styles.sectionTitle}>PRISE EN CHARGE</Text>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Part Assurance (80%)</Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                {formatCurrency(insuranceShare)}
              </Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Part Patient (20%)</Text>
              <Text style={[styles.tableCell, { textAlign: 'right' }]}>
                {formatCurrency(patientShare)}
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {consultation.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES COMPLÉMENTAIRES</Text>
            <Text style={styles.value}>{consultation.notes}</Text>
          </View>
        )}

        {/* Signature et Cachet */}
        <View style={styles.signature}>
          <Text style={styles.value}>Dr. {doctor.name}</Text>
          <Text style={styles.value}>{doctor.speciality}</Text>
          <Image
            src="https://raw.githubusercontent.com/stackblitz/stackblitz-logo/main/icon192.png"
            style={styles.stamp}
          />
        </View>

        {/* Pied de page */}
        <Text style={styles.footer}>
          Cabinet Vision Plus - 15 Avenue des Lumières, Libreville
          Tél: 01 23 45 67 89 - RPPS: {doctor.rppsCode}
          Document généré par MediConnect+ - Certifié
        </Text>

        {/* Filigrane Confidentiel */}
        <Text style={styles.confidentialWatermark}>CONFIDENTIEL</Text>
      </Page>
    </Document>
  );
}

export async function generatePatientReport(
  patient: Patient,
  doctor: DoctorProfile,
  consultation: ConsultationData,
  medications: Medication[],
  examinations: Examination[]
): Promise<Blob> {
  const { pdf } = await import('@react-pdf/renderer');
  
  const element = React.createElement(MedicalReport, {
    patient,
    doctor,
    consultation,
    medications,
    examinations
  });

  return pdf(element).toBlob();
}
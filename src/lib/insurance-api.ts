

// Types pour les assureurs
export type InsuranceProvider = 'CNAMGS' | 'Ascoma' | 'Gras Savoye';

interface InsuranceEndpoint {
  name: InsuranceProvider;
  url: string;
  apiKey: string;
}

// Configuration des endpoints des assureurs (simulation)
const insuranceEndpoints: Record<InsuranceProvider, InsuranceEndpoint> = {
  CNAMGS: {
    name: 'CNAMGS',
    url: 'https://api.cnamgs.test/reports',
    apiKey: 'test-cnamgs-key'
  },
  Ascoma: {
    name: 'Ascoma',
    url: 'https://api.ascoma.test/medical-reports',
    apiKey: 'test-ascoma-key'
  },
  'Gras Savoye': {
    name: 'Gras Savoye',
    url: 'https://api.gras-savoye.test/submissions',
    apiKey: 'test-gs-key'
  }
};

interface TransmissionResult {
  success: boolean;
  reference?: string;
  error?: string;
  provider: InsuranceProvider;
  timestamp: string;
}

// Simulation de délai réseau
const simulateNetworkDelay = () => 
  new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

// Simulation de la transmission du rapport à l'assurance
export async function transmitReportToInsurance(
  provider: InsuranceProvider,
  reportBlob: Blob,
  patientId: string,
  consultationId: string
): Promise<TransmissionResult> {
  // Simulation du délai réseau
  await simulateNetworkDelay();

  // Simulation de la réponse de l'assureur
  const endpoint = insuranceEndpoints[provider];
  
  // Simulation d'erreurs aléatoires (10% de chance)
  if (Math.random() < 0.1) {
    throw new Error(`Erreur de connexion avec ${provider}`);
  }

  // Génération d'un numéro de référence unique
  const reference = `${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Stockage de la transmission dans le mode test
  return {
    success: true,
    reference,
    provider,
    timestamp: new Date().toISOString()
  };
}

// Vérification du statut de la transmission
export async function checkTransmissionStatus(
  provider: InsuranceProvider,
  reference: string
): Promise<{
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
}> {
  await simulateNetworkDelay();

  // Simulation de différents états possibles
  const random = Math.random();
  if (random < 0.7) {
    return { status: 'accepted' };
  } else if (random < 0.9) {
    return { status: 'pending', message: 'En cours de traitement' };
  } else {
    return { 
      status: 'rejected',
      message: 'Document incomplet ou mal formaté'
    };
  }
}
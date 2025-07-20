// /api/createUser.ts
import { clerkClient } from '@clerk/clerk-sdk-node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Utilise la clé "Service Role"
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed')

  const { email, password, name, role, clinic_id } = req.body

  try {
    // 1. Création de l'utilisateur dans Clerk
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
    })

    // 2. Insertion dans Supabase
    const { error } = await supabase.from('clinic_staff').insert({
      id: user.id, // id Clerk = id dans clinic_staff
      clinic_id,
      name,
      role,
      status: 'active',
      exceptional_biometric_access: true,
    })

    if (error) throw error

    return res.status(200).json({ success: true, userId: user.id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}

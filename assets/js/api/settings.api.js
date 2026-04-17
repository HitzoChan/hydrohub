// settings.api.js

export async function getSettings() {
  // supabase.from('settings').select('*').single()
}

export async function saveSettings(data) {
  // supabase.from('settings').upsert(data)
}

export async function uploadLogo(file) {
  // supabase.storage.from('logos').upload('logo.png', file)
}
// READY FOR SUPABASE

export async function getMessages(conversationId) {
  // return supabase.from('messages').select('*').eq('conversation_id', conversationId);
}

export async function sendMessage(data) {
  // return supabase.from('messages').insert(data);
}

export async function getConversations() {
  // return supabase.from('conversations').select('*');
}
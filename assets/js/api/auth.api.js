// =============================
// AUTH API (SUPABASE READY)
// =============================

export async function loginUser(email, password) {

  // 🔥 FUTURE (SUPABASE)
  // const { data, error } = await supabase.auth.signInWithPassword({
  //   email,
  //   password
  // });

  // TEMP LOGIN (FOR NOW)
  if (email === "admin@gmail.com" && password === "123456") {
    return {
      success: true,
      user: { role: "admin", email }
    };
  }

  if (email === "staff@gmail.com" && password === "123456") {
    return {
      success: true,
      user: { role: "staff", email }
    };
  }

  return { success: false };
}
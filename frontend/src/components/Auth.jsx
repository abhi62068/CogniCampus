import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  "https://esojecwsoumsezwrplcl.supabase.co", 
  "YOUR_ANON_KEY_HERE" // Paste your key from the .env file
)

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google' })

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-200">
        <h2 className="text-2xl font-bold text-center mb-6">{isSignUp ? 'Join CogniCampus' : 'Welcome Back'}</h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          <button className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition">{loading ? '...' : isSignUp ? 'Sign Up' : 'Login'}</button>
        </form>

        <div className="relative my-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-300"></span></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div></div>

        <button onClick={handleGoogle} className="w-full border border-gray-300 p-3 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-50 transition">
          <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" /> Google
        </button>

        <p className="mt-6 text-center text-sm">
          {isSignUp ? 'Already have an account?' : 'New here?'} 
          <button onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-blue-600 font-bold">{isSignUp ? 'Login' : 'Create Account'}</button>
        </p>
      </div>
    </div>
  )
}
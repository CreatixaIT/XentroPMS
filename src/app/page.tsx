import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans min-h-screen bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: 'url(/assets/dashboard_bg.png)' }}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/95 to-slate-100/95 dark:from-slate-950/95 dark:to-slate-900/95" />
      <div className="relative z-10 flex flex-col flex-1 w-full">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-50">Xentro PMS</span>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Login
        </Link>
      </header>

      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center px-6 py-16">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">X</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">
              Xentro PMS
            </h1>
          </div>
          
          <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-300">
            Project Management Software
          </h2>
          
          <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Internal company management application for employees, team leaders, and administrators.
            Built for efficiency, collaboration, and success.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8 w-full max-w-3xl">
            <div className="flex flex-col items-center gap-2 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Team Management</span>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Task Tracking</span>
            </div>
            
            <div className="flex flex-col items-center gap-2 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Analytics</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
        <p>&copy; {new Date().getFullYear()} Xentro PMS. All rights reserved.</p>
      </footer>
      </div>
    </div>
  );
}

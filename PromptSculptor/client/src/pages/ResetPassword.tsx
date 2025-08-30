import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export default function ResetPassword() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-inter text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
      <div className="flex items-center justify-center px-4 py-8 min-h-screen">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-magic text-white text-sm"></i>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">PromptCraft</h1>
            </div>
          </div>
          
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
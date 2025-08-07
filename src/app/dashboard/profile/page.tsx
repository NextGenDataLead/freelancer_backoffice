import { ProfileForm } from '@/components/profile/profile-form'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Profile Settings
            </h1>
            <p className="text-slate-600 mt-1">
              Manage your personal information and preferences.
            </p>
          </div>

          {/* Profile Form */}
          <ProfileForm />
        </div>
      </div>
    </div>
  )
}
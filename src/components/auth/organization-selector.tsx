'use client'

import { OrganizationSwitcher } from '@clerk/nextjs'

export function OrganizationSelector() {
  return (
    <OrganizationSwitcher
      appearance={{
        elements: {
          rootBox: 'flex items-center',
          organizationSwitcherTrigger: 'px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          organizationSwitcherTriggerIcon: 'w-4 h-4',
          organizationPreview: 'flex items-center space-x-2',
          organizationPreviewAvatarBox: 'flex-shrink-0',
          organizationPreviewTextContainer: 'flex-1 min-w-0',
        },
      }}
      createOrganizationMode="modal"
      organizationProfileMode="modal"
      afterCreateOrganizationUrl="/dashboard"
      afterLeaveOrganizationUrl="/"
      afterSelectOrganizationUrl="/dashboard"
    />
  )
}
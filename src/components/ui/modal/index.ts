// Modal components
export { Modal, type ModalProps, type ModalType, type ModalSize, type BaseModalProps, type ModalAction } from "./modal"

// Specialized modals
export {
  ConfirmationModal,
  DeleteConfirmationModal,
  SaveChangesModal,
  LogoutConfirmationModal,
  ActionConfirmationModal,
  type ConfirmationModalProps
} from "./confirmation-modal"

export {
  FormModal,
  QuickFormModal,
  useFormModal,
  type FormModalProps,
  type QuickFormModalProps,
  type UseFormModalProps
} from "./form-modal"

export {
  InfoModal,
  SuccessModal,
  ErrorModal,
  WarningModal,
  HelpModal,
  FeatureModal,
  MaintenanceModal,
  type InfoModalProps
} from "./info-modal"

// Focus management utilities
export { FocusTrap, useFocusRestore, useScrollLock } from "./focus-trap"

// Accessibility testing
export { ModalAccessibilityTest } from "./accessibility-test"

// Modal state management
export {
  useModal,
  useModalManager,
  useConfirmationModal,
  useModalStack,
  ModalProvider,
  type UseModalReturn,
  type ModalManagerState,
  type ConfirmationModalOptions
} from "../../../hooks/use-modal"
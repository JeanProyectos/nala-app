/**
 * Coordinación del modal vet→usuario entre videollamada y chat.
 * - Evita dos modales a la vez o por el mismo evento duplicado.
 * - Si el veterinario sale del video sin cerrar el modal, se libera la reserva para el chat.
 */
let showingConsultationId = null;
const dismissedConsultationIds = new Set();

export function canPresentVetOwnerRatingModal(consultationId) {
  if (dismissedConsultationIds.has(consultationId)) return false;
  if (showingConsultationId === consultationId) return false;
  return true;
}

export function registerVetOwnerRatingModalOpen(consultationId) {
  showingConsultationId = consultationId;
}

export function finalizeVetOwnerRatingModal(consultationId) {
  if (showingConsultationId === consultationId) {
    showingConsultationId = null;
  }
  dismissedConsultationIds.add(consultationId);
}

export function abandonVetOwnerRatingModal(consultationId) {
  if (showingConsultationId === consultationId) {
    showingConsultationId = null;
  }
}

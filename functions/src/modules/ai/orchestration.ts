
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// State Definitions
type TaskState = 'IDLE' | 'DRAFT' | 'SEND' | 'WAIT' | 'PARSE' | 'SUCCESS' | 'STALL' | 'NO_RESPONSE';

interface TaskContext {
  taskId: string;
  state: TaskState;
  contactId: string;
  retryCount: number;
  lastActionTime: number;
  history: any[];
}

export const taskCoordinationMachine = functions.firestore
  .document('orgs/{orgId}/projects/{projectId}/tasks/{taskId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    const taskId = context.params.taskId;

    // Only react if AI coordination is enabled and specific fields changed
    if (!newData.aiCoordinationEnabled) return;

    // State Machine Logic
    let nextState: TaskState = newData.aiState || 'IDLE';
    let shouldUpdate = false;

    // Example Transition: IDLE -> DRAFT (Triggered by user or schedule)
    if (nextState === 'IDLE' && newData.triggerAi === true) {
      nextState = 'DRAFT';
      shouldUpdate = true;
      // Trigger AI draft generation (Mock LLM call here)
      await logAudit(context.params.orgId, 'AI_DRAFT_INIT', `Drafting message for task ${taskId}`);
    }

    // Example Transition: DRAFT -> SEND (Auto-send if trusted, else wait user)
    if (nextState === 'DRAFT' && newData.draftReady === true) {
       if (newData.autoSend) {
          nextState = 'SEND';
          shouldUpdate = true;
          // Trigger actual sending logic (WhatsApp/Email)
       }
    }

    if (shouldUpdate) {
      return change.after.ref.update({
        aiState: nextState,
        lastAiUpdate: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return null;
  });

async function logAudit(orgId: string, action: string, details: string) {
  await admin.firestore().collection(`orgs/${orgId}/auditEvents`).add({
    action,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    actor: 'SYSTEM_AI'
  });
}
